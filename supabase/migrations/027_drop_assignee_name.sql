-- ============================================================
-- Migration 027: Drop tasks.assignee_name
-- ============================================================
-- assignee_name was the original denormalized text field for
-- storing assignee display names (plain string or JSON array).
-- It has been superseded by assignee_ids (uuid[]), added in
-- migration 025 with a full data backfill.
--
-- The app write path no longer writes to assignee_name (since
-- the phase-2/3 refactor). The read path resolves names from
-- assignee_ids via the profiles table.
--
-- PREREQUISITE: migrations 025 and 026 must be applied first.
--
-- SAFE TO RUN:
--   • IF EXISTS guard prevents errors on repeated runs
--   • No other table references this column
-- ============================================================

ALTER TABLE public.tasks DROP COLUMN IF EXISTS assignee_name;
