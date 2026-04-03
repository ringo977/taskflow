-- ============================================================
-- Migration 032: Recurring governance controls
-- ============================================================
-- Adds recurring controls for supervised projects: periodic
-- checks that can either create a task or show a reminder.
--
-- V1 limitation: controls are evaluated client-side when the
-- Supervision page is opened — no server-side cron.
--
-- SAFE TO RUN: new table only, no existing data touched.
-- ROLLBACK: DROP TABLE project_recurring_controls CASCADE;
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_recurring_controls (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       text        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id           text        NOT NULL,
  title            text        NOT NULL,
  description      text,
  frequency        text        NOT NULL DEFAULT 'weekly'
    CHECK (frequency IN ('weekly', 'monthly', 'custom')),
  custom_interval  int,        -- days, only used when frequency = 'custom'
  next_due_date    date,
  action_type      text        NOT NULL DEFAULT 'reminder_only'
    CHECK (action_type IN ('create_task', 'reminder_only')),
  template_task_data jsonb,    -- task template for create_task action
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.project_recurring_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_controls select"
  ON public.project_recurring_controls FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

CREATE POLICY "recurring_controls insert"
  ON public.project_recurring_controls FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "recurring_controls update"
  ON public.project_recurring_controls FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "recurring_controls delete"
  ON public.project_recurring_controls FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_controls_project ON public.project_recurring_controls(project_id);
CREATE INDEX IF NOT EXISTS idx_recurring_controls_next_due ON public.project_recurring_controls(next_due_date) WHERE active = true;
