-- Join requests: users can request to join an org, admins approve/reject.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.org_join_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     text NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  UNIQUE (org_id, user_id, status)
);

ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "select_own_requests" ON public.org_join_requests FOR SELECT
  USING (user_id = auth.uid());

-- Admins can see requests for their org
CREATE POLICY "select_org_requests" ON public.org_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id = org_join_requests.org_id
        AND om.role = 'admin'
    )
  );

-- Users can insert their own requests
CREATE POLICY "insert_own_request" ON public.org_join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RPC: submit a join request (SECURITY DEFINER to bypass RLS complexities)
CREATE OR REPLACE FUNCTION public.request_join_org(p_org_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check not already a member
  IF EXISTS (SELECT 1 FROM org_members WHERE org_id = p_org_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;
  -- Check no pending request
  IF EXISTS (SELECT 1 FROM org_join_requests WHERE org_id = p_org_id AND user_id = auth.uid() AND status = 'pending') THEN
    RAISE EXCEPTION 'ALREADY_REQUESTED';
  END IF;
  INSERT INTO org_join_requests (org_id, user_id) VALUES (p_org_id, auth.uid());
END;
$$;

-- RPC: approve a join request (admin only)
CREATE OR REPLACE FUNCTION public.approve_join_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req org_join_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM org_join_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
  -- Verify caller is admin of the org
  IF NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = v_req.org_id AND user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  -- Add user to org
  INSERT INTO org_members (org_id, user_id, role) VALUES (v_req.org_id, v_req.user_id, 'member')
    ON CONFLICT (org_id, user_id) DO NOTHING;
  -- Mark request as approved
  UPDATE org_join_requests SET status = 'approved', resolved_by = auth.uid(), resolved_at = now()
    WHERE id = p_request_id;
END;
$$;

-- RPC: reject a join request (admin only)
CREATE OR REPLACE FUNCTION public.reject_join_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req org_join_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM org_join_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND'; END IF;
  IF NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = v_req.org_id AND user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  UPDATE org_join_requests SET status = 'rejected', resolved_by = auth.uid(), resolved_at = now()
    WHERE id = p_request_id;
END;
$$;

-- RPC: get pending requests for orgs where I'm admin
CREATE OR REPLACE FUNCTION public.get_pending_join_requests()
RETURNS TABLE(id uuid, org_id text, user_id uuid, user_email text, user_name text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jr.id, jr.org_id, jr.user_id,
         COALESCE(p.email, '') AS user_email,
         COALESCE(NULLIF(p.display_name, ''), split_part(COALESCE(p.email, ''), '@', 1), 'User') AS user_name,
         jr.created_at
  FROM org_join_requests jr
  LEFT JOIN profiles p ON p.id = jr.user_id
  WHERE jr.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = jr.org_id AND om.user_id = auth.uid() AND om.role = 'admin'
    )
  ORDER BY jr.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.request_join_org(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_join_requests() TO authenticated;
