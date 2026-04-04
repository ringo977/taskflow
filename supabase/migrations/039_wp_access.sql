-- 039: Add access control field to workpackages
--
-- Controls who can edit tasks within a WP:
--   'all'        — any project member (default)
--   'editors'    — project role >= editor
--   'owner_only' — only the WP owner (falls back to 'editors' if owner is a partner)

ALTER TABLE public.project_workpackages
  ADD COLUMN IF NOT EXISTS access text NOT NULL DEFAULT 'all'
  CHECK (access IN ('all', 'editors', 'owner_only'));
