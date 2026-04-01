-- Add milestone and visibility columns to tasks table.
-- These columns are written by the app (upsertTask) but were never
-- added via migration, causing "column does not exist" errors.
-- Run in Supabase Dashboard → SQL Editor → New query

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS milestone boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'all';
