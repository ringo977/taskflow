-- RPC function to get the current user's org memberships.
-- Uses SECURITY DEFINER to bypass RLS, so the client can always read its own roles.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_my_memberships()
RETURNS TABLE(org_id text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT om.org_id, om.role
  FROM public.org_members om
  WHERE om.user_id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_memberships() TO authenticated;
