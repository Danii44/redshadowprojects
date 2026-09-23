import {
  LEGACY_PROJECT_STATUSES,
  PROJECT_STATUSES,
} from "./constants";
import type { ProjectStatus, Role } from "./types";

/** Normalize any status string (including legacy values) to a canonical ProjectStatus */
export function normalizeProjectStatus(
  status?: string | null,
): ProjectStatus {
  if (!status) return "open";
  const normalized = LEGACY_PROJECT_STATUSES[status] ?? status;
  return PROJECT_STATUSES.some(([value]) => value === normalized)
    ? (normalized as ProjectStatus)
    : "open";
}

/** Get the human-readable label for a project status */
export function projectStatusLabel(status?: string | null): string {
  const normalized = normalizeProjectStatus(status);
  return (
    PROJECT_STATUSES.find(([value]) => value === normalized)?.[1] ?? "Open"
  );
}

/** Get a color key (for Pill) for a project status */
export function projectStatusColor(status?: string | null): string {
  const normalized = normalizeProjectStatus(status);
  if (normalized === "revisions") return "purple";
  if (normalized === "on_hold") return "orange";
  if (["delivered", "closed"].includes(normalized)) return "green";
  if (normalized === "cancelled") return "red";
  return "blue";
}

/** Get Tailwind highlight classes for a project status */
export function projectStatusHighlight(status?: string | null): string {
  const normalized = normalizeProjectStatus(status);
  switch (normalized) {
    case "open":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "in_review":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "revisions":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "on_hold":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "delivered":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "closed":
      return "border-slate-300 bg-slate-100 text-slate-800";
    default:
      return "border-red-200 bg-red-50 text-red-800";
  }
}

/** Calculate human readable time left or overdue string */
export function calculateTimeLeft(deadline?: string | null): {
  label: string;
  tone: string;
} {
  if (!deadline) return { label: "No deadline", tone: "text-slate-400" };
  const diffDays = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, tone: "text-red-600 font-bold" };
  }
  if (diffDays === 0) {
    return { label: "Due today", tone: "text-amber-600 font-bold" };
  }
  if (diffDays <= 3) {
    return { label: `${diffDays}d left`, tone: "text-amber-600 font-bold" };
  }
  return { label: `${diffDays}d left`, tone: "text-slate-500 font-medium" };
}

/** Get a text color class based on how close a deadline is */
export function deadlineTone(value?: string | null): string {
  if (!value) return "text-slate-500";
  const hours = (new Date(value).getTime() - Date.now()) / 3600000;
  if (hours < 0) return "text-red-600";
  if (hours <= 24) return "text-red-600";
  if (hours <= 48) return "text-amber-600";
  return "text-slate-500";
}

/** Parse any role value into the canonical Role type */
export function getAppRole(value: unknown): Role {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
  if (normalized === "admin") return "Admin";
  if (normalized === "project_leader" || normalized === "leader")
    return "Project Leader";
  return "Team Member";
}

/** Whether the given role can edit projects and tasks */
export function canEdit(role: Role): boolean {
  return role === "Admin" || role === "Project Leader";
}

/** Whether the given role can change task status */
export function canChangeStatus(role: Role): boolean {
  return role === "Admin" || role === "Project Leader" || role === "Team Member";
}

/** Derive initials from a full name (e.g. "Danish R." → "DR") */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
