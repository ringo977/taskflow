-- 036: Add start_date to project_workpackages
-- WPs need both start and end dates for timeline/duration representation.

ALTER TABLE public.project_workpackages
  ADD COLUMN IF NOT EXISTS start_date date;
