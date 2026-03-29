-- Add extended project fields that the app writes but the DB is missing.
-- Run in Supabase Dashboard → SQL Editor → New query

-- task_templates: JSON array of reusable task templates per project
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS task_templates jsonb DEFAULT '[]'::jsonb;

-- visibility: 'all' (all org members) or 'members' (project members only)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'all';

-- section_access: per-section role overrides { sectionId: { userId: role } }
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS section_access jsonb DEFAULT '{}'::jsonb;

-- forms: embedded forms configuration
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS forms jsonb DEFAULT '[]'::jsonb;

-- rules: automation rules (rule engine)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT '[]'::jsonb;

-- goals: project-level OKRs / goals
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS goals jsonb DEFAULT '[]'::jsonb;

-- created_by: track who created the project (for RLS & audit)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
