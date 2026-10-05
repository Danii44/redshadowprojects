import { Download } from "lucide-react";
import type { Project, Task, User } from "@/lib/types";
import { StatusOverview } from "@/components/dashboard/status-overview";
import { TeamOverview } from "@/components/dashboard/team-overview";
import {
  isActiveProject,
  isActiveTask,
  projectCounts,
} from "@/components/dashboard/data";
import { PROJECT_STATUSES } from "@/lib/constants";

export function ReportsView({
  projects,
  tasks,
  people,
  onTeam,
}: {
  projects: Project[];
  tasks: Task[];
  people: User[];
  onTeam?: () => void;
}) {
  const counts = projectCounts(projects);
  return (
    <div className="studio-dashboard">
      <header className="studio-page-heading">
        <div>
          <p className="studio-eyebrow">Studio insights</p>
          <h1>Reports</h1>
          <p>
            Current workload and delivery status from your accessible projects.
          </p>
        </div>
        <button
          className="studio-button"
          onClick={() => {
            const csv =
              "Status,Projects\r\n" +
              PROJECT_STATUSES.map(
                ([key, label]) => `${label},${counts[key]}`,
              ).join("\r\n");
            const url = URL.createObjectURL(
              new Blob([csv], { type: "text/csv" }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "studio-status-report.csv";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={16} />
          Export summary
        </button>
      </header>
      <div className="studio-report-metrics">
        {[
          {
            label: "Active projects",
            value: projects.filter(isActiveProject).length,
          },
          { label: "Active tasks", value: tasks.filter(isActiveTask).length },
          {
            label: "Delivered / closed",
            value: counts.delivered + counts.closed,
          },
          { label: "Recorded team members", value: people.length },
        ].map((item) => (
          <div className="studio-panel p-5" key={item.label}>
            <p className="studio-meta">{item.label}</p>
            <p className="studio-metric-value mt-2">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="studio-deadlines">
        <StatusOverview projects={projects} />
        <TeamOverview projects={projects} people={people} onViewTeam={onTeam} />
      </div>
    </div>
  );
}
