-- org_members: allow self-enrollment and admin management
-- Run in Supabase SQL Editor.

-- Self-enrollment (new user joins default org) + admin inviting others
DROP POLICY IF EXISTS "insert_org_members" ON public.org_members;
CREATE POLICY "insert_org_members"
  ON public.org_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id = org_members.org_id
        AND om.role = 'admin'
    )
  );

-- Admin can update roles
DROP POLICY IF EXISTS "update_org_members" ON public.org_members;
CREATE POLICY "update_org_members"
  ON public.org_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id = org_members.org_id
        AND om.role = 'admin'
    )
  );

-- Admin can remove members
DROP POLICY IF EXISTS "delete_org_members" ON public.org_members;
CREATE POLICY "delete_org_members"
  ON public.org_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id = org_members.org_id
        AND om.role = 'admin'
    )
  );

-- Backfill: ensure existing auth users have a profiles row
INSERT INTO public.profiles (id, display_name, email)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email
FROM auth.users
ON CONFLICT (id) DO NOTHING;
