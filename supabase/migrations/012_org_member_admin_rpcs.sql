-- RPC functions for org member management (SECURITY DEFINER to bypass RLS).
-- Replaces direct table operations that fail due to self-referencing RLS policies.

-- Remove a member (admin only)
CREATE OR REPLACE FUNCTION public.remove_org_member(p_org_id text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM org_members WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'CANNOT_REMOVE_SELF';
  END IF;
  DELETE FROM org_members WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$;

-- Update a member's role (admin only)
CREATE OR REPLACE FUNCTION public.update_org_member_role(p_org_id text, p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM org_members WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  UPDATE org_members SET role = p_role WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$;

-- Add a member by email (admin only)
CREATE OR REPLACE FUNCTION public.add_org_member_by_email(p_org_id text, p_email text, p_role text DEFAULT 'member')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM org_members WHERE org_id = p_org_id AND user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  SELECT id INTO v_user_id FROM profiles WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (p_org_id, v_user_id, p_role)
  ON CONFLICT (org_id, user_id) DO NOTHING;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_org_member(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_org_member_role(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_org_member_by_email(text, text, text) TO authenticated;
