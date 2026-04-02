-- ============================================================
-- Migration 024: Granular RLS — write enforcement by role
-- ============================================================
-- The actual database uses public.* tables with an org_id column,
-- not the schema-per-org design in 001_init.sql.
--
-- This migration replaces the permissive (or absent) policies on
-- the data tables with per-operation policies that enforce:
--
--   guests   → read-only
--   members  → create/edit tasks, subtasks, comments, sections
--   managers → all of the above + projects, portfolios
--   admins   → full control including destructive deletes
--
-- SAFE TO RUN:
--   • No data is modified — only access policies change
--   • Idempotent: DROP IF EXISTS before every CREATE
--   • ENABLE ROW LEVEL SECURITY is a no-op if already enabled
--   • SECURITY DEFINER RPCs (get_my_project_roles, etc.)
--     bypass RLS and are unaffected
-- ============================================================

-- ── 0. Helper: current user's role in an org ─────────────────
-- Returns 'admin' | 'manager' | 'member' | 'guest' | NULL
-- NULL means the user does not belong to that org at all.
CREATE OR REPLACE FUNCTION public.get_org_role(p_org_id text)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.org_members
  WHERE user_id = auth.uid() AND org_id = p_org_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_org_role(text) TO authenticated;


-- ── 1. portfolios ─────────────────────────────────────────────
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolios select" ON public.portfolios;
DROP POLICY IF EXISTS "portfolios insert" ON public.portfolios;
DROP POLICY IF EXISTS "portfolios update" ON public.portfolios;
DROP POLICY IF EXISTS "portfolios delete" ON public.portfolios;

-- Any org member can read
CREATE POLICY "portfolios select"
  ON public.portfolios FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

-- Create/edit: admin or manager
CREATE POLICY "portfolios insert"
  ON public.portfolios FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "portfolios update"
  ON public.portfolios FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

-- Delete: admin only
CREATE POLICY "portfolios delete"
  ON public.portfolios FOR DELETE
  USING (public.get_org_role(org_id) = 'admin');


-- ── 2. projects ───────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects select" ON public.projects;
DROP POLICY IF EXISTS "projects insert" ON public.projects;
DROP POLICY IF EXISTS "projects update" ON public.projects;
DROP POLICY IF EXISTS "projects delete" ON public.projects;

CREATE POLICY "projects select"
  ON public.projects FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

CREATE POLICY "projects insert"
  ON public.projects FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "projects update"
  ON public.projects FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "projects delete"
  ON public.projects FOR DELETE
  USING (public.get_org_role(org_id) = 'admin');


-- ── 3. sections ───────────────────────────────────────────────
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections select" ON public.sections;
DROP POLICY IF EXISTS "sections insert" ON public.sections;
DROP POLICY IF EXISTS "sections update" ON public.sections;
DROP POLICY IF EXISTS "sections delete" ON public.sections;

CREATE POLICY "sections select"
  ON public.sections FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

-- Members and above can manage sections
CREATE POLICY "sections insert"
  ON public.sections FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

CREATE POLICY "sections update"
  ON public.sections FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

-- Section delete: manager+ (structural change)
CREATE POLICY "sections delete"
  ON public.sections FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));


-- ── 4. tasks ──────────────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks select" ON public.tasks;
DROP POLICY IF EXISTS "tasks insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks update" ON public.tasks;
DROP POLICY IF EXISTS "tasks delete" ON public.tasks;

CREATE POLICY "tasks select"
  ON public.tasks FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

-- Create/edit tasks: member and above (guests read-only)
CREATE POLICY "tasks insert"
  ON public.tasks FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

CREATE POLICY "tasks update"
  ON public.tasks FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

-- Delete tasks: manager+ (too destructive for regular members)
CREATE POLICY "tasks delete"
  ON public.tasks FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));


-- ── 5. subtasks ───────────────────────────────────────────────
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subtasks select" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks insert" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks update" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks delete" ON public.subtasks;

CREATE POLICY "subtasks select"
  ON public.subtasks FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

CREATE POLICY "subtasks insert"
  ON public.subtasks FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

CREATE POLICY "subtasks update"
  ON public.subtasks FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

CREATE POLICY "subtasks delete"
  ON public.subtasks FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));


-- ── 6. comments ───────────────────────────────────────────────
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments select" ON public.comments;
DROP POLICY IF EXISTS "comments insert" ON public.comments;
DROP POLICY IF EXISTS "comments update" ON public.comments;
DROP POLICY IF EXISTS "comments delete" ON public.comments;

CREATE POLICY "comments select"
  ON public.comments FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

CREATE POLICY "comments insert"
  ON public.comments FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

-- Edit/delete comments: manager+ only.
-- Per-author restriction requires user_id on comments (phase 2: name→id migration).
CREATE POLICY "comments update"
  ON public.comments FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "comments delete"
  ON public.comments FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));


-- ── 7. task_dependencies ──────────────────────────────────────
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_dependencies select" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_dependencies insert" ON public.task_dependencies;
DROP POLICY IF EXISTS "task_dependencies delete" ON public.task_dependencies;

CREATE POLICY "task_dependencies select"
  ON public.task_dependencies FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

CREATE POLICY "task_dependencies insert"
  ON public.task_dependencies FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

CREATE POLICY "task_dependencies delete"
  ON public.task_dependencies FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));
