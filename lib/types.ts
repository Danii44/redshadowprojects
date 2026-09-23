/** Application role assigned to each user */
export type Role = "Admin" | "Project Leader" | "Team Member";

/** Sidebar/main view identifiers */
export type View =
  | "Dashboard"
  | "Projects"
  | "Tasks"
  | "Daily Work"
  | "Revisions"
  | "Team"
  | "Notifications"
  | "Settings";

/** Canonical project status values stored in the database */
export type ProjectStatus =
  | "open"
  | "in_progress"
  | "in_review"
  | "revisions"
  | "on_hold"
  | "delivered"
  | "closed"
  | "cancelled";

/** A user profile from the `users` table */
export interface User {
  id: string;
  auth_user_id?: string | null;
  email: string | null;
  name: string;
  role: string;
  avatar_url?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** A project phase (sub-record of a project) */
export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  position: number;
  state: string;
  started_at?: string | null;
  completed_at?: string | null;
}

/** A project member (sub-record of a project) */
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  project_role?: string | null;
}

/** A revision record */
export interface Revision {
  id: string;
  project_id: string;
  phase_id: string;
  number: number;
  notes?: string | null;
  state: string;
  submitted_by?: string | null;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_outcome?: string | null;
}

/** Raw project row from Supabase (with nested relations) */
export interface ProjectRow {
  id: string;
  code: string;
  name: string;
  client?: string | null;
  type?: string | null;
  description?: string | null;
  requirements?: string | null;
  internal_notes?: string | null;
  status: string;
  priority: string;
  leader_id?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  completion_percentage?: number;
  last_activity_at?: string | null;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
  project_phases?: ProjectPhase[];
  project_members?: ProjectMember[];
  revisions?: Revision[];
}

export interface ProjectMemberDetail {
  id?: string;
  user_id: string;
  name: string;
  role?: string;
}

/** Enriched project used in the UI */
export interface Project extends ProjectRow {
  phase: string;
  revision: string;
  leader: string;
  team: string[];
  members?: ProjectMemberDetail[];
  due: string;
  startDateFormatted?: string;
  timeLeftLabel?: string;
  timeLeftColor?: string;
  deadlineTone?: string;
  color: string;
  note: string;
}

/** Raw task row from Supabase */
export interface TaskRow {
  id: string;
  project_id: string;
  phase_id?: string | null;
  title: string;
  description?: string | null;
  assignee_id?: string | null;
  created_by: string;
  reviewer_id?: string | null;
  status: string;
  priority: string;
  completion_percentage?: number;
  due_at?: string | null;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Enriched task used in the UI */
export interface Task extends TaskRow {
  project: string;
  owner: string;
  initials: string;
  state: string;
  due: string;
  dueTone?: string;
  checklist: string;
}

/** A notification from the `notifications` table */
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  severity: string;
  title: string;
  body?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
}

/** A team record */
export interface Team {
  id: string;
  name: string;
  leader_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** A team membership record */
export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  created_at?: string;
}

/** Workload entry for the dashboard team pulse */
export interface WorkloadMember {
  name: string;
  initials: string;
  count: number;
  blocked: boolean;
}

/** Attention item for the dashboard */
export interface AttentionItem {
  level: "Critical" | "Warning" | "Information";
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  detail: string;
  action: string;
}

/** Nav item for the sidebar */
export interface NavItem {
  label: View;
  icon: React.ComponentType<{ size?: number }>;
  group?: boolean;
}
