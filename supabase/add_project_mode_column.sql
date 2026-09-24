-- ============================================================
-- SQL Migration: Add 'project_type' column for Hourly / Ongoing Project Support
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'fixed_deadline';

-- Make deadline field nullable so hourly/ongoing projects don't require a dummy date
ALTER TABLE public.projects 
ALTER COLUMN deadline DROP NOT NULL;
