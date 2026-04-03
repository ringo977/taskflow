-- Migration 029: Add composite indexes for frequent lookup patterns
--
-- fetchTasks loads subtasks, comments, and dependencies in parallel via
-- .eq('org_id', orgId). Each of those tables also gets filtered by task_id
-- in _persistRelated (upsert/delete cycles). Without indexes, Postgres does
-- sequential scans on these tables for every task operation.
--
-- sections are filtered by (org_id, project_id) on every project open.

-- ── Child tables: task_id lookups ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id
  ON public.subtasks (task_id);

CREATE INDEX IF NOT EXISTS idx_subtasks_org_id
  ON public.subtasks (org_id);

CREATE INDEX IF NOT EXISTS idx_comments_task_id
  ON public.comments (task_id);

CREATE INDEX IF NOT EXISTS idx_comments_org_id
  ON public.comments (org_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id
  ON public.task_dependencies (task_id);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_org_id
  ON public.task_dependencies (org_id);

-- ── Sections: (org_id, project_id) composite ──────────────────

CREATE INDEX IF NOT EXISTS idx_sections_org_project
  ON public.sections (org_id, project_id);

-- ── Tasks: project_id for per-project queries (trash, single-project fetch)

CREATE INDEX IF NOT EXISTS idx_tasks_project_id
  ON public.tasks (project_id);

-- ── Project members: project_id for member badge lookups ──────

CREATE INDEX IF NOT EXISTS idx_project_members_project_id
  ON public.project_members (project_id);
