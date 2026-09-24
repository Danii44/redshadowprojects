-- ============================================================
-- RED SHADOW DESIGNS
-- MASTER DATABASE SCHEMA  (v2 — 2026-09-24)
--
-- HOW TO USE:
--   Option A — Fresh database:
--     Run this entire file in Supabase Dashboard → SQL Editor.
--     It will create everything from scratch.
--
--   Option B — Existing database (apply missing pieces):
--     Run the "SAFE MIGRATIONS" section at the bottom.
--     It is fully idempotent (safe to run multiple times).
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
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id    uuid        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    email           text        UNIQUE,
    name            text        NOT NULL,
    role            public.app_role NOT NULL DEFAULT 'team_member',
    avatar_url      text,
    active          boolean     NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- TEAMS
-- ============================================================

CREATE TABLE public.teams (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        UNIQUE NOT NULL,
    leader_id   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     uuid        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(team_id, user_id)
);


-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE public.projects (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Auto-generated project code (e.g. FDI-T423)
    code                    text        UNIQUE NOT NULL,

    -- Human-readable name
    name                    text        NOT NULL,

    -- Optional client name
    client                  text,

    -- Project category / discipline (e.g. DFM, Animation, Technical Design)
    type                    text,

    -- Delivery mode:
    --   'fixed_deadline'  — has a strict deadline date
    --   'hourly_ongoing'  — continuous retainer, no fixed deadline
    project_type            text        NOT NULL DEFAULT 'fixed_deadline',

    -- Long-form fields
    description             text,
    requirements            text,
    internal_notes          text,

    -- Workflow status
    -- open / in_progress / in_review / revisions / on_hold / delivered / closed / cancelled
    status                  text        NOT NULL DEFAULT 'open',

    -- Priority: none / low / normal / high / critical
    priority                text        NOT NULL DEFAULT 'normal',

    -- NULL means unassigned
    leader_id               uuid        REFERENCES public.users(id) ON DELETE SET NULL,

    -- Dates (deadline is nullable for hourly/ongoing projects)
    start_date              date,
    deadline                timestamptz,

    completion_percentage   integer     NOT NULL DEFAULT 0
                                        CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

    last_activity_at        timestamptz DEFAULT now(),
    archived_at             timestamptz,

    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- PROJECT MEMBERS
-- ============================================================

CREATE TABLE public.project_members (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_role    text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);


-- ============================================================
-- PROJECT PHASES
-- ============================================================

CREATE TABLE public.project_phases (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name            text        NOT NULL,
    position        integer     NOT NULL,
    -- pending / active / review / revision / completed
    state           text        NOT NULL DEFAULT 'pending',
    started_at      timestamptz,
    completed_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, position)
);


-- ============================================================
-- PHASE HISTORY
-- ============================================================

