-- Fix: if user already had org_members rows (e.g. wrong org first) but signup_org
-- points to another org, add that membership instead of returning early.
CREATE OR REPLACE FUNCTION public.ensure_org_membership()
RETURNS TABLE(org_id text, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  target_org text;
  desired text;
BEGIN
  SELECT NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'signup_org', '')), '')
  INTO desired
  FROM auth.users u WHERE u.id = uid;

  IF NOT EXISTS (SELECT 1 FROM org_members WHERE user_id = uid) THEN
    target_org := COALESCE(desired, 'polimi');
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (target_org, uid, 'member')
    ON CONFLICT DO NOTHING;
  ELSIF desired IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM org_members WHERE user_id = uid AND org_id = desired
  ) THEN
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (desired, uid, 'member')
    ON CONFLICT DO NOTHING;
  END IF;

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
