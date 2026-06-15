-- 047 — Enforcement MFA lato server (S1)
--
-- Problema: dopo il login con password la sessione Supabase è valida (aal1).
-- La 2FA era solo un gate nella UI: chiamando le API direttamente con la
-- sessione aal1 si accedeva ai dati comunque. Qui si richiede aal2 a livello
-- di RLS.
--
-- Sicurezza vs lock-out: usiamo policy RESTRICTIVE (in AND con quelle esistenti)
-- che richiedono aal2 SOLO per gli utenti che hanno una MFA verificata
-- arruolata. Chi non ha MFA non viene bloccato (nessun lock-out). Pattern
-- ufficiale Supabase.
--
-- Non applicato a: org_members / profiles (servono nel bootstrap prima del
-- completamento MFA, e ensure_org_membership passa comunque da RPC SECURITY
-- DEFINER), e keepalive (accesso anon).
--
-- ⚠️ Verifica dopo l'apply: fai login completando il TOTP e controlla di
-- vedere/normalmente modificare i dati (la tua sessione sarà aal2).

-- ── Helper: la sessione corrente soddisfa il requisito AAL? ─────────────────
CREATE OR REPLACE FUNCTION public.has_required_aal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    (auth.jwt() ->> 'aal') = 'aal2'
    OR NOT EXISTS (
      SELECT 1 FROM auth.mfa_factors
      WHERE user_id = auth.uid() AND status = 'verified'
    );
$$;

GRANT EXECUTE ON FUNCTION public.has_required_aal() TO authenticated;

-- ── Policy RESTRICTIVE per ogni tabella dati ────────────────────────────────
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tasks', 'subtasks', 'sections', 'comments', 'task_dependencies',
    'projects', 'portfolios',
    'project_workpackages', 'project_milestones',
    'partners', 'project_partners',
    'project_deliverables', 'deliverable_tasks',
    'project_supervision_settings', 'project_recurring_controls',
    'audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Salta le tabelle non presenti in questo DB (es. deliverable_tasks)
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;
    EXECUTE format('DROP POLICY IF EXISTS "require_aal2" ON public.%I;', t);
    EXECUTE format($f$
      CREATE POLICY "require_aal2" ON public.%I
        AS RESTRICTIVE
        FOR ALL
        TO authenticated
        USING (public.has_required_aal())
        WITH CHECK (public.has_required_aal());
    $f$, t);
  END LOOP;
END $$;
