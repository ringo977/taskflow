-- Add soft-delete support: deleted_at timestamp instead of hard deletes
DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN deleted_at timestamptz DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.projects ADD COLUMN deleted_at timestamptz DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.portfolios ADD COLUMN deleted_at timestamptz DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index for fast filtering of non-deleted rows
CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted ON public.tasks (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_not_deleted ON public.projects (org_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_portfolios_not_deleted ON public.portfolios (org_id) WHERE deleted_at IS NULL;
