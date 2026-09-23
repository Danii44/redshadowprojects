-- Incremental update for an EXISTING Red Shadow database.
-- Run this file in Supabase SQL Editor instead of re-running schema.sql.
-- It is safe to run this update more than once.

BEGIN;

-- Project workflow used by the application.
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'open';

UPDATE public.projects
SET status = CASE status
    WHEN 'active' THEN 'open'
    WHEN 'waiting_client' THEN 'in_review'
    WHEN 'revision' THEN 'revisions'
    WHEN 'completed' THEN 'closed'
    WHEN 'on_hold' THEN 'in_progress'
    ELSE status
END
WHERE status IN ('active', 'waiting_client', 'revision', 'completed', 'on_hold');

-- Notification rows are private to their recipient. Admin and leader alerts are
-- inserted as individual rows, so nobody needs permission to read another inbox.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_read_own ON public.notifications;
CREATE POLICY notifications_read_own
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = (SELECT id FROM public.current_profile()));

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = (SELECT id FROM public.current_profile()))
WITH CHECK (user_id = (SELECT id FROM public.current_profile()));

-- Team members can see only their assigned tasks. Admins see every task and a
-- project leader sees tasks belonging to projects they lead.
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_read_scoped ON public.tasks;
CREATE POLICY tasks_read_scoped
ON public.tasks
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR assignee_id = (SELECT id FROM public.current_profile())
    OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
          AND p.leader_id = (SELECT id FROM public.current_profile())
    )
);

DROP POLICY IF EXISTS tasks_manage_admin_leader ON public.tasks;
CREATE POLICY tasks_manage_admin_leader
ON public.tasks
FOR ALL
TO authenticated
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

-- This is the only write path needed by a team member. It prevents them from
-- editing assignment, title, deadline, priority, or another employee's task.
-- DROP is required because PostgreSQL cannot change an existing function's
-- return type through CREATE OR REPLACE FUNCTION.
DROP FUNCTION IF EXISTS public.update_assigned_task_status(uuid, text);

CREATE OR REPLACE FUNCTION public.update_assigned_task_status(task_id uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_id uuid;
BEGIN
    SELECT id INTO profile_id FROM public.current_profile();

    IF new_status NOT IN ('open', 'in_progress', 'in_review', 'in_revision', 'closed', 'cancelled', 'completed') THEN
        RAISE EXCEPTION 'Invalid task status';
    END IF;

    UPDATE public.tasks
    SET status = new_status,
        submitted_at = CASE WHEN new_status = 'in_review' THEN now() ELSE submitted_at END,
        reviewed_at = CASE WHEN new_status IN ('closed', 'completed') THEN now() ELSE reviewed_at END,
        updated_at = now()
    WHERE id = task_id
      AND assignee_id = profile_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task not found or not assigned to you';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_assigned_task_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_assigned_task_status(uuid, text) TO authenticated;

-- Notify admins and project leaders when a project is created.
CREATE OR REPLACE FUNCTION public.notify_project_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    SELECT DISTINCT u.id, 'project_created', 'information', 'New project created',
           NEW.name || ' (' || NEW.code || ') was created.', 'project', NEW.id
    FROM public.users u
    WHERE u.active = true
      AND (u.role = 'admin' OR u.id = NEW.leader_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_project_created_trigger ON public.projects;
CREATE TRIGGER notify_project_created_trigger
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.notify_project_created();

-- Notify the assignee, all admins, and the project's leader when a task is
-- created or reassigned. UNION removes duplicates when one person has two roles.
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    SELECT recipient.id, 'task_assigned', 'information', 'Task assigned',
           NEW.title || ' was assigned in project ' || COALESCE(p.name, 'Unknown') || '.', 'task', NEW.id
    FROM public.projects p
    JOIN LATERAL (
        SELECT u.id FROM public.users u WHERE u.active = true AND u.role = 'admin'
        UNION
        SELECT p.leader_id WHERE p.leader_id IS NOT NULL
        UNION
        SELECT NEW.assignee_id WHERE NEW.assignee_id IS NOT NULL
    ) recipient ON true
    WHERE p.id = NEW.project_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_task_assignment_trigger ON public.tasks;
CREATE TRIGGER notify_task_assignment_trigger
AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

-- Notify management when a company member or team is created.
CREATE OR REPLACE FUNCTION public.notify_management_of_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    SELECT u.id, 'member_created', 'information', 'New team member added',
           NEW.name || ' joined the company workspace.', 'user', NEW.id
    FROM public.users u
    WHERE u.active = true AND u.role IN ('admin', 'project_leader') AND u.id <> NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_management_new_member_trigger ON public.users;
CREATE TRIGGER notify_management_new_member_trigger
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.notify_management_of_new_member();

CREATE OR REPLACE FUNCTION public.notify_management_of_new_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, severity, title, body, entity_type, entity_id)
    SELECT u.id, 'team_created', 'information', 'New team created',
           NEW.name || ' was added to the workspace.', 'team', NEW.id
    FROM public.users u
    WHERE u.active = true AND u.role IN ('admin', 'project_leader');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_management_new_team_trigger ON public.teams;
CREATE TRIGGER notify_management_new_team_trigger
AFTER INSERT ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.notify_management_of_new_team();

COMMIT;
