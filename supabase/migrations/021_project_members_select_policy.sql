-- Allow authenticated users to read project_members + bulk RPC for fetchProjects.
-- Run in Supabase Dashboard → SQL Editor → New query

-- Grant SELECT access on the table itself
GRANT SELECT ON public.project_members TO authenticated;

-- RLS policy (belt-and-suspenders)
CREATE POLICY IF NOT EXISTS "authenticated can read project_members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (true);

-- Bulk RPC: return all project members with display names.
-- SECURITY DEFINER bypasses RLS — used by fetchProjects for sidebar badges.
CREATE OR REPLACE FUNCTION public.get_all_project_members()
RETURNS TABLE(project_id text, user_id uuid, role text, user_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pm.project_id, pm.user_id, pm.role,
         COALESCE(p.display_name, split_part(COALESCE(p.email, ''), '@', 1), 'User') AS user_name
  FROM project_members pm
  LEFT JOIN profiles p ON p.id = pm.user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_project_members() TO authenticated;
