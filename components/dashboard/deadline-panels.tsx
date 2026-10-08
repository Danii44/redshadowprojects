import { ArrowUpRight, AlertCircle, CalendarDays } from "lucide-react";
import type { Project, Task, User } from "@/lib/types";
import { AvatarGroup } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel, EmptyState } from "./panel";
import { isTaskActive } from "@/lib/task-focus";
import { attentionProjects, daysLeft, upcomingProjects } from "./data";

export function AttentionList({
  projects,
  people,
  now,
  onSelect,
}: {
  projects: Project[];
  people: User[];
  now: number;
  onSelect: (id: string) => void;
}) {
  const urgent = attentionProjects(projects, now);
  return (
    <Panel
      title="Needs attention"
      subtitle="Overdue & due in next 2 days"
      action={<span className="studio-count">{urgent.length}</span>}
    >
      <div className="studio-panel-scroll">
        {!urgent.length && (
          <EmptyState>
            <AlertCircle size={24} />
            <strong>No urgent deadlines</strong>
            <span>Your upcoming work is on track.</span>
          </EmptyState>
        )}
        {urgent.map((project) => {
          const due = daysLeft(project, now);
          return (
            <button
              key={project.id}
              onClick={() => onSelect(project.id)}
              className="studio-list-row studio-deadline-row w-full text-left"
            >
              <span
                className={`studio-urgency-dot ${due.urgent ? "studio-urgency-dot--late" : ""}`}
              />
              <div className="min-w-0 flex-1">
                <p className="studio-row-title">{project.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge status={project.status} />
                  <span
                    className={`studio-deadline-label ${due.urgent ? "is-overdue" : ""}`}
                  >
                    {due.label}
                  </span>
                </div>
              </div>
              <AvatarGroup project={project} people={people} limit={2} />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

export function DeadlineList({ projects, tasks = [], now, onSelect, onCalendar, onOpenTask }: {
  projects: Project[]; tasks?: Task[]; people: User[]; now: number;
  onSelect: (id: string) => void; onCalendar: () => void; onOpenTask?: (task: Task) => void;
}) {
  const upcoming = [
    ...upcomingProjects(projects, now).map(project => ({ id: `project-${project.id}`, title: project.name, owner: project.leader || "No project leader", kind: "Project delivery", date: project.deadline!, open: () => onSelect(project.id) })),
    ...tasks.filter(task => isTaskActive(task) && task.due_at && new Date(task.due_at).getTime() >= now && new Date(task.due_at).getTime() <= now + 7 * 86400000)
      .map(task => ({ id: `task-${task.id}`, title: task.title, owner: task.owner || "Unassigned", kind: "Task deadline", date: task.due_at!, open: () => onOpenTask ? onOpenTask(task) : onCalendar() })),
  ].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.title.localeCompare(b.title));
  return <Panel title="Upcoming deadlines" subtitle="Tasks and project deliveries in the next 7 days"
    action={<button className="studio-link" onClick={onCalendar}>Calendar <ArrowUpRight size={14}/></button>}>
    {!upcoming.length && <EmptyState><CalendarDays size={24}/><strong>A clear week ahead</strong><span>No upcoming task or project deadlines in the next 7 days.</span></EmptyState>}
    {upcoming.slice(0,6).map(item => {
      const date = new Date(item.date);
      return <button key={item.id} type="button" className="studio-list-row studio-deadline-row w-full text-left" onClick={item.open}>
        <span className="studio-date-block"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString([], {month:"short"})}</span></span>
        <div className="min-w-0 flex-1"><p className="studio-row-title">{item.title}</p><p className="studio-meta">{item.kind} / {item.owner}</p></div>
      </button>;
    })}
    {upcoming.length > 6 && <p className="studio-meta px-5 py-3">Showing the next 6 deadlines. Open Calendar for all scheduled work.</p>}
  </Panel>;
}
