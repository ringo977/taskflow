-- Admin-only: permanently delete a user account.
-- Removes from auth.users which cascades to profiles.
-- Also cleans up org_members and project_members.
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  caller_role text;
BEGIN
  IF p_user_id = caller_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  SELECT role INTO caller_role
  FROM org_members
  WHERE user_id = caller_id AND role = 'admin'
  LIMIT 1;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  DELETE FROM org_members WHERE user_id = p_user_id;
  DELETE FROM project_members WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