CREATE TABLE public.project_phase_history (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    from_phase_id   uuid        REFERENCES public.project_phases(id) ON DELETE SET NULL,
    to_phase_id     uuid        NOT NULL REFERENCES public.project_phases(id) ON DELETE CASCADE,
    requested_by    uuid        NOT NULL REFERENCES public.users(id),
    approved_by     uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    state           text        NOT NULL DEFAULT 'requested',
    note            text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE public.tasks (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id                uuid        REFERENCES public.project_phases(id) ON DELETE SET NULL,
    title                   text        NOT NULL,
    description             text,
    assignee_id             uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    created_by              uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    reviewer_id             uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    -- open / in_progress / in_review / in_revision / completed / cancelled
    status                  text        NOT NULL DEFAULT 'open',
    priority                text        NOT NULL DEFAULT 'normal',
    -- due_at is the primary deadline field used by the app (timestamptz)
    due_at                  timestamptz,
    -- due_date kept for backward compat
    due_date                date,
    completion_percentage   integer     NOT NULL DEFAULT 0
                                        CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    blocked_reason          text,
    blocked_at              timestamptz,
    submitted_at            timestamptz,
    reviewed_at             timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- TASK CHECKLIST
-- ============================================================

CREATE TABLE public.task_checklists (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    label           text        NOT NULL,
    position        integer     NOT NULL,
    completed       boolean     NOT NULL DEFAULT false,
    completed_by    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    completed_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(task_id, position)
);


-- ============================================================
-- TASK COMMENTS
-- ============================================================

CREATE TABLE public.task_comments (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    author_id   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    body        text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- REVISIONS
-- ============================================================

CREATE TABLE public.revisions (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    phase_id        uuid        REFERENCES public.project_phases(id) ON DELETE SET NULL,
    number          integer     NOT NULL,
    notes           text,
    state           text        NOT NULL DEFAULT 'open',
    submitted_by    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    submitted_at    timestamptz,
    reviewed_by     uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at     timestamptz,
    review_outcome  text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(project_id, number)
);


-- ============================================================
-- REVISION COMMENTS
-- ============================================================

CREATE TABLE public.revision_comments (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id     uuid        NOT NULL REFERENCES public.revisions(id) ON DELETE CASCADE,
    author_id       uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    body            text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- DAILY UPDATES
-- ============================================================

CREATE TABLE public.daily_updates (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    project_id      uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
    summary         text        NOT NULL,
    blockers        text,
    next_steps      text,
    update_date     date        NOT NULL DEFAULT current_date,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
    id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid                NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type            text                NOT NULL,
    -- Uses public.alert_level enum: 'critical' | 'warning' | 'information'
    severity        public.alert_level  NOT NULL DEFAULT 'information',
    title           text                NOT NULL,
    body            text,
    entity_type     text,
    entity_id       uuid,
    read_at         timestamptz,
    created_at      timestamptz         NOT NULL DEFAULT now(),
    updated_at      timestamptz         NOT NULL DEFAULT now()
);


-- ============================================================
-- ACTIVITY LOGS
-- ============================================================

CREATE TABLE public.activity_logs (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        uuid        REFERENCES public.users(id) ON DELETE SET NULL,
    project_id      uuid        REFERENCES public.projects(id) ON DELETE CASCADE,
    action          text        NOT NULL,
    entity_type     text        NOT NULL,
    entity_id       uuid,
    metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_projects_leader_status   ON public.projects(leader_id, status);
CREATE INDEX idx_projects_status          ON public.projects(status);
CREATE INDEX idx_projects_start_date      ON public.projects(start_date);
CREATE INDEX idx_projects_deadline        ON public.projects(deadline);
CREATE INDEX idx_projects_type            ON public.projects(project_type);

CREATE INDEX idx_project_members_user     ON public.project_members(user_id);
CREATE INDEX idx_project_members_project  ON public.project_members(project_id);

CREATE INDEX idx_tasks_project            ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_status    ON public.tasks(assignee_id, status);
CREATE INDEX idx_tasks_due_at             ON public.tasks(due_at);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at);
CREATE INDEX idx_activity_project_created  ON public.activity_logs(project_id, created_at DESC);


-- ============================================================
-- AUTH USER -> PUBLIC PROFILE SYNC
-- Automatically creates a users row when a new Supabase Auth
-- user signs up (or links an email that already exists).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (auth_user_id, email, name, role, active)
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
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        name = COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            public.users.name
        ),
        active     = true,
        updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS public.users
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT * FROM public.users
    WHERE auth_user_id = auth.uid() AND active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT role = 'admin' FROM public.users
         WHERE auth_user_id = auth.uid() AND active = true LIMIT 1),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_project(pid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT
        public.is_admin()

        OR EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.users u ON u.auth_user_id = auth.uid()
            WHERE p.id = pid AND p.leader_id = u.id AND u.active = true
        )

        OR EXISTS (
            SELECT 1 FROM public.project_members pm
            JOIN public.users u ON u.id = pm.user_id
            WHERE pm.project_id = pid AND u.auth_user_id = auth.uid() AND u.active = true
        )

        OR EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.users u ON u.id = t.assignee_id
            WHERE t.project_id = pid AND u.auth_user_id = auth.uid() AND u.active = true
        );
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_phase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revision_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_updates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs       ENABLE ROW LEVEL SECURITY;


-- ── USERS ───────────────────────────────────────────────────
CREATE POLICY users_read          ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_admin_manage  ON public.users FOR ALL    TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── TEAMS ───────────────────────────────────────────────────
CREATE POLICY teams_read          ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_admin_manage  ON public.teams FOR ALL    TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY team_members_read   ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY team_members_manage ON public.team_members FOR ALL    TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── PROJECTS ────────────────────────────────────────────────
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated
    USING (public.can_access_project(id));

CREATE POLICY projects_admin_manage ON public.projects FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY projects_leader_update ON public.projects FOR UPDATE TO authenticated
    USING (leader_id = (SELECT id FROM public.current_profile()))
    WITH CHECK (leader_id = (SELECT id FROM public.current_profile()));

-- ── PROJECT MEMBERS ─────────────────────────────────────────
CREATE POLICY project_members_read ON public.project_members FOR SELECT TO authenticated
    USING (public.can_access_project(project_id));

CREATE POLICY project_members_manage ON public.project_members FOR ALL TO authenticated
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
              AND p.leader_id = (SELECT id FROM public.current_profile())
        )
    )
    WITH CHECK (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
              AND p.leader_id = (SELECT id FROM public.current_profile())
        )
    );

