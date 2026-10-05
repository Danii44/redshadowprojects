import type { Project, ProjectStatus, Task } from "@/lib/types";
import { normalizeProjectStatus } from "@/lib/utils";

export const isActiveProject = (project: Project) =>
  !["delivered", "closed", "cancelled"].includes(
    normalizeProjectStatus(project.status),
  );
export const isActiveTask = (task: Task) =>
  !["completed", "closed", "cancelled"].includes(
    task.status.toLowerCase().replaceAll(" ", "_"),
  );
export function projectCounts(projects: Project[]) {
  const counts: Record<ProjectStatus, number> = {
    open: 0,
    in_progress: 0,
    in_review: 0,
    revisions: 0,
    delivered: 0,
    on_hold: 0,
    closed: 0,
    cancelled: 0,
  };
  projects.forEach(
    (project) => counts[normalizeProjectStatus(project.status)]++,
  );
  return counts;
}
export function dateLabel(value?: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export function daysLeft(project: Project, now: number) {
  const status = normalizeProjectStatus(project.status);
  if (["delivered", "closed", "cancelled"].includes(status))
    return {
      label: status === "cancelled" ? "Cancelled" : "Completed",
      urgent: false,
      days: null,
    };
  if (project.project_type === "hourly_ongoing")
    return { label: "Ongoing", urgent: false, days: null };
  if (
    !project.deadline ||
    !Number.isFinite(new Date(project.deadline).getTime())
  )
    return { label: "No deadline", urgent: false, days: null };
  const deadline = new Date(project.deadline),
    today = new Date(now);
  const days = Math.round(
    (Date.UTC(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      86400000,
  );
  return {
    label:
      days < 0
        ? `${Math.abs(days)}d overdue`
        : days === 0
          ? "Due today"
          : `${days}d left`,
    urgent: days < 0,
    days,
  };
}
export function projectProgress(project: Project): number | null {
  return typeof project.completion_percentage === "number" &&
    Number.isFinite(project.completion_percentage)
    ? Math.max(0, Math.min(100, project.completion_percentage))
    : null;
}
export function filterProjects(
  projects: Project[],
  query: string,
  status: string,
) {
  return projects.filter(
    (project) =>
      (status === "all" || normalizeProjectStatus(project.status) === status) &&
      `${project.name} ${project.code} ${project.client ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
}
export function attentionProjects(projects: Project[], now: number) {
  return projects
    .filter(
      (project) =>
        isActiveProject(project) &&
        daysLeft(project, now).days !== null &&
        daysLeft(project, now).days! <= 2,
    )
    .sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime(),
    );
}
export function upcomingProjects(projects: Project[], now: number) {
  return projects
    .filter(
      (project) =>
        isActiveProject(project) &&
        daysLeft(project, now).days !== null &&
        daysLeft(project, now).days! >= 0 &&
        daysLeft(project, now).days! <= 7,
    )
    .sort(
      (a, b) =>
        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime(),
    );
}
