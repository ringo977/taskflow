-- ============================================================
-- Migration 024: Granular RLS — write enforcement by role
-- ============================================================
-- Replaces the broad "FOR ALL USING (is_org_member(...))" policies
-- with per-operation policies that enforce the role hierarchy:
--
--   guests   → read-only (SELECT on everything)
--   members  → can create/edit tasks, subtasks, comments, sections
--   managers → all of the above + create/edit projects & portfolios
--   admins   → full control including destructive deletes
--
-- SAFE TO RUN:
--   • No data is modified — only access policies change
--   • Idempotent: DROP IF EXISTS before every CREATE
--   • SECURITY DEFINER RPCs (get_my_project_roles, etc.) are
--     unaffected — they bypass RLS by design
--   • Reversible: re-running 001_init.sql restores the old policies
-- ============================================================

-- ── 0. Helper: current user's org role ───────────────────────
-- Returns 'admin' | 'manager' | 'member' | 'guest' | NULL
CREATE OR REPLACE FUNCTION public.get_org_role(p_org_id text)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.org_members
  WHERE user_id = auth.uid() AND org_id = p_org_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_org_role(text) TO authenticated;


-- ============================================================
-- SCHEMA: polimi
-- ============================================================

-- Drop old catch-all policies
DROP POLICY IF EXISTS "polimi members full access" ON polimi.portfolios;
DROP POLICY IF EXISTS "polimi members full access" ON polimi.projects;
DROP POLICY IF EXISTS "polimi members full access" ON polimi.project_members;
DROP POLICY IF EXISTS "polimi members full access" ON polimi.sections;
DROP POLICY IF EXISTS "polimi members full access" ON polimi.tasks;
DROP POLICY IF EXISTS "polimi members full access" ON polimi.subtasks;
DROP POLICY IF EXISTS "polimi members full access" ON polimi.comments;

-- ── portfolios: read all, write admin/manager, delete admin only ──
CREATE POLICY "polimi portfolios select"
  ON polimi.portfolios FOR SELECT
  USING (public.is_org_member('polimi'));

CREATE POLICY "polimi portfolios insert"
  ON polimi.portfolios FOR INSERT
  WITH CHECK (public.get_org_role('polimi') IN ('admin', 'manager'));

CREATE POLICY "polimi portfolios update"
  ON polimi.portfolios FOR UPDATE
  USING (public.get_org_role('polimi') IN ('admin', 'manager'));

CREATE POLICY "polimi portfolios delete"
  ON polimi.portfolios FOR DELETE
  USING (public.get_org_role('polimi') = 'admin');

-- ── projects: read all, write admin/manager, delete admin only ───
CREATE POLICY "polimi projects select"
  ON polimi.projects FOR SELECT
  USING (public.is_org_member('polimi'));

CREATE POLICY "polimi projects insert"
  ON polimi.projects FOR INSERT
  WITH CHECK (public.get_org_role('polimi') IN ('admin', 'manager'));

CREATE POLICY "polimi projects update"
  ON polimi.projects FOR UPDATE
  USING (public.get_org_role('polimi') IN ('admin', 'manager'));

CREATE POLICY "polimi projects delete"
  ON polimi.projects FOR DELETE
  USING (public.get_org_role('polimi') = 'admin');

-- ── project_members: read all, manage admin/manager ──────────────
CREATE POLICY "polimi project_members select"
  ON polimi.project_members FOR SELECT
  USING (public.is_org_member('polimi'));

CREATE POLICY "polimi project_members insert"
  ON polimi.project_members FOR INSERT
  WITH CHECK (public.get_org_role('polimi') IN ('admin', 'manager'));

CREATE POLICY "polimi project_members update"
  ON polimi.project_members FOR UPDATE
  USING (public.get_org_role('polimi') IN ('admin', 'manager'));

CREATE POLICY "polimi project_members delete"
  ON polimi.project_members FOR DELETE
  USING (public.get_org_role('polimi') IN ('admin', 'manager'));

