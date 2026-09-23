-- ============================================================
-- RED SHADOW DESIGNS
-- CLEAN DATABASE SCHEMA
--
-- NO USERS
-- NO PROJECTS
-- NO SAMPLE DATA
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'project_leader',
    'team_member'
);

CREATE TYPE public.alert_level AS ENUM (
    'critical',
    'warning',
    'information'
);


-- ============================================================
-- USERS
-- Application profile linked to Supabase Authentication
-- ============================================================

CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    auth_user_id uuid UNIQUE
        REFERENCES auth.users(id)
        ON DELETE SET NULL,

    email text UNIQUE,
    name text NOT NULL,

    role public.app_role NOT NULL DEFAULT 'team_member',

    avatar_url text,

    active boolean NOT NULL DEFAULT true,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE public.teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    name text UNIQUE NOT NULL,

    leader_id uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE public.team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    team_id uuid NOT NULL
        REFERENCES public.teams(id)
        ON DELETE CASCADE,

    user_id uuid NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    created_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(team_id, user_id)
);


-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    code text UNIQUE NOT NULL,
    name text NOT NULL,

    client text,

    description text,
    requirements text,
    internal_notes text,

    -- open / in_progress / in_review / revisions /
    -- delivered / closed / cancelled
    status text NOT NULL DEFAULT 'open',

    -- none / low / normal / high / critical
    priority text NOT NULL DEFAULT 'normal',

    -- NULL means unassigned
    leader_id uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    start_date date,
    deadline date,

    completion_percentage integer NOT NULL DEFAULT 0
        CHECK (
            completion_percentage >= 0
            AND completion_percentage <= 100
        ),

    last_activity_at timestamptz DEFAULT now(),

    archived_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- PROJECT MEMBERS
-- Multiple people can work on one project
-- ============================================================

CREATE TABLE public.project_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id uuid NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    user_id uuid NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    project_role text,

    created_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(project_id, user_id)
);


-- ============================================================
-- PROJECT PHASES
-- ============================================================

CREATE TABLE public.project_phases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id uuid NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    name text NOT NULL,

    position integer NOT NULL,

    -- upcoming / active / review / revision / completed
    state text NOT NULL DEFAULT 'upcoming',

    started_at timestamptz,
    completed_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(project_id, position)
);


-- ============================================================
-- PHASE HISTORY
-- Keeps history when project moves between phases
-- ============================================================

CREATE TABLE public.project_phase_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id uuid NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    from_phase_id uuid
        REFERENCES public.project_phases(id)
        ON DELETE SET NULL,

    to_phase_id uuid NOT NULL
        REFERENCES public.project_phases(id)
        ON DELETE CASCADE,

    requested_by uuid NOT NULL
        REFERENCES public.users(id),

    approved_by uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    state text NOT NULL DEFAULT 'requested',

    note text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id uuid NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    phase_id uuid
        REFERENCES public.project_phases(id)
        ON DELETE SET NULL,

    title text NOT NULL,
    description text,

    assignee_id uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    created_by uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    reviewer_id uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    -- open / in_progress / in_review /
    -- in_revision / completed / cancelled
    status text NOT NULL DEFAULT 'open',

    priority text NOT NULL DEFAULT 'normal',

    start_date date,
    due_date date,

    completion_percentage integer NOT NULL DEFAULT 0
        CHECK (
            completion_percentage >= 0
            AND completion_percentage <= 100
        ),

    blocked_reason text,
    blocked_at timestamptz,

    submitted_at timestamptz,
    reviewed_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- TASK CHECKLIST
-- ============================================================

CREATE TABLE public.task_checklists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id uuid NOT NULL
        REFERENCES public.tasks(id)
        ON DELETE CASCADE,

    label text NOT NULL,

    position integer NOT NULL,

    completed boolean NOT NULL DEFAULT false,

    completed_by uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    completed_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(task_id, position)
);


-- ============================================================
-- TASK COMMENTS
-- ============================================================

CREATE TABLE public.task_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    task_id uuid NOT NULL
        REFERENCES public.tasks(id)
        ON DELETE CASCADE,

    author_id uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    body text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- REVISIONS
-- ============================================================

CREATE TABLE public.revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id uuid NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    phase_id uuid
        REFERENCES public.project_phases(id)
        ON DELETE SET NULL,

    number integer NOT NULL,

    notes text,

    state text NOT NULL DEFAULT 'open',

    submitted_by uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    submitted_at timestamptz,

    reviewed_by uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    reviewed_at timestamptz,

    review_outcome text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(project_id, number)
);


-- ============================================================
-- REVISION COMMENTS
-- ============================================================

CREATE TABLE public.revision_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    revision_id uuid NOT NULL
        REFERENCES public.revisions(id)
        ON DELETE CASCADE,

    author_id uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    body text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- DAILY UPDATES
-- ============================================================

