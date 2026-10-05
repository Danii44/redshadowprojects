import "./daily-task-queue.css";
import { useState, type ReactNode } from "react";
import { Search, CalendarCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Task, User } from "@/lib/types";

export function DailyTaskQueue({ tasks, people, personal, renderActions, onOpenTask }: {
  tasks: Task[];
  people: User[];
  personal: boolean;
  renderActions: (task: Task) => ReactNode;
  onOpenTask: (task: Task) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const filtered = tasks.filter(task => {
    const match = `${task.title} ${task.project || ""} ${task.owner || ""}`.toLowerCase().includes(query.trim().toLowerCase());
    return match && (status === "all" || task.state === status);
  }).sort((a,b) => (a.due_at ? new Date(a.due_at).getTime() : Infinity) - (b.due_at ? new Date(b.due_at).getTime() : Infinity));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  return <section className="studio-panel daily-task-queue" aria-label="Active assigned tasks">
    <div className="daily-queue-heading">
      <div><h2>{personal ? "Your Daily Work Today" : "Active Assigned Tasks"}</h2>
        <p className="studio-meta">{tasks.length} active assignments · Earliest deadlines first</p></div>
      <div className="daily-queue-controls">
        <label className="daily-queue-search"><Search size={16} aria-hidden="true"/>
          <input aria-label="Search active assignments" placeholder="Search tasks, projects or people…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/>
        </label>
        <select aria-label="Filter active assignment status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="all">All statuses</option>
          {[...new Set(tasks.map(task => task.state))].map(state => <option key={state}>{state}</option>)}
        </select>
      </div>
    </div>
    <div className="daily-queue-columns" aria-hidden="true"><span>Task / Project</span><span>Assigned</span><span>Status</span><span>Deadline</span><span>Progress</span><span>Actions</span></div>
    <ul className="daily-queue-list">
      {rows.map(task => {
        const person = people.find(person => person.id === task.assignee_id || person.name === task.owner);
        const date = task.due_at ? new Date(task.due_at) : null;
        const overdue = !!date && date.getTime() < now;
        const recorded = typeof task.completion_percentage === "number" && Number.isFinite(task.completion_percentage);
        const percent = recorded ? Math.max(0, Math.min(100, task.completion_percentage!)) : null;
        return <li className="daily-queue-row" key={task.id}>
          <div className="daily-queue-task"><h3><button type="button" className="daily-queue-open-title" onClick={() => onOpenTask(task)} aria-label={`Open ${task.title} in ${task.project || "General work"}`}>{task.title}</button></h3><p>{task.project || "General work"}</p>
            {["critical", "high"].includes(task.priority || "") && <span className="daily-queue-priority">{task.priority} priority</span>}</div>
          <div className="daily-queue-person"><Avatar name={person?.name || task.owner || "Unassigned"} src={person?.avatar_url} size="sm"/><span>{person?.name || task.owner || "Unassigned"}</span></div>
          <div className="daily-queue-status"><StatusBadge status={task.state} task/></div>
          <div className="daily-queue-deadline" data-overdue={overdue}><span>{date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString([], {month:"short", day:"numeric"}) : "No deadline"}</span>
            {overdue && <small>Overdue</small>}</div>
          <div className="daily-queue-progress">{percent !== null ? <><span>{percent}%</span><progress aria-label={`${task.title} completion`} value={percent} max={100}/></> : <span className="studio-meta">Not recorded</span>}</div>
          <div className="daily-queue-actions"><button type="button" className="studio-button" onClick={() => onOpenTask(task)} aria-label={`View options for ${task.title} in ${task.project || "General work"}`}>View task</button>{renderActions(task)}</div>
        </li>;
      })}
    </ul>
    {!rows.length && <div className="daily-queue-empty"><CalendarCheck size={24}/><h3>{tasks.length ? "No matching assignments" : "No active assignments"}</h3><p>{tasks.length ? "Try another search or status." : personal ? "Your next assignment will appear here. You can also add your own work above." : "Assign a task to start the work queue."}</p>
      {tasks.length > 0 && <button className="studio-button" onClick={() => { setQuery(""); setStatus("all"); setPage(1); }}>Reset filters</button>}</div>}
    {filtered.length > 0 && <nav className="daily-queue-pagination" aria-label="Active assignment pagination">
      <span className="studio-meta">Showing {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, filtered.length)} of {filtered.length}</span>
      <div><button className="studio-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span className="studio-meta">{currentPage} / {pages}</span><button className="studio-button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div>
    </nav>}
  </section>;
}
