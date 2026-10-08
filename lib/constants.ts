import {
  Bell,
  CalendarCheck,
  Command,
  FileClock,
  LayoutDashboard,
  ListTodo,
  Settings,
  Users,
  CalendarDays,
  BarChart3,
  UserRoundCheck,
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
  { label: "Tasks", icon: ListTodo },
  { label: "My Tasks", icon: UserRoundCheck },
  { label: "Daily Work", icon: CalendarCheck },
  { label: "Revisions", icon: FileClock },
  { label: "Team", icon: Users, group: true },
  { label: "Calendar", icon: CalendarDays },
  { label: "Notifications", icon: Bell },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

/** Which views are visible to each role */
export const VISIBLE_VIEWS_BY_ROLE: Record<Role, View[]> = {
  Admin: [
    "My Tasks", "Calendar", "Reports",
    "Dashboard",
    "Projects",
    "Tasks",
    "Daily Work",
    "Revisions",
    "Team",
    "Notifications",
    "Settings",
  ],
  "Project Leader": [
    "My Tasks", "Calendar", "Reports",
    "Dashboard",
    "Projects",
    "Tasks",
    "Daily Work",
    "Revisions",
    "Team",
    "Notifications",
    "Settings",
  ],
  "Team Member": [
    "My Tasks", "Calendar", "Reports",
    "Dashboard",
    "Projects",
    "Tasks",
    "Daily Work",
    "Notifications",
  ],
};

/** Pill/badge color classes keyed by color name */
export const PILL_TONES: Record<string, string> = {
  red: "bg-red-soft text-red ring-red-border",
  amber: "bg-amber-soft text-amber ring-amber-border",
  blue: "bg-blue-soft text-blue ring-blue-border",
  green: "bg-green-soft text-green ring-green-border",
  slate: "bg-muted text-secondary-foreground ring-border",
  purple: "bg-purple-soft text-purple ring-purple-border",
  orange: "bg-orange-soft text-orange ring-orange-border",
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
