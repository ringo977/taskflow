-- List users who signed up but haven't confirmed their email yet.
-- Shows users whose signup_org matches OR who have no signup_org set (legacy signups).
CREATE OR REPLACE FUNCTION public.get_pending_signups(p_org_id text)
RETURNS TABLE(user_id uuid, email text, display_name text, created_at timestamptz, signup_org text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS display_name,
    u.created_at,
    u.raw_user_meta_data->>'signup_org' AS signup_org
  FROM auth.users u
  WHERE u.email_confirmed_at IS NULL
    AND (
      u.raw_user_meta_data->>'signup_org' = p_org_id
      OR u.raw_user_meta_data->>'signup_org' IS NULL
    )
  ORDER BY u.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_pending_signups(text) TO authenticated;

-- Manually confirm a user's email (admin action).
CREATE OR REPLACE FUNCTION public.admin_confirm_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
BEGIN
  -- Verify caller is admin in at least one org
  SELECT role INTO caller_role
  FROM org_members
  WHERE user_id = caller_id AND role = 'admin'
  LIMIT 1;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Only admins can confirm users';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = NOW()
  WHERE id = p_user_id AND email_confirmed_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_confirm_user(uuid) TO authenticated;