-- ── PROJECT PHASES ──────────────────────────────────────────
CREATE POLICY project_phases_read ON public.project_phases FOR SELECT TO authenticated
    USING (public.can_access_project(project_id));

CREATE POLICY project_phases_manage ON public.project_phases FOR ALL TO authenticated
    USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id
          AND p.leader_id = (SELECT id FROM public.current_profile())
    ))
    WITH CHECK (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id
          AND p.leader_id = (SELECT id FROM public.current_profile())
    ));

-- ── TASKS ───────────────────────────────────────────────────
CREATE POLICY tasks_read ON public.tasks FOR SELECT TO authenticated
    USING (
        public.is_admin()
        OR public.can_access_project(project_id)
        OR assignee_id = (SELECT id FROM public.current_profile())
    );

CREATE POLICY tasks_admin_manage ON public.tasks FOR ALL TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY tasks_assignee_update ON public.tasks FOR UPDATE TO authenticated
    USING (assignee_id = (SELECT id FROM public.current_profile()))
    WITH CHECK (assignee_id = (SELECT id FROM public.current_profile()));

CREATE POLICY tasks_leader_manage ON public.tasks FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id
          AND p.leader_id = (SELECT id FROM public.current_profile())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id
          AND p.leader_id = (SELECT id FROM public.current_profile())
    ));

-- ── TASK CHECKLISTS & COMMENTS ──────────────────────────────
CREATE POLICY task_checklists_access ON public.task_checklists FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.can_access_project(t.project_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.can_access_project(t.project_id)));

CREATE POLICY task_comments_read ON public.task_comments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.can_access_project(t.project_id)));

CREATE POLICY task_comments_insert ON public.task_comments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.can_access_project(t.project_id)));

-- ── REVISIONS ───────────────────────────────────────────────
CREATE POLICY revisions_read ON public.revisions FOR SELECT TO authenticated
    USING (public.can_access_project(project_id));

CREATE POLICY revisions_manage ON public.revisions FOR ALL TO authenticated
    USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id
          AND p.leader_id = (SELECT id FROM public.current_profile())
    ))
    WITH CHECK (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id
          AND p.leader_id = (SELECT id FROM public.current_profile())
    ));

-- ── DAILY UPDATES ───────────────────────────────────────────
CREATE POLICY daily_updates_read ON public.daily_updates FOR SELECT TO authenticated
    USING (user_id = (SELECT id FROM public.current_profile()) OR public.is_admin());

CREATE POLICY daily_updates_insert ON public.daily_updates FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT id FROM public.current_profile()));

CREATE POLICY daily_updates_update ON public.daily_updates FOR UPDATE TO authenticated
    USING (user_id = (SELECT id FROM public.current_profile()))
    WITH CHECK (user_id = (SELECT id FROM public.current_profile()));

-- ── NOTIFICATIONS ───────────────────────────────────────────
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated
    USING (user_id = (SELECT id FROM public.current_profile()));

CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = (SELECT id FROM public.current_profile()))
    WITH CHECK (user_id = (SELECT id FROM public.current_profile()));

-- ── ACTIVITY LOGS ───────────────────────────────────────────
CREATE POLICY activity_logs_read ON public.activity_logs FOR SELECT TO authenticated
    USING (public.is_admin() OR public.can_access_project(project_id));


-- ============================================================
-- NOTIFICATION TRIGGER FUNCTIONS
-- All severity values are explicitly cast to ::public.alert_level
-- to avoid the "column is of type alert_level but expression is
-- of type text" error.
-- ============================================================

