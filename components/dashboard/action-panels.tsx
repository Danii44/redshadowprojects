import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { Project, Task, User } from "@/lib/types";
import { matchesTaskFocus, type TaskFocus } from "@/lib/task-focus";
import { isActiveTask, projectAttentionReasons, projectProgress } from "./data";
import { Panel, EmptyState } from "./panel";

export function WorkAttention({ tasks, now, member, onOpenTask, onTaskQueue }: {
  tasks: Task[]; now: number; member: boolean; onOpenTask?: (task: Task) => void; onTaskQueue: (focus: TaskFocus) => void;
}) {
  const attention = tasks.filter(isActiveTask).map(task => {
    const reasons: string[] = [];
    if (matchesTaskFocus(task, "blocked", now)) reasons.push(`Blocked: ${task.blocked_reason}`);
    if (matchesTaskFocus(task, "overdue", now)) reasons.push("Deadline overdue");
    if (!member && matchesTaskFocus(task, "unassigned", now)) reasons.push("No assignee");
    return { task, reasons, score: (task.blocked_reason?.trim() ? 4 : 0) + (matchesTaskFocus(task, "overdue", now) ? 2 : 0) + (!task.assignee_id ? 1 : 0) };
  }).filter(item => item.reasons.length).sort((a,b) => b.score - a.score || (a.task.due_at ? new Date(a.task.due_at).getTime() : Infinity) - (b.task.due_at ? new Date(b.task.due_at).getTime() : Infinity) || a.task.title.localeCompare(b.task.title));
  return <Panel title="Needs attention" subtitle={`${attention.length} ${attention.length === 1 ? "task" : "tasks"} requiring action`}>
    <div className="flex flex-wrap gap-2 px-5 pb-3">
      <button className="studio-button" onClick={() => onTaskQueue("overdue")}>Overdue</button>
      <button className="studio-button" onClick={() => onTaskQueue("blocked")}>Blocked</button>
      {!member && <button className="studio-button" onClick={() => onTaskQueue("unassigned")}>Unassigned</button>}
    </div>
    {!attention.length && <EmptyState><CheckCircle2 size={24}/><strong>No issues requiring action</strong><span>No overdue{member ? " or blocked" : ", blocked, or unassigned"} tasks in this view.</span></EmptyState>}
    {attention.slice(0,6).map(({task, reasons}) => <button key={task.id} type="button" className="studio-list-row w-full text-left" onClick={() => onOpenTask ? onOpenTask(task) : onTaskQueue(!task.assignee_id ? "unassigned" : task.blocked_reason?.trim() ? "blocked" : "overdue")}>
      <div className="min-w-0 flex-1"><p className="studio-row-title">{task.title}</p><p className="studio-meta">{task.owner || "Unassigned"} / {task.project || "General work"}</p><p className="mt-1 text-xs text-amber">{reasons.join(" / ")}</p></div>
      <span className="studio-link shrink-0">{!task.assignee_id && !member ? "Assign" : "Open"}<ArrowUpRight size={14}/></span>
    </button>)}
    {attention.length > 6 && <p className="px-5 py-3 studio-meta">Showing 6 of {attention.length}. Use the work queues above to see more.</p>}
  </Panel>;
}

export function ProjectHealth({ projects, tasks, people, now, onSelect, onViewAll }: {
  projects: Project[]; tasks: Task[]; people: User[]; now: number; onSelect: (id: string) => void; onViewAll: () => void;
}) {
  const attention = projects.map(project => ({ project, reasons: projectAttentionReasons(project, tasks, now) })).filter(item => item.reasons.length)
    .sort((a,b) => b.reasons.length - a.reasons.length || (a.project.deadline ? new Date(a.project.deadline).getTime() : Infinity) - (b.project.deadline ? new Date(b.project.deadline).getTime() : Infinity) || a.project.name.localeCompare(b.project.name));
  return <Panel title="Projects needing attention" subtitle={`${attention.length} active ${attention.length === 1 ? "project" : "projects"} with delivery or ownership issues`}
    action={<button className="studio-link" onClick={onViewAll}>View all projects <ArrowUpRight size={14}/></button>}>
    {!attention.length && <EmptyState><CheckCircle2 size={24}/><strong>No project issues flagged</strong><span>No delivery, blocker, overdue task, or ownership issues in this view.</span></EmptyState>}
    {attention.slice(0,5).map(({project, reasons}) => {
      const progress = projectProgress(project);
      return <button type="button" className="studio-list-row w-full text-left" key={project.id} onClick={() => onSelect(project.id)}>
        <div className="min-w-0 flex-1"><p className="studio-row-title">{project.name}</p><p className="studio-meta">{people.find(person => person.id === project.leader_id)?.name || project.leader || "No project leader"} / {project.deadline ? new Date(project.deadline).toLocaleDateString([], {month:"short",day:"numeric"}) : "No deadline"}</p><p className="mt-1 text-xs text-amber">{reasons.join(" / ")}</p></div>
        <span className="studio-meta shrink-0">{progress === null ? "Progress not recorded" : `${progress}% recorded`}</span>
      </button>;
    })}
  </Panel>;
}
