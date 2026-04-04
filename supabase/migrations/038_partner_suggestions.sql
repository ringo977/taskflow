-- 038: Add partner_suggestions JSONB to projects (template-driven partner suggestions)
--
-- Stores suggested partners from project template. Each suggestion is
-- { name, type, roleLabel }. Once created or dismissed by the user,
-- the entry is removed from the array.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS partner_suggestions jsonb DEFAULT '[]'::jsonb;
