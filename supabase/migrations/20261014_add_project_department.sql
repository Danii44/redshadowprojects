BEGIN;

ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_team_id_idx ON public.projects(team_id);

COMMIT;
