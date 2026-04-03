-- Add project_type to projects — enables the optional Project Supervision layer.
-- Default 'standard' means no supervision features; existing projects are unaffected.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'standard';

-- Check constraint as separate statement for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_project_type_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_project_type_check
      CHECK (project_type IN ('standard', 'supervised', 'eu_project'));
  END IF;
END $$;
