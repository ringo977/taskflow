-- Add 'manager' to the allowed org_members roles
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE public.org_members ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'guest'));

-- Add 'manager' to project_members roles too (for completeness)
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE public.project_members ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('owner', 'editor', 'viewer', 'member', 'manager'));

-- RPC: get project_id + role pairs for the current user's project memberships
CREATE OR REPLACE FUNCTION public.get_my_project_roles(p_org_id text)
RETURNS TABLE(project_id text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pm.project_id, pm.role
  FROM project_members pm
  JOIN projects p ON p.id = pm.project_id
  WHERE p.org_id = p_org_id AND pm.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_project_roles(text) TO authenticated;

-- Update get_my_project_ids so managers (like members) only see their own projects
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
  -- Non-admins (managers, members, guests) see only projects they belong to
  SELECT pm.project_id
  FROM project_members pm
  JOIN projects p ON p.id = pm.project_id
  WHERE p.org_id = p_org_id AND pm.user_id = auth.uid();
$$;
