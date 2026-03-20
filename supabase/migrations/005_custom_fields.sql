ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS custom_values jsonb DEFAULT '{}'::jsonb;
