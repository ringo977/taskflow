-- ============================================================
-- Migration 025: User ID fields on tasks and comments
-- ============================================================
-- Adds UUID-based identity fields alongside the existing name-
-- based fields. This is phase 2 of the security hardening plan.
--
-- Changes:
--   tasks.assignee_ids  uuid[]  — replaces assignee_name over time
--   comments.author_id  uuid    — replaces author_name over time
--
-- Backfill: resolves existing display names to auth user IDs
-- via the public.profiles table.
--
-- SAFE TO RUN:
--   • Existing data is not deleted — assignee_name / author_name
--     are kept for backward compatibility during the transition
--   • Idempotent: ADD COLUMN IF NOT EXISTS
--   • Backfill uses ON CONFLICT DO NOTHING (safe to re-run)
-- ============================================================

-- ── 1. Add columns ────────────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assignee_ids uuid[] DEFAULT '{}';

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Backfill tasks.assignee_ids from assignee_name ─────────
-- assignee_name can be a plain name ("Marco Rasponi") or a
-- JSON-encoded array ('[\"Marco\",\"Jane\"]').
-- We expand each, match against profiles.display_name, and
-- collect the matching UUIDs into an array.
UPDATE public.tasks t
SET assignee_ids = (
  SELECT COALESCE(array_agg(p.id), '{}')
  FROM (
    -- Expand: handle both JSON array and plain string
    SELECT TRIM(elem) AS display_name
    FROM (
      SELECT jsonb_array_elements_text(
        CASE
          WHEN assignee_name LIKE '[%'
          THEN assignee_name::jsonb
          ELSE jsonb_build_array(assignee_name)
        END
      ) AS elem
      FROM public.tasks t2
      WHERE t2.id = t.id
        AND assignee_name IS NOT NULL
        AND assignee_name <> ''
    ) raw
  ) names
  JOIN public.profiles p ON LOWER(TRIM(p.display_name)) = LOWER(names.display_name)
)
WHERE assignee_name IS NOT NULL AND assignee_name <> '';

-- ── 3. Backfill comments.author_id from author_name ───────────
UPDATE public.comments c
SET author_id = p.id
FROM public.profiles p
WHERE LOWER(TRIM(p.display_name)) = LOWER(TRIM(c.author_name))
  AND c.author_id IS NULL
  AND c.author_name IS NOT NULL
  AND c.author_name <> '';

-- ── 4. Index for efficient per-user task queries ──────────────
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_ids
  ON public.tasks USING GIN (assignee_ids);

CREATE INDEX IF NOT EXISTS idx_comments_author_id
  ON public.comments (author_id);