-- ── sections: read all, write member+, delete manager+ ───────────
CREATE POLICY "polimi sections select"
  ON polimi.sections FOR SELECT
  USING (public.is_org_member('polimi'));

CREATE POLICY "polimi sections insert"
  ON polimi.sections FOR INSERT
  WITH CHECK (public.get_org_role('polimi') IN ('admin', 'manager', 'member'));

CREATE POLICY "polimi sections update"
  ON polimi.sections FOR UPDATE
  USING (public.get_org_role('polimi') IN ('admin', 'manager', 'member'));

CREATE POLICY "polimi sections delete"
  ON polimi.sections FOR DELETE
  USING (public.get_org_role('polimi') IN ('admin', 'manager'));

-- ── tasks: read all, create/edit member+, delete manager+ ────────
CREATE POLICY "polimi tasks select"
  ON polimi.tasks FOR SELECT
  USING (public.is_org_member('polimi'));

CREATE POLICY "polimi tasks insert"
  ON polimi.tasks FOR INSERT
  WITH CHECK (public.get_org_role('polimi') IN ('admin', 'manager', 'member'));

CREATE POLICY "polimi tasks update"
  ON polimi.tasks FOR UPDATE
  USING (public.get_org_role('polimi') IN ('admin', 'manager', 'member'));

CREATE POLICY "polimi tasks delete"
  ON polimi.tasks FOR DELETE
  USING (public.get_org_role('polimi') IN ('admin', 'manager'));

-- ── subtasks: same as tasks ───────────────────────────────────────
CREATE POLICY "polimi subtasks select"
  ON polimi.subtasks FOR SELECT
  USING (public.is_org_member('polimi'));

CREATE POLICY "polimi subtasks insert"
  ON polimi.subtasks FOR INSERT
  WITH CHECK (public.get_org_role('polimi') IN ('admin', 'manager', 'member'));

CREATE POLICY "polimi subtasks update"
  ON polimi.subtasks FOR UPDATE
  USING (public.get_org_role('polimi') IN ('admin', 'manager', 'member'));

CREATE POLICY "polimi subtasks delete"
  ON polimi.subtasks FOR DELETE
  USING (public.get_org_role('polimi') IN ('admin', 'manager'));

-- ── comments: read all, write member+, edit/delete own or admin ──
CREATE POLICY "polimi comments select"
  ON polimi.comments FOR SELECT
  USING (public.is_org_member('polimi'));

CREATE POLICY "polimi comments insert"
  ON polimi.comments FOR INSERT
  WITH CHECK (public.get_org_role('polimi') IN ('admin', 'manager', 'member'));

CREATE POLICY "polimi comments update"
  ON polimi.comments FOR UPDATE
  USING (author_id = auth.uid() OR public.get_org_role('polimi') = 'admin');

CREATE POLICY "polimi comments delete"
  ON polimi.comments FOR DELETE
  USING (author_id = auth.uid() OR public.get_org_role('polimi') = 'admin');


-- ============================================================
-- SCHEMA: biomimx  (identical logic)
-- ============================================================

DROP POLICY IF EXISTS "biomimx members full access" ON biomimx.portfolios;
DROP POLICY IF EXISTS "biomimx members full access" ON biomimx.projects;
DROP POLICY IF EXISTS "biomimx members full access" ON biomimx.project_members;
DROP POLICY IF EXISTS "biomimx members full access" ON biomimx.sections;
DROP POLICY IF EXISTS "biomimx members full access" ON biomimx.tasks;
DROP POLICY IF EXISTS "biomimx members full access" ON biomimx.subtasks;
DROP POLICY IF EXISTS "biomimx members full access" ON biomimx.comments;

-- portfolios
CREATE POLICY "biomimx portfolios select"
  ON biomimx.portfolios FOR SELECT
  USING (public.is_org_member('biomimx'));

CREATE POLICY "biomimx portfolios insert"
  ON biomimx.portfolios FOR INSERT
  WITH CHECK (public.get_org_role('biomimx') IN ('admin', 'manager'));

