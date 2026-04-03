-- ============================================================
-- Migration 031: Project Supervision layer tables
-- ============================================================
-- Adds the core data model for the optional supervision layer:
--   - project_supervision_settings (1:1 with projects)
--   - project_deliverables
--   - project_deliverable_tasks (junction)
--
-- RLS follows the same org-role pattern as projects/tasks/sections
-- (migration 024). org_id is denormalized on each table so
-- get_org_role() works without subselects through projects.
--
-- SAFE TO RUN: new tables only, no existing data touched.
-- ROLLBACK: DROP TABLE project_deliverable_tasks, project_deliverables,
--           project_supervision_settings CASCADE;
-- ============================================================

-- ── 1. Supervision settings (1 row per supervised project) ───

CREATE TABLE IF NOT EXISTS public.project_supervision_settings (
  project_id             text       PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id                 text       NOT NULL,
  cockpit_window_default int        NOT NULL DEFAULT 14,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

ALTER TABLE public.project_supervision_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supervision_settings select"
  ON public.project_supervision_settings FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

CREATE POLICY "supervision_settings insert"
  ON public.project_supervision_settings FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "supervision_settings update"
  ON public.project_supervision_settings FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "supervision_settings delete"
  ON public.project_supervision_settings FOR DELETE
  USING (public.get_org_role(org_id) = 'admin');


-- ── 2. Deliverables ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_deliverables (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           text        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id               text        NOT NULL,
  code                 text        NOT NULL,
  title                text        NOT NULL,
  description          text,
  owner                text,        -- V1: text for simplicity; align to owner_id if layer grows
  due_date             date,
  status               text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_progress','internal_review','submitted','accepted','delayed')),
  linked_milestone_ref text,
  notes                text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliverables select"
  ON public.project_deliverables FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

CREATE POLICY "deliverables insert"
  ON public.project_deliverables FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "deliverables update"
  ON public.project_deliverables FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "deliverables delete"
  ON public.project_deliverables FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));


-- ── 3. Junction: deliverable ↔ task ──────────────────────────

CREATE TABLE IF NOT EXISTS public.project_deliverable_tasks (
  deliverable_id  uuid        NOT NULL REFERENCES public.project_deliverables(id) ON DELETE CASCADE,
  task_id         text        NOT NULL,
  org_id          text        NOT NULL,
  created_at      timestamptz DEFAULT now(),
  PRIMARY KEY (deliverable_id, task_id)
);

ALTER TABLE public.project_deliverable_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliverable_tasks select"
  ON public.project_deliverable_tasks FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

CREATE POLICY "deliverable_tasks insert"
  ON public.project_deliverable_tasks FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "deliverable_tasks delete"
  ON public.project_deliverable_tasks FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));


-- ── 4. Grants ───────────────────────────────────────────────

GRANT ALL ON public.project_supervision_settings TO authenticated;
GRANT ALL ON public.project_deliverables TO authenticated;
GRANT ALL ON public.project_deliverable_tasks TO authenticated;


-- ── 5. Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_deliverables_project ON public.project_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_due     ON public.project_deliverables(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deliverable_tasks_task ON public.project_deliverable_tasks(task_id);
