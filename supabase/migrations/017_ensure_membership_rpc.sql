-- Server-side org membership enrollment.
-- Bypasses RLS to reliably insert new users into org_members.
CREATE OR REPLACE FUNCTION public.ensure_org_membership()
RETURNS TABLE(org_id text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  target_org text;
BEGIN
  -- Return existing memberships if any
  IF EXISTS (SELECT 1 FROM org_members WHERE user_id = uid) THEN
    RETURN QUERY SELECT om.org_id, om.role FROM org_members om WHERE om.user_id = uid;
    RETURN;
  END IF;

  -- Determine target org from user metadata, fallback to 'polimi'
  SELECT COALESCE(
    u.raw_user_meta_data->>'signup_org',
    'polimi'
  ) INTO target_org
  FROM auth.users u WHERE u.id = uid;

  IF target_org IS NULL THEN
    target_org := 'polimi';
  END IF;

  -- Insert membership
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (target_org, uid, 'member')
  ON CONFLICT DO NOTHING;

  -- Also ensure profile exists
  INSERT INTO profiles (id, display_name, email)
  SELECT u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.email
  FROM auth.users u WHERE u.id = uid
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(NULLIF(profiles.display_name, ''), EXCLUDED.display_name),
    email = EXCLUDED.email;

  RETURN QUERY SELECT om.org_id, om.role FROM org_members om WHERE om.user_id = uid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_org_membership() TO authenticated;
