-- Project-level membership: controls who can see which projects/tasks.
-- Org admins can see all projects. Regular members only see projects they belong to.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.project_members (
  project_id text NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'editor', 'viewer')),
  added_at   timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- RPC: get project IDs the current user can access in a given org
-- (project member OR org admin)
CREATE OR REPLACE FUNCTION public.get_my_project_ids(p_org_id text)
RETURNS TABLE(project_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Org admins see all projects
  SELECT p.id AS project_id
  FROM projects p
  WHERE p.org_id = p_org_id
    AND EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = p_org_id AND om.user_id = auth.uid() AND om.role = 'admin'
    )
  UNION
  -- Regular members see only projects they belong to
  SELECT pm.project_id
  FROM project_members pm
  JOIN projects p ON p.id = pm.project_id
  WHERE p.org_id = p_org_id AND pm.user_id = auth.uid();
$$;

-- RPC: get members of a project (with profile info)
CREATE OR REPLACE FUNCTION public.get_project_members(p_project_id text)
RETURNS TABLE(user_id uuid, role text, user_name text, user_email text, color text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pm.user_id, pm.role,
         COALESCE(NULLIF(pr.display_name, ''), split_part(COALESCE(pr.email, ''), '@', 1), 'User') AS user_name,
         COALESCE(pr.email, '') AS user_email,
         COALESCE(pr.color, '#378ADD') AS color
  FROM project_members pm
  LEFT JOIN profiles pr ON pr.id = pm.user_id
  WHERE pm.project_id = p_project_id
  ORDER BY pm.role, user_name;
$$;

-- RPC: add a user to a project
CREATE OR REPLACE FUNCTION public.add_project_member(p_project_id text, p_user_id uuid, p_role text DEFAULT 'member')
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

-- RPC: remove a user from a project
CREATE OR REPLACE FUNCTION public.remove_project_member(p_project_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM project_members WHERE project_id = p_project_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_project_ids(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_members(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_project_member(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_project_member(text, uuid) TO authenticated;

-- Backfill: add all existing task assignees as project members
-- First we need to map assignee names to user IDs via profiles
INSERT INTO project_members (project_id, user_id, role)
SELECT DISTINCT t.project_id, pr.id, 'member'
FROM tasks t
JOIN profiles pr ON pr.display_name = t.assignee_name OR pr.email LIKE split_part(t.assignee_name, ' ', 1) || '%'
WHERE t.assignee_name IS NOT NULL AND t.assignee_name != ''
ON CONFLICT DO NOTHING;
