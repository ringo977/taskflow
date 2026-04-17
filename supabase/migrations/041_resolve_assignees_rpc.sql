-- ============================================================
-- Migration 041: RPC to resolve assignee names → UUIDs
-- ============================================================
-- Context:
--   After migration 040 fixed the RLS recursion on profiles, a
--   second class of failures surfaced: HTTP 403 when resolving
--   display_names that belong to users who are project_members
--   but NOT org_members of the current user's org. These users
--   show up in the assignee dropdown (populated from project
--   membership) but the RLS policy on profiles, which is scoped
--   to org mates, correctly refuses direct SELECT access.
--
-- Decision:
--   Do NOT broaden the profiles RLS policy to include project
--   mates — that would expose every profile to everyone who
--   shares a project (much wider read surface than needed).
--
--   Instead: expose a focused SECURITY DEFINER RPC that takes an
--   array of names and returns matching {id, display_name} rows.
--   The client can only *resolve* names it already knows; it
--   cannot enumerate the table.
--
-- SAFE TO RUN:
--   • Creates a function — no schema/data changes
--   • Function is STABLE, read-only, SECURITY DEFINER
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_assignees(p_names text[])
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE p.display_name = ANY(p_names);
$$;

GRANT EXECUTE ON FUNCTION public.resolve_assignees(text[]) TO authenticated;
