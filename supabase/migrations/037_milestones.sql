-- 037 — Structured milestones (replaces boolean flag on tasks)
-- ROLLOUT ATOMICO: questa migration va deployata insieme ad adapter + schema + UI

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id           text NOT NULL,
  workpackage_id   uuid REFERENCES project_workpackages(id) ON DELETE SET NULL,
  code             text NOT NULL,              -- "MS1", "MS2", etc.
  name             text NOT NULL,
  description      text,                       -- means of verification
  owner_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_partner_id text REFERENCES partners(id) ON DELETE SET NULL,
  target_date      date,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','pending','achieved','missed')),
  position         int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT ms_single_owner CHECK (
    NOT (owner_user_id IS NOT NULL AND owner_partner_id IS NOT NULL)
  )
);

-- Replace boolean milestone flag with structured FK
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS milestone_id uuid
    REFERENCES project_milestones(id) ON DELETE SET NULL;

-- Preserve legacy flag for migration helper UI, then drop the original
-- DEBITO CON SCADENZA: _legacy_milestone va rimosso in una migration successiva
-- solo dopo: helper UI deployato + conversione completata + almeno un ciclo di release.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS _legacy_milestone boolean DEFAULT false;

UPDATE public.tasks SET _legacy_milestone = milestone WHERE milestone = true;

ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS milestone;

-- RLS
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_select" ON public.project_milestones FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);
CREATE POLICY "ms_insert" ON public.project_milestones FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "ms_update" ON public.project_milestones FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "ms_delete" ON public.project_milestones FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ms_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_ms_org ON public.project_milestones(org_id);
CREATE INDEX IF NOT EXISTS idx_ms_wp ON public.project_milestones(workpackage_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ms ON public.tasks(milestone_id);

-- GRANTs
GRANT ALL ON public.project_milestones TO authenticated;
