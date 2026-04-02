-- ============================================================
-- Migration 026: Audit log
-- ============================================================
-- Append-only table that records every significant action
-- performed by authenticated users. Designed for compliance,
-- forensics, and "who changed what and when?" queries.
--
-- Schema decisions:
--   user_id     — auth.uid() at write time (never changes)
--   entity_name — denormalized display name (task title, etc.)
--                 so logs remain readable even if entity is deleted
--   diff        — jsonb snapshot of what changed: { field, from, to }
--                 or { created: { title, who, pri, due } } for creates
--
-- SAFE TO RUN: new table only, no existing data touched.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          bigserial    PRIMARY KEY,
  org_id      text         NOT NULL,
  user_id     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text         NOT NULL,  -- 'task_created' | 'task_updated' | 'task_deleted'
                                      -- 'task_completed' | 'task_assigned'
                                      -- 'comment_added' | 'comment_deleted'
                                      -- 'member_role_changed'
  entity_type text         NOT NULL,  -- 'task' | 'comment' | 'member'
  entity_id   text         NOT NULL,  -- task.id, comment.id, user_id etc.
  entity_name text,                   -- denormalized: task title, user display name
  diff        jsonb,                  -- { field, from, to } or { created: {...} }
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
-- Primary access pattern: recent activity for an org
CREATE INDEX IF NOT EXISTS idx_audit_log_org_time
  ON public.audit_log (org_id, created_at DESC);

-- Secondary: full history for a specific entity
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id, created_at DESC);

-- Tertiary: activity by a specific user
CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON public.audit_log (user_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Any org member can read their org's audit log
CREATE POLICY "audit_log select"
  ON public.audit_log FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);

-- Any org member can write (INSERT only — log is append-only)
CREATE POLICY "audit_log insert"
  ON public.audit_log FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IS NOT NULL);

-- Nobody can UPDATE or DELETE audit entries
-- (no UPDATE/DELETE policies = those operations are always denied)