-- ── When a new project is created ───────────────────────────
CREATE OR REPLACE FUNCTION public.notify_project_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    SELECT DISTINCT u.id,
           'project_created',
           'information'::public.alert_level,
           'New project created',
           NEW.name || ' (' || NEW.code || ') was created.',
           'project', NEW.id
    FROM public.users u
    WHERE u.active = true AND (u.role = 'admin' OR u.id = NEW.leader_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_project_created_trigger ON public.projects;
CREATE TRIGGER notify_project_created_trigger
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.notify_project_created();


-- ── When a task is assigned (or reassigned) ─────────────────
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Skip if assignee didn't change on UPDATE
    IF TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id THEN
        RETURN NEW;
    END IF;

    -- If no assignee, do not send assignment notification
    IF NEW.assignee_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    SELECT recipient.id,
           'task_assigned',
           'information'::public.alert_level,
           CASE 
               WHEN recipient.id = NEW.assignee_id THEN 'New task assigned to you'
               ELSE 'Task assigned'
           END,
           CASE
               WHEN recipient.id = NEW.assignee_id THEN 'You have been assigned to: "' || NEW.title || '" in project ' || COALESCE(p.name, 'Unknown') || '.'
               ELSE '"' || NEW.title || '" was assigned in project ' || COALESCE(p.name, 'Unknown') || '.'
           END,
           'task', NEW.id
    FROM public.projects p
    JOIN LATERAL (
        SELECT u.id FROM public.users u WHERE u.active = true AND u.role = 'admin'
        UNION
        SELECT p.leader_id WHERE p.leader_id IS NOT NULL
        UNION
        SELECT NEW.assignee_id
    ) recipient ON true
    WHERE p.id = NEW.project_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_task_assignment_trigger ON public.tasks;
CREATE TRIGGER notify_task_assignment_trigger
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();


-- ── When a new team member (user) is created ────────────────
CREATE OR REPLACE FUNCTION public.notify_management_of_new_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    SELECT u.id,
           'member_created',
           'information'::public.alert_level,
           'New team member added',
           NEW.name || ' joined the company workspace.',
           'user', NEW.id
    FROM public.users u
    WHERE u.active = true AND u.role IN ('admin', 'project_leader') AND u.id <> NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_management_of_new_member_trigger ON public.users;
CREATE TRIGGER notify_management_of_new_member_trigger
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.notify_management_of_new_member();


-- ── When a new team is created ──────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_management_of_new_team()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    SELECT u.id,
           'team_created',
           'information'::public.alert_level,
           'New team created',
           NEW.name || ' was added to the workspace.',
           'team', NEW.id
    FROM public.users u
    WHERE u.active = true AND u.role IN ('admin', 'project_leader');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_management_of_new_team_trigger ON public.teams;
CREATE TRIGGER notify_management_of_new_team_trigger
AFTER INSERT ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.notify_management_of_new_team();


-- ── When a team member is added to a project ─────────────────
-- This notifies the member directly so they know they've been assigned.
CREATE OR REPLACE FUNCTION public.notify_project_member_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_project_name text;
    v_project_code text;
    v_leader_id    uuid;
BEGIN
    -- Get project name, code, and leader
    SELECT name, code, leader_id INTO v_project_name, v_project_code, v_leader_id
    FROM public.projects WHERE id = NEW.project_id;

    -- Avoid notifying if the user is the project leader (they already know from project creation)
    IF NEW.user_id = v_leader_id THEN
        RETURN NEW;
    END IF;

    -- Notify the newly added member
    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    VALUES (
        NEW.user_id,
        'project_assigned',
        'information'::public.alert_level,
        'You were added to a project',
        'You have been assigned to project: ' || COALESCE(v_project_name, 'Unknown')
            || ' (' || COALESCE(v_project_code, '?') || ').',
        'project',
        NEW.project_id
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_project_member_added_trigger ON public.project_members;
CREATE TRIGGER notify_project_member_added_trigger
AFTER INSERT ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.notify_project_member_added();


-- ============================================================
-- SAFE MIGRATIONS  (run on an EXISTING database)
-- Each block is idempotent — safe to run multiple times.
-- If setting up from scratch, these are already included above.
-- ============================================================

-- Add project_type column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='projects' AND column_name='project_type')
    THEN ALTER TABLE public.projects ADD COLUMN project_type text NOT NULL DEFAULT 'fixed_deadline'; END IF;
END $$;

-- Add type (category) column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='projects' AND column_name='type')
    THEN ALTER TABLE public.projects ADD COLUMN type text; END IF;
END $$;

-- Make deadline nullable
ALTER TABLE public.projects ALTER COLUMN deadline DROP NOT NULL;

-- Add due_at to tasks
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='tasks' AND column_name='due_at')
    THEN ALTER TABLE public.tasks ADD COLUMN due_at timestamptz; END IF;
END $$;

-- Attempt implicit cast TEXT -> alert_level (belt-and-suspenders)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_cast
        WHERE castsource = 'text'::regtype AND casttarget = 'public.alert_level'::regtype)
    THEN CREATE CAST (text AS public.alert_level) WITH INOUT AS IMPLICIT; END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Enable Realtime publication for notifications (required for browser push notifications)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;