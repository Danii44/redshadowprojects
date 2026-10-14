import type { Project, Role, Task, Team, TeamMember, User } from "@/lib/types";

/** Resolve departments from current staff assignments; retain legacy departments only for unassigned projects. */
export function projectDepartmentIds(project: Project, teams: Team[], memberships: TeamMember[], tasks: Task[] = []) {
  const userIds = new Set([
    project.leader_id,
    ...(project.project_members ?? []).map(member => member.user_id),
    ...(project.members ?? []).map(member => member.user_id),
    ...tasks.filter(task => task.project_id === project.id).map(task => task.assignee_id),
  ].filter((id): id is string => Boolean(id)));
  const ids = new Set(memberships.filter(member => userIds.has(member.user_id)).map(member => member.team_id));
  for (const team of teams) if (team.leader_id && userIds.has(team.leader_id)) ids.add(team.id);
  if (!ids.size && project.team_id) ids.add(project.team_id);
  return ids;
}

/** Assigned tasks follow their assignee; unassigned tasks inherit their project's departments. */
export function scopeWorkspaceToTeam(
  team: Team | undefined,
  memberships: TeamMember[],
  tasks: Task[],
  projects: Project[],
  people: User[],
) {
  if (!team) return { tasks, projects, people, teamPeople: people };
  const memberIds = new Set(memberships.filter(item => item.team_id === team.id).map(item => item.user_id));
  if (team.leader_id) memberIds.add(team.leader_id);
  const teamProjects = projects.filter(project => projectDepartmentIds(project, [team], memberships, tasks).has(team.id));
  const projectIds = new Set(teamProjects.map(project => project.id));
  const teamTasks = tasks.filter(task => task.assignee_id
    ? memberIds.has(task.assignee_id)
    : Boolean(task.project_id && projectIds.has(task.project_id)));
  const relatedIds = new Set(memberIds);
  for (const project of teamProjects) {
    if (project.leader_id) relatedIds.add(project.leader_id);
    for (const member of project.project_members ?? []) relatedIds.add(member.user_id);
  }
  return {
    tasks: teamTasks,
    projects: teamProjects,
    people: people.filter(person => relatedIds.has(person.id)),
    teamPeople: people.filter(person => memberIds.has(person.id)),
  };
}

/** Department access is personal membership or leadership, never a display-name match. */
export function accessibleTeamDirectory(role: Role, profileId: string, teams: Team[], memberships: TeamMember[]) {
  const ownTeamIds = new Set(memberships.filter(item => item.user_id === profileId).map(item => item.team_id));
  const visibleTeams = role === "Admin" ? teams : teams.filter(team => team.leader_id === profileId || ownTeamIds.has(team.id));
  const visibleIds = new Set(visibleTeams.map(team => team.id));
  const visibleMemberships = memberships.filter(item => visibleIds.has(item.team_id));
  const personIds = new Set([profileId, ...visibleMemberships.map(item => item.user_id), ...visibleTeams.map(team => team.leader_id).filter((id): id is string => Boolean(id))]);
  return { teams: visibleTeams, memberships: visibleMemberships, personIds };
}
