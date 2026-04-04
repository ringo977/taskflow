-- ─────────────────────────────────────────────────────────────
-- 035 — Workpackages: project-level structural grouping
-- ─────────────────────────────────────────────────────────────

-- Project workpackages (WP1, WP2, …)
CREATE TABLE IF NOT EXISTS public.project_workpackages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id           text NOT NULL,
  code             text NOT NULL,
  name             text NOT NULL,
  description      text,
  owner_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_partner_id text REFERENCES partners(id) ON DELETE SET NULL,
  due_date         date,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','active','review','complete','delayed')),
  position         int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT wp_single_owner CHECK (
    NOT (owner_user_id IS NOT NULL AND owner_partner_id IS NOT NULL)
  )
);

-- Task-level WP assignment (optional, one-to-one)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS workpackage_id uuid
    REFERENCES project_workpackages(id) ON DELETE SET NULL;

-- RLS ────────────────────────────────────────────────────────
ALTER TABLE public.project_workpackages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wp_select" ON public.project_workpackages FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);
CREATE POLICY "wp_insert" ON public.project_workpackages FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "wp_update" ON public.project_workpackages FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "wp_delete" ON public.project_workpackages FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

-- Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wp_project ON public.project_workpackages(project_id);
CREATE INDEX IF NOT EXISTS idx_wp_org ON public.project_workpackages(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wp ON public.tasks(workpackage_id);

-- GRANTs ─────────────────────────────────────────────────────
GRANT ALL ON public.project_workpackages TO authenticated;
