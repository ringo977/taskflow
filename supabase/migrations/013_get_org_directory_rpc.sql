-- RPC to fetch all org members with profile data, bypassing RLS.
-- Returns the full directory for an organization.
CREATE OR REPLACE FUNCTION public.get_org_directory(p_org_id text)
RETURNS TABLE(user_id uuid, role text, display_name text, email text, color text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT om.user_id, om.role,
         COALESCE(p.display_name, split_part(p.email, '@', 1), 'User') AS display_name,
         COALESCE(p.email, '') AS email,
         COALESCE(p.color, '#378ADD') AS color
  FROM org_members om
  LEFT JOIN profiles p ON p.id = om.user_id
  WHERE om.org_id = p_org_id
  ORDER BY display_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_org_directory(text) TO authenticated;
