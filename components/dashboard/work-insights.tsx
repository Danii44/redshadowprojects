import { ArrowUpRight, Clock } from "lucide-react";
import type { Project, Task } from "@/lib/types";
import { taskStatus } from "@/lib/task-focus";
import { Panel, EmptyState } from "./panel";

export function WorkDistribution({ tasks }: { tasks: Task[] }) {
  const groups = [
    { label: "To do", states: ["open"], tone: "blue" },
    { label: "In progress", states: ["in_progress"], tone: "cyan" },
    { label: "Review & revision", states: ["in_review", "in_revision"], tone: "amber" },
    { label: "Completed", states: ["completed", "closed"], tone: "green" },
    { label: "Cancelled", states: ["cancelled"], tone: "muted" },
  ].map(group => ({ ...group, count: tasks.filter(task => group.states.includes(taskStatus(task))).length }));
  const completed = groups.find(group => group.tone === "green")?.count ?? 0;
  const completion = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  let offset = 0;
  const segments = groups.map(group => {
    const portion = tasks.length ? group.count / tasks.length * 100 : 0;
    const segment = { ...group, portion, offset };
    offset += portion;
    return segment;
  });
  return <Panel title="Work by status" subtitle="Current assignments across this workspace view">
    <div className="dashboard-distribution">
      <div className="dashboard-status-chart">
        <svg viewBox="0 0 120 120" role="img" aria-label={`${completion}% of ${tasks.length} tasks completed`}>
          <circle cx="60" cy="60" r="48" className="dashboard-ring-track"/>
          {segments.filter(group => group.portion > 0).map(group => <circle key={group.label} cx="60" cy="60" r="48" pathLength="100" className={`dashboard-ring-segment dashboard-tone-${group.tone}`} strokeDasharray={`${group.portion} ${100-group.portion}`} strokeDashoffset={-group.offset} transform="rotate(-90 60 60)"/>) }
        </svg>
        <div className="dashboard-ring-label"><strong>{completion}%</strong><span>completed</span></div>
        <p><strong>{tasks.length}</strong> total tasks</p>
      </div>
      <div className="dashboard-distribution-bars">{groups.map(group => <div className={`dashboard-distribution-row dashboard-tone-${group.tone}`} key={group.label}>
        <div><span>{group.label}</span><strong>{group.count}</strong></div><progress value={group.count} max={Math.max(tasks.length,1)} aria-label={`${group.label}: ${group.count} of ${tasks.length} tasks`}/>
      </div>)}</div>
    </div>
    {!tasks.length && <p className="studio-meta px-5 pb-5">Task status will appear as work is assigned.</p>}
  </Panel>;
}

export function RecentUpdates({ tasks, projects, onOpenTask, onSelectProject }: {
  tasks: Task[]; projects: Project[]; onOpenTask?: (task: Task) => void; onSelectProject: (id: string) => void;
}) {
  const updates = [
    ...tasks.filter(task => task.updated_at && Number.isFinite(new Date(task.updated_at).getTime())).map(task => ({ id: `task-${task.id}`, title: task.title, label: "Task updated", date: task.updated_at!, detail: task.state, open: () => onOpenTask?.(task) })),
    ...projects.filter(project => project.updated_at && Number.isFinite(new Date(project.updated_at).getTime())).map(project => ({ id: `project-${project.id}`, title: project.name, label: "Project updated", date: project.updated_at!, detail: project.phase, open: () => onSelectProject(project.id) })),
  ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return <Panel title="Recent updates" subtitle="Latest recorded task and project changes">
    {!updates.length && <EmptyState><Clock size={24}/><strong>No updates recorded</strong><span>Changes will appear here when work is updated.</span></EmptyState>}
    <div className="dashboard-update-list">{updates.slice(0,5).map(item => <button type="button" key={item.id} onClick={item.open} className="dashboard-update-row">
      <span className="dashboard-update-marker"/><div><span className="dashboard-update-type">{item.label}</span><strong>{item.title}</strong><p>{item.detail || "Workspace update"}</p></div>
      <time dateTime={item.date}>{new Date(item.date).toLocaleDateString([], {month:"short",day:"numeric"})}<span>{new Date(item.date).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span></time><ArrowUpRight size={14}/>
    </button>)}</div>
  </Panel>;
}
