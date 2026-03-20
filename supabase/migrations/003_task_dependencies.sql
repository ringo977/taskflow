-- Task dependencies (blocked-by relationship)
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      text NOT NULL,
  task_id     text NOT NULL,
  depends_on_id text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(task_id, depends_on_id)
);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org dependencies"
  ON public.task_dependencies FOR SELECT
  USING (true);

CREATE POLICY "Users can manage org dependencies"
  ON public.task_dependencies FOR ALL
  USING (true);

-- Add recurrence column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence text DEFAULT NULL;

-- Add attachments column (JSONB array) to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
