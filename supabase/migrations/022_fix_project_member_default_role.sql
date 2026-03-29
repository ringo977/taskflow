-- Fix add_project_member RPC: change default role from 'member' to 'editor'
-- The project_members table only allows 'owner', 'editor', 'viewer'.
-- Run in Supabase Dashboard → SQL Editor → New query

CREATE OR REPLACE FUNCTION public.add_project_member(p_project_id text, p_user_id uuid, p_role text DEFAULT 'editor')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (p_project_id, p_user_id, p_role)
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;
