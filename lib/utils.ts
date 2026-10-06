import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEGACY_PROJECT_STATUSES,
  PROJECT_STATUSES,
} from "./constants";
import type { ProjectStatus, Role } from "./types";

export async function updateTaskWithFallback(
  supabase: SupabaseClient,
  taskId: string | number,
  payload: Record<string, unknown>,
) {
  const initialUpdate = await supabase
    .from("tasks")
    .update(payload)
    .eq("id", taskId);

  if (!initialUpdate.error || !initialUpdate.error.message.toLowerCase().includes("completion_percentage")) {
    return initialUpdate;
  }

  const fallbackPayload = { ...payload };
  delete fallbackPayload.completion_percentage;

  return await supabase
    .from("tasks")
    .update(fallbackPayload)
    .eq("id", taskId);
}

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
      return "border-blue-border bg-blue-soft text-blue";
    case "in_progress":
      return "border-blue-border bg-blue-soft text-blue";
    case "in_review":
      return "border-amber-border bg-amber-soft text-amber";
    case "revisions":
      return "border-purple-border bg-purple-soft text-purple";
    case "on_hold":
      return "border-orange-border bg-orange-soft text-orange";
    case "delivered":
      return "border-green-border bg-green-soft text-green";
    case "closed":
      return "border-border bg-muted text-foreground";
    default:
      return "border-red-border bg-red-soft text-red";
  }
}

/** Calculate human readable time left or overdue string with urgency colors */
export function calculateTimeLeft(
  deadline?: string | null,
  projectType?: string | null,
): {
  label: string;
  tone: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  urgencyLevel: "overdue" | "today" | "soon" | "normal" | "none";
} {
  if (projectType === "hourly_ongoing") {
    return {
      label: "Hourly / Retainer",
      tone: "text-blue font-bold",
      bgClass: "bg-blue-soft hover:bg-blue-soft",
      borderClass: "border-l-4 border-l-blue",
      badgeClass: "bg-blue-soft text-blue border border-blue-border font-bold",
      urgencyLevel: "none",
    };
  }

  if (!deadline) {
    return {
      label: "No deadline",
      tone: "text-muted-foreground font-medium",
      bgClass: "bg-transparent",
      borderClass: "border-l-4 border-l-transparent",
      badgeClass: "bg-muted text-secondary border border-border font-medium",
      urgencyLevel: "none",
    };
  }

  const diffDays = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return {
      label: `${days}d overdue`,
      tone: "text-amber font-bold",
      bgClass: "bg-amber-soft hover:bg-amber-soft",
      borderClass: "border-l-4 border-l-amber",
      badgeClass: "bg-amber-soft text-amber border border-amber-border font-bold",
      urgencyLevel: "overdue",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      tone: "text-red font-bold",
      bgClass: "bg-red-soft hover:bg-red-soft",
      borderClass: "border-l-4 border-l-red",
      badgeClass: "bg-red-soft text-red border border-red-border font-bold",
      urgencyLevel: "today",
    };
  }

  if (diffDays <= 3) {
    return {
      label: `${diffDays}d left`,
      tone: "text-orange font-bold",
      bgClass: "bg-orange-soft hover:bg-orange-soft",
      borderClass: "border-l-4 border-l-orange",
      badgeClass: "bg-orange-soft text-orange border border-orange-border font-bold",
      urgencyLevel: "soon",
    };
  }

  return {
    label: `${diffDays}d left`,
    tone: "text-secondary font-semibold",
    bgClass: "bg-card hover:bg-subtle",
    borderClass: "border-l-4 border-l-transparent",
    badgeClass: "bg-muted text-foreground border border-border font-semibold",
    urgencyLevel: "normal",
  };
}

/** Get a text color class based on how close a deadline is */
export function deadlineTone(
  value?: string | null,
  projectType?: string | null,
): string {
  if (projectType === "hourly_ongoing") return "text-blue font-semibold";
  if (!value) return "text-muted-foreground";
  const hours = (new Date(value).getTime() - Date.now()) / 3600000;
  if (hours < 0) return "text-red font-semibold";
  if (hours <= 24) return "text-red font-semibold";
  if (hours <= 48) return "text-amber font-semibold";
  return "text-muted-foreground";
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
