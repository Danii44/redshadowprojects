import type { Project, Role, Task, Team, TeamMember, User } from "@/lib/types";

/** Filter authorized workspace data by assignee membership, including the team leader. */
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
  const teamTasks = tasks.filter(task => Boolean(task.assignee_id && memberIds.has(task.assignee_id)));
  const taskProjectIds = new Set(teamTasks.map(task => task.project_id).filter(Boolean));
  const teamProjects = projects.filter(project =>
    taskProjectIds.has(project.id) ||
    Boolean(project.leader_id && memberIds.has(project.leader_id)) ||
    project.project_members?.some(member => memberIds.has(member.user_id)),
  );
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
