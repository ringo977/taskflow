-- 034 — Partners / Teams
--
-- Org-level entities for tracking external partners, teams, vendors, labs, etc.
-- Not auth entities — purely domain model for responsibility tracking.
--
-- Tables:
--   partners              — org-level partner registry
--   project_partners      — junction: project ↔ partner (many-to-many)
--   tasks.partner_id      — optional FK for task-level partner assignment

-- ── Partners registry ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partners (
  id             text PRIMARY KEY DEFAULT ('pt' || extract(epoch from now())::bigint::text),
  org_id         text NOT NULL,
  name           text NOT NULL,
  type           text NOT NULL DEFAULT 'partner'
                   CHECK (type IN ('team','partner','vendor','lab','department','client')),
  contact_name   text,
  contact_email  text,
  notes          text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ── Junction: project ↔ partner ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_partners (
  project_id     text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  partner_id     text NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  org_id         text NOT NULL,
  role_label     text,
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, partner_id)
);

-- ── Task-level partner (optional) ─────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS partner_id text REFERENCES partners(id) ON DELETE SET NULL;

-- ── RLS: partners ─────────────────────────────────────────────────
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select" ON public.partners FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);
CREATE POLICY "partners_insert" ON public.partners FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "partners_update" ON public.partners FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "partners_delete" ON public.partners FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

-- ── RLS: project_partners ─────────────────────────────────────────
ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_partners_select" ON public.project_partners FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);
CREATE POLICY "project_partners_insert" ON public.project_partners FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "project_partners_update" ON public.project_partners FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "project_partners_delete" ON public.project_partners FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_partners_org ON public.partners(org_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_project ON public.project_partners(project_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_partner ON public.project_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_partner ON public.tasks(partner_id);

-- ── GRANTs ────────────────────────────────────────────────────────
GRANT ALL ON public.partners TO authenticated;
GRANT ALL ON public.project_partners TO authenticated;
