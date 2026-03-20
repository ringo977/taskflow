-- Allow clients to subscribe to org_members changes (e.g. admin removes membership).
-- If this errors with "already member of publication", ignore.
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_members;
