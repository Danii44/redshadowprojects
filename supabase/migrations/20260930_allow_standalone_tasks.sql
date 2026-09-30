ALTER TABLE public.tasks
    ALTER COLUMN project_id DROP NOT NULL;

DROP POLICY IF EXISTS tasks_assignee_insert ON public.tasks;
CREATE POLICY tasks_assignee_insert ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (
        assignee_id = (SELECT id FROM public.current_profile())
        AND created_by = (SELECT id FROM public.current_profile())
    );

DROP POLICY IF EXISTS task_comments_read ON public.task_comments;
CREATE POLICY task_comments_read ON public.task_comments FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id
          AND (
              public.can_access_project(t.project_id)
              OR t.assignee_id = (SELECT id FROM public.current_profile())
          )
    ));

DROP POLICY IF EXISTS task_comments_insert ON public.task_comments;
CREATE POLICY task_comments_insert ON public.task_comments FOR INSERT TO authenticated
    WITH CHECK (
        author_id = (SELECT id FROM public.current_profile())
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
              AND (
                  public.can_access_project(t.project_id)
                  OR t.assignee_id = (SELECT id FROM public.current_profile())
              )
        )
    );