CREATE TABLE public.daily_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    project_id uuid
        REFERENCES public.projects(id)
        ON DELETE SET NULL,

    summary text NOT NULL,

    blockers text,
    next_steps text,

    update_date date NOT NULL DEFAULT current_date,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL
        REFERENCES public.users(id)
        ON DELETE CASCADE,

    type text NOT NULL,

    severity public.alert_level NOT NULL
        DEFAULT 'information',

    title text NOT NULL,
    body text,

    entity_type text,
    entity_id uuid,

    read_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_id uuid
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    project_id uuid
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    action text NOT NULL,

    entity_type text NOT NULL,
    entity_id uuid,

    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

    created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_projects_leader_status
ON public.projects(leader_id, status);

CREATE INDEX idx_projects_status
ON public.projects(status);

CREATE INDEX idx_projects_start_date
ON public.projects(start_date);

CREATE INDEX idx_projects_deadline
ON public.projects(deadline);

CREATE INDEX idx_project_members_user
ON public.project_members(user_id);

CREATE INDEX idx_project_members_project
ON public.project_members(project_id);

CREATE INDEX idx_tasks_project
ON public.tasks(project_id);

CREATE INDEX idx_tasks_assignee_status
ON public.tasks(assignee_id, status);

CREATE INDEX idx_tasks_due_date
ON public.tasks(due_date);

CREATE INDEX idx_notifications_user_unread
ON public.notifications(user_id, read_at);

CREATE INDEX idx_activity_project_created
ON public.activity_logs(project_id, created_at DESC);


-- ============================================================
-- AUTH USER -> PUBLIC PROFILE
--
-- IMPORTANT:
-- This does NOT create any user now.
-- It only runs later when a Supabase Auth user is created.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    INSERT INTO public.users (
        auth_user_id,
        email,
        name,
        role,
        active
    )
    VALUES (
        NEW.id,
        NEW.email,

        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),

        'team_member',
        true
    )

    ON CONFLICT (email)
    DO UPDATE SET

        auth_user_id = EXCLUDED.auth_user_id,

        name = COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            public.users.name
        ),

        active = true,
        updated_at = now();

    RETURN NEW;

END;
$$;


CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================================
-- CURRENT LOGGED-IN PROFILE
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$

    SELECT *
    FROM public.users

    WHERE auth_user_id = auth.uid()
      AND active = true

    LIMIT 1;

$$;


-- ============================================================
-- ADMIN CHECK
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$

    SELECT COALESCE(
        (
            SELECT role = 'admin'
            FROM public.users

            WHERE auth_user_id = auth.uid()
              AND active = true

            LIMIT 1
        ),
        false
    );

$$;


-- ============================================================
-- PROJECT ACCESS CHECK
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_access_project(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$

    SELECT

        public.is_admin()

        OR EXISTS (

            SELECT 1

            FROM public.projects p

            JOIN public.users u
                ON u.auth_user_id = auth.uid()

            WHERE p.id = pid
              AND p.leader_id = u.id
              AND u.active = true
        )

        OR EXISTS (

            SELECT 1

            FROM public.project_members pm

            JOIN public.users u
                ON u.id = pm.user_id

            WHERE pm.project_id = pid
              AND u.auth_user_id = auth.uid()
              AND u.active = true
        )

        OR EXISTS (

            SELECT 1

            FROM public.tasks t

            JOIN public.users u
                ON u.id = t.assignee_id

            WHERE t.project_id = pid
              AND u.auth_user_id = auth.uid()
              AND u.active = true
        );

$$;


-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phase_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- BASIC RLS POLICIES
-- ============================================================

-- All authenticated employees can see employee directory.
CREATE POLICY users_read
ON public.users
FOR SELECT
TO authenticated
USING (true);


-- Only admins manage profiles.
CREATE POLICY users_admin_manage
ON public.users
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- Admins see all projects.
-- Leaders/members/assignees see projects they participate in.
CREATE POLICY projects_read
ON public.projects
FOR SELECT
TO authenticated
USING (
    public.can_access_project(id)
);


-- Admin creates/deletes/manages projects.
CREATE POLICY projects_admin_manage
ON public.projects
FOR ALL
TO authenticated
USING (
    public.is_admin()
)
WITH CHECK (
    public.is_admin()
);


-- Project leader can update own project.
CREATE POLICY projects_leader_update
ON public.projects
FOR UPDATE
TO authenticated
USING (
    leader_id = (
        SELECT id
        FROM public.current_profile()
    )
)
WITH CHECK (
    leader_id = (
        SELECT id
        FROM public.current_profile()
    )
);


-- Project members.
CREATE POLICY project_members_read
ON public.project_members
FOR SELECT
TO authenticated
USING (
    public.can_access_project(project_id)
);


CREATE POLICY project_members_manage
ON public.project_members
FOR ALL
TO authenticated
USING (
    public.is_admin()

    OR EXISTS (
        SELECT 1
        FROM public.projects p

        WHERE p.id = project_id

        AND p.leader_id = (
            SELECT id
            FROM public.current_profile()
        )
    )
)
WITH CHECK (
    public.is_admin()

    OR EXISTS (
        SELECT 1
        FROM public.projects p

        WHERE p.id = project_id

        AND p.leader_id = (
            SELECT id
            FROM public.current_profile()
        )
    )
);


-- ============================================================
-- FINISHED
-- ============================================================
