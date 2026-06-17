-- 049 — Calendar feed: scope per organizzazione
--
-- Fix: get_calendar_feed(token) restituiva le scadenze di TUTTE le org
-- dell'utente insieme. Per chi sta in più org (es. BiomimX + Polimi) i
-- calendari si mischiavano. Aggiungiamo un parametro org opzionale: se passato,
-- il feed è limitato a quell'org (previa verifica di appartenenza). Se NULL,
-- comportamento invariato (tutte le org).

DROP FUNCTION IF EXISTS public.get_calendar_feed(uuid);

CREATE OR REPLACE FUNCTION public.get_calendar_feed(p_token uuid, p_org text DEFAULT NULL)
RETURNS TABLE (uid text, summary text, starts date, kind text, project_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  SELECT id INTO v_user FROM profiles WHERE calendar_token = p_token;
  IF v_user IS NULL THEN
    RETURN;  -- token sconosciuto → feed vuoto
  END IF;

  -- Se è richiesta un'org specifica, l'utente deve esserne membro.
  IF p_org IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM org_members WHERE user_id = v_user AND org_id = p_org
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT 'task-' || t.id,
           t.title,
           t.due_date,
           'task'::text,
           t.project_id
    FROM public.tasks t
    WHERE t.due_date IS NOT NULL
      AND t.done = false
      AND t.assignee_ids @> ARRAY[v_user]::uuid[]
      AND (p_org IS NULL OR t.org_id = p_org)
    UNION ALL
    SELECT 'ms-' || m.id::text,
           m.name,
           m.target_date,
           'ms'::text,
           m.project_id
    FROM public.project_milestones m
    WHERE m.target_date IS NOT NULL
      AND m.status IN ('draft', 'pending')
      AND m.org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = v_user)
      AND (p_org IS NULL OR m.org_id = p_org);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_calendar_feed(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_calendar_feed(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_calendar_feed(uuid, text) TO service_role;
