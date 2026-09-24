-- ============================================================
-- SQL Migration: Add 'type' and 'created_by' columns to 'projects' table
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'DFM / Sheet Metal';

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
