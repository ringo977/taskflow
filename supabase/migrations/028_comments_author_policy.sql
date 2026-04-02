-- Migration 028: Reinforce comments UPDATE/DELETE policies with author_id
--
-- Migration 024 created these policies before migration 025 added the
-- author_id column to the comments table. We drop and re-create them so
-- Supabase picks up the column correctly and the policies are enforced
-- as intended: comment authors can edit/delete their own comments;
-- org admins and managers can moderate any comment.

DROP POLICY IF EXISTS "comments update" ON public.comments;
DROP POLICY IF EXISTS "comments delete" ON public.comments;

CREATE POLICY "comments update"
  ON public.comments FOR UPDATE
  USING (author_id = auth.uid() OR public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "comments delete"
  ON public.comments FOR DELETE
  USING (author_id = auth.uid() OR public.get_org_role(org_id) IN ('admin', 'manager'));
