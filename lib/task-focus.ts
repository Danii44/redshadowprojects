import type { Task } from "@/lib/types";

export type TaskFocus = "active" | "overdue" | "today" | "review" | "blocked" | "unassigned";
export const TASK_FOCUS_LABELS: Record<TaskFocus, string> = {
  active: "All work", overdue: "Overdue tasks", today: "Due today", review: "Awaiting review", blocked: "Blocked tasks", unassigned: "Unassigned tasks",
};
export function taskStatus(task: Task) {
  return (task.status || task.state).toLowerCase().replaceAll(" ", "_");
}
export function isTaskActive(task: Task) {
  return !["completed", "closed", "cancelled"].includes(taskStatus(task));
}
export function matchesTaskFocus(task: Task, focus: TaskFocus, now: number) {
  if (focus === "active") return true;
  if (!isTaskActive(task)) return false;
  if (focus === "review") return taskStatus(task) === "in_review";
  if (focus === "blocked") return Boolean(task.blocked_reason?.trim());
  if (focus === "unassigned") return !task.assignee_id;
  if (!task.due_at) return false;
  const due = new Date(task.due_at);
  if (!Number.isFinite(due.getTime())) return false;
  if (focus === "overdue") return due.getTime() < now;
  const today = new Date(now);
  return due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due.getDate() === today.getDate();
}
