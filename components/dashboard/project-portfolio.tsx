import { useState } from "react";
import { ArrowUpRight, CalendarDays, FolderOpen } from "lucide-react";
import type { Project, Task, User } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { taskStatus } from "@/lib/task-focus";
import { daysLeft, isActiveProject, isActiveTask, projectAttentionReasons, projectProgress } from "./data";

export function ProjectPortfolio({ projects, tasks, people, now, onSelect, onViewAll }: {
  projects: Project[]; tasks: Task[]; people: User[]; now: number; onSelect: (id: string) => void; onViewAll: () => void;
}) {
  const [filter, setFilter] = useState<"active" | "attention">("active");
  const active = projects.filter(isActiveProject).map(project => ({ project, reasons: projectAttentionReasons(project, tasks, now) }));
  const visible = active.filter(item => filter === "active" || item.reasons.length).sort((a,b) =>
    b.reasons.length - a.reasons.length || (a.project.deadline ? new Date(a.project.deadline).getTime() : Infinity) - (b.project.deadline ? new Date(b.project.deadline).getTime() : Infinity) || a.project.name.localeCompare(b.project.name));
  return <section className="dashboard-portfolio" aria-label="Project portfolio">
    <div className="dashboard-section-heading"><div><h2>Project portfolio</h2><p>Delivery dates, ownership, and recorded progress.</p></div>
      <button type="button" className="studio-button" onClick={onViewAll}>View all projects <ArrowUpRight size={15}/></button>
    </div>
    <div className="dashboard-portfolio-tabs" role="group" aria-label="Filter dashboard projects">
      <button type="button" aria-pressed={filter === "active"} onClick={() => setFilter("active")}>Active projects <span>{active.length}</span></button>
      <button type="button" aria-pressed={filter === "attention"} onClick={() => setFilter("attention")}>Needs attention <span>{active.filter(item => item.reasons.length).length}</span></button>
      <span className="studio-meta">Showing {Math.min(visible.length, 6)} of {visible.length}</span>
    </div>
    {!visible.length ? <div className="dashboard-portfolio-empty"><FolderOpen size={28}/><h3>{filter === "attention" ? "No project issues flagged" : "No active projects"}</h3><p>{filter === "attention" ? "Switch to Active projects to see current work." : "Open Projects to create or review your project portfolio."}</p><button type="button" className="studio-button" onClick={onViewAll}>Open Projects</button></div> :
      <div className="dashboard-project-grid">{visible.slice(0,6).map(({project, reasons}) => {
        const progress = projectProgress(project);
        const leader = people.find(person => person.id === project.leader_id);
        const projectTasks = tasks.filter(task => task.project_id === project.id && taskStatus(task) !== "cancelled");
        const done = projectTasks.filter(task => !isActiveTask(task) && taskStatus(task) !== "cancelled").length;
        const due = daysLeft(project, now);
        return <button type="button" key={project.id} className="dashboard-project-card" onClick={() => onSelect(project.id)} aria-label={`Open project ${project.name}`}>
          <div className="dashboard-project-top"><span className="dashboard-project-code">{project.code || "Project"}</span><StatusBadge status={project.status}/></div>
          <h3>{project.name}</h3><p className="dashboard-project-client">{project.client || "Client not recorded"}</p>
          <div className="dashboard-project-phase"><span>Current phase</span><strong>{project.phase || "Not set"}</strong></div>
          <div className="dashboard-project-progress"><div><span>Recorded progress</span><strong>{progress === null ? "Not recorded" : `${progress}%`}</strong></div>
            {progress !== null ? <progress value={progress} max={100} aria-label={`${project.name} recorded progress`}/> : <div className="dashboard-progress-unrecorded"/>}
          </div>
          <div className="dashboard-project-owner"><Avatar name={leader?.name || project.leader || "Unassigned"} src={leader?.avatar_url} size="sm"/><div><span>Project lead</span><strong>{leader?.name || project.leader || "Unassigned"}</strong></div><span className="dashboard-task-count">{projectTasks.length ? <>{done}/{projectTasks.length}<small>tasks finished</small></> : <small>No tasks</small>}</span></div>
          <div className="dashboard-project-warning">{reasons.length ? <span>{reasons[0]}{reasons.length > 1 ? ` +${reasons.length - 1} issues` : ""}</span> : <span className="studio-meta">No issues flagged in this view</span>}</div>
          <div className={`dashboard-project-footer ${due.urgent ? "is-overdue" : ""}`}><span><CalendarDays size={14}/>{due.days !== null && project.deadline ? <>{new Date(project.deadline).toLocaleDateString([], {month:"short",day:"numeric"})}<span className="dashboard-deadline-count">{due.label}</span></> : due.label}</span><ArrowUpRight size={16}/></div>
        </button>;
      })}</div>}
  </section>;
}
