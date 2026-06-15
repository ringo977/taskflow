-- 048 — Feed iCal personale (sottoscrizione calendario in sola lettura)
--
-- Obiettivo: dare a ogni utente un URL segreto sottoscrivibile da Google/Outlook
-- Calendar che mostra le SUE scadenze (task assegnati + milestone delle sue org).
--
-- I client calendario scaricano l'URL in modo anonimo (niente header auth), quindi
-- l'autenticazione è il token segreto nell'URL. La edge function `calendar-feed`
-- chiama get_calendar_feed() con la service-role key; le RPC qui sono SECURITY
-- DEFINER e NON esposte ad anon/authenticated (no brute-force via PostgREST).

-- ── Token personale sul profilo ─────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendar_token uuid;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_calendar_token
  ON public.profiles (calendar_token) WHERE calendar_token IS NOT NULL;

-- ── Genera (o restituisce) il token dell'utente corrente ────────────────────
CREATE OR REPLACE FUNCTION public.ensure_calendar_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT calendar_token INTO v_token FROM profiles WHERE id = auth.uid();
  IF v_token IS NULL THEN
    v_token := gen_random_uuid();
    UPDATE profiles SET calendar_token = v_token WHERE id = auth.uid();
  END IF;
  RETURN v_token;
END;
$$;

-- ── Rigenera il token (revoca il vecchio URL) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.rotate_calendar_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  UPDATE profiles SET calendar_token = v_token WHERE id = auth.uid();
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_calendar_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_calendar_token() TO authenticated;

-- ── Eventi del feed per un dato token (usata SOLO dalla edge function) ───────
CREATE OR REPLACE FUNCTION public.get_calendar_feed(p_token uuid)
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

  RETURN QUERY
    -- Task assegnati all'utente, non completati, con scadenza
    SELECT 'task-' || t.id,
           t.title,
           t.due_date,
           'task'::text,
           t.project_id
    FROM public.tasks t
    WHERE t.due_date IS NOT NULL
      AND t.done = false
      AND t.assignee_ids @> ARRAY[v_user]::uuid[]
    UNION ALL
    -- Milestone non ancora chiuse delle org dell'utente
    SELECT 'ms-' || m.id::text,
           m.name,
           m.target_date,
           'ms'::text,
           m.project_id
    FROM public.project_milestones m
    WHERE m.target_date IS NOT NULL
      AND m.status IN ('draft', 'pending')
      AND m.org_id IN (SELECT om.org_id FROM org_members om WHERE om.user_id = v_user);
END;
$$;

-- Non esporre ad anon/authenticated: solo la service-role (edge function) la chiama.
REVOKE EXECUTE ON FUNCTION public.get_calendar_feed(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_calendar_feed(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_calendar_feed(uuid) TO service_role;