CREATE POLICY "biomimx portfolios update"
  ON biomimx.portfolios FOR UPDATE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager'));

CREATE POLICY "biomimx portfolios delete"
  ON biomimx.portfolios FOR DELETE
  USING (public.get_org_role('biomimx') = 'admin');

-- projects
CREATE POLICY "biomimx projects select"
  ON biomimx.projects FOR SELECT
  USING (public.is_org_member('biomimx'));

CREATE POLICY "biomimx projects insert"
  ON biomimx.projects FOR INSERT
  WITH CHECK (public.get_org_role('biomimx') IN ('admin', 'manager'));

CREATE POLICY "biomimx projects update"
  ON biomimx.projects FOR UPDATE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager'));

CREATE POLICY "biomimx projects delete"
  ON biomimx.projects FOR DELETE
  USING (public.get_org_role('biomimx') = 'admin');

-- project_members
CREATE POLICY "biomimx project_members select"
  ON biomimx.project_members FOR SELECT
  USING (public.is_org_member('biomimx'));

CREATE POLICY "biomimx project_members insert"
  ON biomimx.project_members FOR INSERT
  WITH CHECK (public.get_org_role('biomimx') IN ('admin', 'manager'));

CREATE POLICY "biomimx project_members update"
  ON biomimx.project_members FOR UPDATE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager'));

CREATE POLICY "biomimx project_members delete"
  ON biomimx.project_members FOR DELETE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager'));

-- sections
CREATE POLICY "biomimx sections select"
  ON biomimx.sections FOR SELECT
  USING (public.is_org_member('biomimx'));

CREATE POLICY "biomimx sections insert"
  ON biomimx.sections FOR INSERT
  WITH CHECK (public.get_org_role('biomimx') IN ('admin', 'manager', 'member'));

CREATE POLICY "biomimx sections update"
  ON biomimx.sections FOR UPDATE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager', 'member'));

CREATE POLICY "biomimx sections delete"
  ON biomimx.sections FOR DELETE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager'));

-- tasks
CREATE POLICY "biomimx tasks select"
  ON biomimx.tasks FOR SELECT
  USING (public.is_org_member('biomimx'));

CREATE POLICY "biomimx tasks insert"
  ON biomimx.tasks FOR INSERT
  WITH CHECK (public.get_org_role('biomimx') IN ('admin', 'manager', 'member'));

CREATE POLICY "biomimx tasks update"
  ON biomimx.tasks FOR UPDATE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager', 'member'));

CREATE POLICY "biomimx tasks delete"
  ON biomimx.tasks FOR DELETE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager'));

-- subtasks
CREATE POLICY "biomimx subtasks select"
  ON biomimx.subtasks FOR SELECT
  USING (public.is_org_member('biomimx'));

CREATE POLICY "biomimx subtasks insert"
  ON biomimx.subtasks FOR INSERT
  WITH CHECK (public.get_org_role('biomimx') IN ('admin', 'manager', 'member'));

CREATE POLICY "biomimx subtasks update"
  ON biomimx.subtasks FOR UPDATE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager', 'member'));

CREATE POLICY "biomimx subtasks delete"
  ON biomimx.subtasks FOR DELETE
  USING (public.get_org_role('biomimx') IN ('admin', 'manager'));

-- comments
CREATE POLICY "biomimx comments select"
  ON biomimx.comments FOR SELECT
  USING (public.is_org_member('biomimx'));

CREATE POLICY "biomimx comments insert"
  ON biomimx.comments FOR INSERT
  WITH CHECK (public.get_org_role('biomimx') IN ('admin', 'manager', 'member'));

CREATE POLICY "biomimx comments update"
  ON biomimx.comments FOR UPDATE
  USING (author_id = auth.uid() OR public.get_org_role('biomimx') = 'admin');

CREATE POLICY "biomimx comments delete"
  ON biomimx.comments FOR DELETE
  USING (author_id = auth.uid() OR public.get_org_role('biomimx') = 'admin');
