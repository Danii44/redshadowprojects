import { Clock, CheckCircle2, ListTodo, AlertCircle } from "lucide-react";
import type { Task } from "@/lib/types";

export function TaskOverview({ tasks, personal, now }: { tasks: Task[]; personal: boolean; now: number }) {
  const active = tasks.filter(t => !["Completed", "Closed", "Cancelled"].includes(t.state));
  const overdue = active.filter(t => t.due_at && new Date(t.due_at).getTime() < now);
  const next = active.filter(t => t.due_at && new Date(t.due_at).getTime() >= now)
    .sort((a,b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime())[0];
  const metrics = [
    { label: "Active tasks", value: active.length, icon: ListTodo, detail: "Current assignments" },
    { label: "Overdue", value: overdue.length, icon: AlertCircle, detail: "Needs your attention" },
    { label: "Awaiting feedback", value: active.filter(t => ["In Review", "In Revision"].includes(t.state)).length, icon: Clock, detail: "Review & revision" },
    { label: "Completed", value: tasks.filter(t => ["Completed", "Closed"].includes(t.state)).length, icon: CheckCircle2, detail: "Finished assignments" },
  ];
  return <section aria-label="Task overview" className="task-overview">
    <div className="task-summary-grid">{metrics.map(({label,value,icon:Icon,detail}) =>
      <div className="studio-panel task-summary" key={label}>
        <div className="studio-metric-top"><span>{label}</span><Icon size={17}/></div>
        <p className="studio-metric-value">{value}</p><p className="studio-meta">{detail}</p>
      </div>)}</div>
    <div className="task-focus-note"><Clock size={16}/><p>
      {overdue.length > 0 ? `${overdue.length} overdue ${overdue.length === 1 ? "task needs" : "tasks need"} attention. ` : "Your deadlines are on track. "}
      {next ? `Next deadline: ${next.title}${next.project ? ` (${next.project})` : ""} · ${new Date(next.due_at!).toLocaleDateString([], {month:"short", day:"numeric"})}.` : active.length ? "No upcoming dated tasks." : personal ? "You’re all caught up." : "No active assignments."}
    </p></div>
  </section>;
}
