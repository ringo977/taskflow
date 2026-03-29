-- Allow all authenticated users to read project_members.
-- Without this, the direct SELECT in fetchProjects returns empty
-- (only SECURITY DEFINER RPCs bypassed the RLS).
-- Run in Supabase Dashboard → SQL Editor → New query

CREATE POLICY "authenticated can read project_members"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (true);
