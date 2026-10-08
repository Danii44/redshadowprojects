import { ArrowUpRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Project, User } from "@/lib/types";
import { Panel, EmptyState } from "./panel";
import { isActiveProject } from "./data";

export function TeamOverview({
  projects,
  people,
  onViewTeam,
  partial = false,
}: {
  projects: Project[];
  people: User[];
  onViewTeam?: () => void;
  partial?: boolean;
}) {
  const workload = people
    .filter((person) => person.active)
    .map((person) => ({
      person,
      count: projects.filter(
        (project) =>
          isActiveProject(project) &&
          (project.leader_id === person.id ||
            project.project_members?.some(
              (member) => member.user_id === person.id,
            )),
      ).length,
    }))
    .sort(
      (a, b) => b.count - a.count || a.person.name.localeCompare(b.person.name),
    );
  return (
    <Panel
      title="Team overview"
      subtitle={partial ? "Active assignments in your visible projects" : "Active project assignments"}
      action={
        onViewTeam && (
          <button className="studio-link" onClick={onViewTeam}>
            View team <ArrowUpRight size={14} />
          </button>
        )
      }
    >
      {!workload.length && <EmptyState>No team profiles available.</EmptyState>}
      <div className="studio-team-list studio-panel-scroll">
        {workload.map(({ person, count }) => (
          <div className="studio-list-row" key={person.id}>
            <Avatar name={person.name} src={person.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="studio-person-name">{person.name}</p>
              <p className="studio-meta capitalize">
                {person.role.replaceAll("_", " ")}
              </p>
            </div>
            <span className="studio-workload">
              <strong>{count}</strong>
              <span>project{count === 1 ? "" : "s"}</span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
