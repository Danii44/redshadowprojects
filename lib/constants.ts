import {
  Bell,
  CalendarCheck,
  Columns3,
  Command,
  FileClock,
  LayoutDashboard,
  ListTodo,
  Settings,
  Users,
} from "lucide-react";
import type { NavItem, ProjectStatus, Role, View } from "./types";

/** Canonical project status values and their display labels */
export const PROJECT_STATUSES: readonly (readonly [ProjectStatus, string])[] = [
  ["open", "Open"],
  ["in_progress", "In Progress"],
  ["in_review", "In Review"],
  ["revisions", "Revisions"],
  ["on_hold", "On Hold"],
  ["delivered", "Delivered"],
  ["closed", "Closed"],
  ["cancelled", "Cancelled"],
] as const;

/** Map old/legacy status strings to canonical values */
export const LEGACY_PROJECT_STATUSES: Record<string, ProjectStatus> = {
  active: "open",
  waiting_client: "in_review",
  revision: "revisions",
  completed: "closed",
  on_hold: "on_hold",
};

/** Sidebar navigation items */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Projects", icon: Command },
  { label: "Daily Work", icon: CalendarCheck },
  { label: "Tasks", icon: ListTodo },
  { label: "Kanban", icon: Columns3 },
  { label: "Revisions", icon: FileClock },
  { label: "Team", icon: Users },
  { label: "Notifications", icon: Bell, group: true },
];

/** Which views are visible to each role */
export const VISIBLE_VIEWS_BY_ROLE: Record<Role, View[]> = {
  Admin: [
    "Dashboard",
    "Projects",
    "Daily Work",
    "Tasks",
    "Kanban",
    "Revisions",
    "Team",
    "Notifications",
  ],
  "Project Leader": [
    "Dashboard",
    "Projects",
    "Daily Work",
    "Tasks",
    "Kanban",
    "Revisions",
    "Team",
    "Notifications",
  ],
  "Team Member": ["Dashboard", "Daily Work", "Tasks", "Notifications"],
};

/** Pill/badge color classes keyed by color name */
export const PILL_TONES: Record<string, string> = {
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
};

// Aliases for compatibility
export const nav = NAV_ITEMS;
export const visibleViewsByRole = VISIBLE_VIEWS_BY_ROLE;
export const tone = PILL_TONES;

/** Task status column ordering for list and kanban views */
export const TASK_STATUS_COLUMNS = [
  "Open",
  "In Progress",
  "In Review",
  "In Revision",
  "Closed",
  "Cancelled",
  "Completed",
];

/** Kanban board column definitions */
export const KANBAN_COLUMNS = [
  { label: "Backlog", states: ["Open"] },
  { label: "In progress", states: ["In Progress"] },
  { label: "Review", states: ["In Review", "In Revision"] },
  { label: "Done", states: ["Closed", "Completed"] },
  { label: "Cancelled", states: ["Cancelled"] },
];
