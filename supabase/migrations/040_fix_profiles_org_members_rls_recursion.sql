-- ============================================================
-- Migration 040: Fix RLS recursion on profiles ↔ org_members
-- ============================================================
-- Symptom:
--   SELECT on public.profiles (for any user other than self) returned
--   HTTP 500 ("infinite recursion detected in policy for relation
--   org_members"). This broke:
--     • Assignment persistence: tasks.assignee_ids resolution
--       silently saved [] when profiles query failed, making the
--       optimistic chip vanish on next refetch.
--     • Org directory / sidebar avatars for other users.
--
-- Root cause:
--   Migration 002 created two RLS policies that recurse into each
--   other:
--     profiles "profiles readable by org mates"
--       → EXISTS (SELECT FROM org_members om_self JOIN org_members om_peer ...)
--     org_members "org members see teammate memberships"
--       → EXISTS (SELECT FROM org_members m WHERE m.user_id = auth.uid())
--   The policy on org_members self-references org_members, which
--   triggers its own policy, recursing until Postgres aborts.
--
-- Fix pattern (same as migration 024 for portfolios/projects/tasks):
--   Replace the recursive SELECT inside the policy with a call to
--   a SECURITY DEFINER function, which bypasses RLS when evaluating
--   the membership lookup.
--
-- SAFE TO RUN:
--   • Only policies and helper functions change — no data modified
--   • Idempotent: DROP IF EXISTS before every CREATE
--   • get_org_role() (from 024) is unchanged; we add new helpers
-- ============================================================

-- ── 0. Helpers: membership checks that bypass RLS ─────────────
-- Returns TRUE if the current auth user belongs to the given org.
CREATE OR REPLACE FUNCTION public.is_in_org(p_org_id text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid() AND org_id = p_org_id
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_in_org(text) TO authenticated;

-- Returns TRUE if target_user shares at least one org with the
-- current auth user. Used to gate profiles SELECT for teammates.
CREATE OR REPLACE FUNCTION public.is_org_mate(target_user uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members om_self
    JOIN public.org_members om_peer ON om_self.org_id = om_peer.org_id
    WHERE om_self.user_id = auth.uid()
      AND om_peer.user_id = target_user
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_org_mate(uuid) TO authenticated;


-- ── 1. profiles: replace recursive SELECT policy ──────────────
DROP POLICY IF EXISTS "profiles readable by org mates" ON public.profiles;
CREATE POLICY "profiles readable by org mates"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_org_mate(id)
  );


-- ── 2. org_members: replace recursive SELECT policy ───────────
DROP POLICY IF EXISTS "org members see teammate memberships" ON public.org_members;
CREATE POLICY "org members see teammate memberships"
  ON public.org_members FOR SELECT
  USING (public.is_in_org(org_id));


-- ── 3. org_members write policies: also rewritten ─────────────
-- Migration 006 created insert/update/delete policies with the same
-- self-referencing pattern. Keep the "admin of the org" semantics
-- but route the membership check through is_in_org / get_org_role.
DROP POLICY IF EXISTS "insert_org_members" ON public.org_members;
CREATE POLICY "insert_org_members"
  ON public.org_members FOR INSERT
  WITH CHECK (
    -- Self-enrollment is still allowed (signup flow)
    user_id = auth.uid()
    OR public.get_org_role(org_id) = 'admin'
  );

DROP POLICY IF EXISTS "update_org_members" ON public.org_members;
CREATE POLICY "update_org_members"
  ON public.org_members FOR UPDATE
  USING (public.get_org_role(org_id) = 'admin');

DROP POLICY IF EXISTS "delete_org_members" ON public.org_members;
CREATE POLICY "delete_org_members"
  ON public.org_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.get_org_role(org_id) = 'admin'
  );
