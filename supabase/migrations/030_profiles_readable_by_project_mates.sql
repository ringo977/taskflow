-- ============================================================
-- Migration 030: Extend profiles SELECT to project mates
-- ============================================================
-- Context:
--   After 028 (RLS recursion fix) and 029 (resolve_assignees RPC),
--   task assignment via the UI succeeded but the chip vanished on
--   the next refetch. Root cause traced to `fetchTasks` doing a
--   direct `SELECT id, display_name FROM profiles` to build the
--   assignee_ids → display_name lookup. For users who are
--   project_members but not org_members, that SELECT is filtered
--   out by the "org mates only" RLS policy on profiles (→ 403),
--   so their display_name comes back null and `task.who` ends up
--   empty after the refetch.
--
-- Decision:
--   Broaden the profiles SELECT policy to also allow reads for
--   users who share at least one project with the current user.
--   Security reasoning: if you can see a teammate's assignments
--   and comments on a shared project, being able to read their
--   display_name is a subset of information already accessible
--   through project membership.
--
-- SAFE TO RUN:
--   • Only policies and a helper function change — no data
--   • Idempotent: DROP IF EXISTS before every CREATE
--   • is_org_mate / is_in_org (from 028) unchanged
-- ============================================================

-- ── 0. Helper: project-level membership check (bypasses RLS) ──
CREATE OR REPLACE FUNCTION public.is_project_mate(target_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm_self
    JOIN public.project_members pm_peer ON pm_self.project_id = pm_peer.project_id
    WHERE pm_self.user_id = auth.uid()
      AND pm_peer.user_id = target_user
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_project_mate(uuid) TO authenticated;


-- ── 1. profiles: extend SELECT policy ─────────────────────────
DROP POLICY IF EXISTS "profiles readable by org mates" ON public.profiles;
DROP POLICY IF EXISTS "profiles readable by org or project mates" ON public.profiles;
CREATE POLICY "profiles readable by org or project mates"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_org_mate(id)
    OR public.is_project_mate(id)
  );
