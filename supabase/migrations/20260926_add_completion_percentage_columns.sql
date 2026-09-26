ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS completion_percentage integer NOT NULL DEFAULT 0
    CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS completion_percentage integer NOT NULL DEFAULT 0
    CHECK (completion_percentage >= 0 AND completion_percentage <= 100);
