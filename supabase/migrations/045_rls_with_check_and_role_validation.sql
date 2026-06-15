-- 045 — Hardening RLS + validazione ruolo nelle RPC admin
--
-- S2) Le policy FOR UPDATE definite in 024/028/031/034/035/037 hanno solo
--     USING (...) e nessun WITH CHECK. Senza WITH CHECK i VALORI della riga
--     aggiornata non sono vincolati: chi può modificare una riga può cambiarne
--     org_id spostandola in un'altra org. Aggiungiamo un WITH CHECK speculare
--     allo USING su ogni policy UPDATE (ALTER POLICY: nessun drop, nessun gap).
--
-- S5) update_org_member_role / add_org_member_by_email non validano p_role:
--     un valore fuori enum bloccherebbe l'utente da tutte le policy. Validiamo
--     il ruolo e proteggiamo l'ultimo admin da declassamento/rimozione.

-- ── S2: WITH CHECK sulle policy UPDATE ──────────────────────────────────────

ALTER POLICY "portfolios update" ON public.portfolios
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "projects update" ON public.projects
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "sections update" ON public.sections
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

ALTER POLICY "tasks update" ON public.tasks
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

ALTER POLICY "subtasks update" ON public.subtasks
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager', 'member'));

-- comments update è ridefinita in 028 (autore o admin/manager)
ALTER POLICY "comments update" ON public.comments
  WITH CHECK (author_id = auth.uid() OR public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "supervision_settings update" ON public.project_supervision_settings
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "deliverables update" ON public.project_deliverables
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "partners_update" ON public.partners
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "project_partners_update" ON public.project_partners
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "wp_update" ON public.project_workpackages
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "ms_update" ON public.project_milestones
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "recurring_controls update" ON public.project_recurring_controls
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));

ALTER POLICY "update_org_members" ON public.org_members
  WITH CHECK (public.get_org_role(org_id) = 'admin');

-- NB: "profiles update own" (002) ha già WITH CHECK (auth.uid() = id) — ok.

-- ── S5: validazione ruolo + protezione ultimo admin ─────────────────────────

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

  IF p_role NOT IN ('admin', 'manager', 'member', 'guest') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  -- Non declassare l'ultimo admin dell'org (eviterebbe il lock-out).
  IF p_role <> 'admin' AND EXISTS (
    SELECT 1 FROM org_members WHERE org_id = p_org_id AND user_id = p_user_id AND role = 'admin'
  ) AND (
    SELECT count(*) FROM org_members WHERE org_id = p_org_id AND role = 'admin'
  ) <= 1 THEN
    RAISE EXCEPTION 'LAST_ADMIN';
  END IF;

  UPDATE org_members SET role = p_role WHERE org_id = p_org_id AND user_id = p_user_id;
END;
$$;

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

  IF p_role NOT IN ('admin', 'manager', 'member', 'guest') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
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

GRANT EXECUTE ON FUNCTION public.update_org_member_role(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_org_member_by_email(text, text, text) TO authenticated;
