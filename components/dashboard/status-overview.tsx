import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { Project } from "@/lib/types";
import { PROJECT_STATUSES } from "@/lib/constants";
import { Panel, EmptyState } from "./panel";
import { projectCounts } from "./data";

const chartColors: Record<string, string> = {
  open: "#739bdd",
  in_progress: "#3298ae",
  in_review: "#d3a243",
  revisions: "#9c83d4",
  delivered: "#52a781",
  closed: "#7ba795",
  on_hold: "#c98453",
  cancelled: "#89919c",
};
export function StatusOverview({ projects }: { projects: Project[] }) {
  const counts = projectCounts(projects);
  const data = PROJECT_STATUSES.map(([key, name]) => ({
    key,
    name,
    value: counts[key],
  }));
  return (
    <Panel title="Project status" subtitle="A snapshot of your studio pipeline">
      {!projects.length ? (
        <EmptyState>No projects to display yet.</EmptyState>
      ) : (
        <div className="studio-status-overview">
          <div
            className="studio-donut"
            role="img"
            aria-label={`${projects.length} projects. ${data.map((item) => `${item.name}: ${item.value}`).join(", ")}`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={data.filter((item) => item.value)}
                  dataKey="value"
                  innerRadius="72%"
                  outerRadius="93%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data
                    .filter((item) => item.value)
                    .map((item) => (
                      <Cell key={item.key} fill={chartColors[item.key]} />
                    ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="studio-donut-center" aria-hidden="true">
              <strong>{projects.length}</strong>
              <span>Projects</span>
            </div>
          </div>
          <ul className="studio-chart-legend">
            {data
              .filter(
                (item) =>
                  !["closed", "cancelled"].includes(item.key) || item.value,
              )
              .map((item) => (
                <li key={item.key}>
                  <span className="flex items-center gap-2">
                    <i style={{ background: chartColors[item.key] }} />
                    {item.name}
                  </span>
                  <strong>{item.value}</strong>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
