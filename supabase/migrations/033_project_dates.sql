-- ============================================================
-- Migration 033: Add start_date and end_date to projects
-- ============================================================
-- Enables supervised projects to define a time window.
-- Both columns are optional — standard projects can leave them NULL.
-- SAFE TO RUN: additive only, no existing data touched.
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;
