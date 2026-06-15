-- 046 — Audit log: integrità (S7)
--
-- Problema: la INSERT policy di 026 permette a qualsiasi membro di inserire
-- righe con user_id/action/diff arbitrari → un membro può forgiare voci di
-- audit attribuendole ad altri utenti. L'append-only (no UPDATE/DELETE) c'è,
-- ma l'integrità dei contenuti no.
--
-- Fix:
--   1) RPC SECURITY DEFINER che forza user_id := auth.uid(), verifica la
--      membership e valida entity_type. È il percorso usato dal client.
--   2) Si stringe la INSERT policy così che, anche per insert diretti, non si
--      possa impersonare un altro utente (user_id deve = auth.uid()).

-- ── 1. RPC di scrittura audit ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.write_audit_entry(
  p_org_id      text,
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_entity_name text DEFAULT NULL,
  p_diff        jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo membri dell'org possono scrivere audit
  IF public.get_org_role(p_org_id) IS NULL THEN
    RAISE EXCEPTION 'NOT_ORG_MEMBER';
  END IF;

  IF p_action IS NULL OR length(p_action) = 0 OR length(p_action) > 100 THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;

  IF p_entity_type IS NULL OR length(p_entity_type) = 0 OR length(p_entity_type) > 50 THEN
    RAISE EXCEPTION 'INVALID_ENTITY_TYPE';
  END IF;

  INSERT INTO public.audit_log (org_id, user_id, action, entity_type, entity_id, entity_name, diff)
  VALUES (p_org_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_entity_name, p_diff);
END;
$$;

GRANT EXECUTE ON FUNCTION public.write_audit_entry(text, text, text, text, text, jsonb) TO authenticated;

-- ── 2. Hardening della INSERT policy (no impersonation) ─────────────────────
DROP POLICY IF EXISTS "audit_log insert" ON public.audit_log;
CREATE POLICY "audit_log insert"
  ON public.audit_log FOR INSERT
  WITH CHECK (
    public.get_org_role(org_id) IS NOT NULL
    AND user_id = auth.uid()
  );
