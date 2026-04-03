# Roadmap implementativa — Partners / Teams

> Milestone 1 della roadmap WP + Partners
> Vincolo: segue Consolidation Playbook
> Data: aprile 2026

---

## Scelte architetturali

### Partner come entità org-level

Un partner appartiene all'organizzazione (non al singolo progetto), collegato
ai progetti tramite junction table. Questo permette di riutilizzare lo stesso
partner su più progetti senza duplicazione.

### Struttura dati

```
organizations
  └─ partners (org-level, reusable)
       └─ project_partners (junction: project ↔ partner)

tasks
  └─ partner_id (nullable FK → partners, one-to-one)
```

### Non tocca auth / RLS utente

I partner usano le stesse RLS org-based delle tabelle supervision:
- SELECT: `get_org_role(org_id) IS NOT NULL`
- INSERT/UPDATE/DELETE: `get_org_role(org_id) IN ('admin', 'manager')`

---

## Fase 1A.1 — Migration: `034_partners.sql`

```sql
-- Org-level partners/teams
CREATE TABLE IF NOT EXISTS public.partners (
  id             text PRIMARY KEY DEFAULT ('pt' || extract(epoch from now())::bigint::text),
  org_id         text NOT NULL,
  name           text NOT NULL,
  type           text NOT NULL DEFAULT 'partner'
                   CHECK (type IN ('team','partner','vendor','lab','department','client')),
  contact_name   text,
  contact_email  text,
  notes          text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Junction: project ↔ partner
CREATE TABLE IF NOT EXISTS public.project_partners (
  project_id     text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  partner_id     text NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  role_label     text,
  created_at     timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, partner_id)
);

-- Task-level partner (optional, one-to-one)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS partner_id text REFERENCES partners(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select" ON public.partners FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);
CREATE POLICY "partners_insert" ON public.partners FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "partners_update" ON public.partners FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "partners_delete" ON public.partners FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

CREATE POLICY "project_partners_select" ON public.project_partners FOR SELECT
  USING (EXISTS (SELECT 1 FROM partners p WHERE p.id = partner_id AND public.get_org_role(p.org_id) IS NOT NULL));
CREATE POLICY "project_partners_insert" ON public.project_partners FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM partners p WHERE p.id = partner_id AND public.get_org_role(p.org_id) IN ('admin', 'manager')));
CREATE POLICY "project_partners_update" ON public.project_partners FOR UPDATE
  USING (EXISTS (SELECT 1 FROM partners p WHERE p.id = partner_id AND public.get_org_role(p.org_id) IN ('admin', 'manager')));
CREATE POLICY "project_partners_delete" ON public.project_partners FOR DELETE
  USING (EXISTS (SELECT 1 FROM partners p WHERE p.id = partner_id AND public.get_org_role(p.org_id) IN ('admin', 'manager')));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partners_org ON public.partners(org_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_project ON public.project_partners(project_id);
CREATE INDEX IF NOT EXISTS idx_project_partners_partner ON public.project_partners(partner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_partner ON public.tasks(partner_id);

-- GRANTs
GRANT ALL ON public.partners TO authenticated;
GRANT ALL ON public.project_partners TO authenticated;
```

Stima: 30 min.

---

## Fase 1A.2 — DB adapter: `src/lib/db/partners.js`

Funzioni:
- `fetchOrgPartners(orgId)` — tutti i partner dell'org
- `fetchProjectPartners(projectId)` — partner collegati al progetto (via junction)
- `upsertPartner(orgId, partner)` — crea/aggiorna partner org-level
- `deletePartner(orgId, partnerId, label)` — elimina partner + audit
- `linkPartnerToProject(orgId, projectId, partnerId, roleLabel)` — junction insert
- `unlinkPartnerFromProject(projectId, partnerId)` — junction delete

Pattern: identico a deliverables.js. Audit su ogni write.

Stima: 1.5h.

---

## Fase 1A.3 — Schema Zod: in `src/lib/db/schemas.js`

```javascript
export const PartnerUpsertSchema = z.object({
  id: z.string().optional(),
  name: str(255),
  type: z.enum(['team', 'partner', 'vendor', 'lab', 'department', 'client']).catch('partner'),
  contactName: optStr(255),
  contactEmail: optStr(255),
  notes: optStr(5000),
  isActive: z.boolean().catch(true),
}).passthrough()
```

Stima: 15 min.

---

## Fase 1A.4 — Hook: `src/hooks/usePartners.js`

Espone:
- `orgPartners` — tutti i partner dell'organizzazione
- `projectPartners` — partner collegati al progetto corrente
- `loading`
- `save(partner)` — crea/aggiorna
- `remove(partnerId)`
- `link(projectId, partnerId, roleLabel)` — collega al progetto
- `unlink(projectId, partnerId)` — scollega
- `reload()`

Fetch on mount, recarica quando cambia orgId.

Stima: 1h.

---

## Fase 1A.5 — UI: PartnersPanel in ProjectOverview

Posizione: right sidebar, sotto ProjectMembersPanel.

Due sezioni:
1. **Project Partners** — lista partner collegati al progetto (con link/unlink)
2. **Add partner** — dropdown per collegare un partner org-level esistente
3. **Create new** — form inline per creare un nuovo partner

Ogni riga mostra: nome, tipo badge, contatto, azioni (unlink, edit).

Stima: 2h.

---

## Fase 1A.6 — TaskPanel + AddModal: campo partner

- **TaskPanel**: aggiungere select "Partner/Team" nella sidebar task, sotto Assigned
- **AddModal**: aggiungere select partner opzionale nel form

Il campo mappa a `task.partnerId` → colonna `tasks.partner_id`.

Aggiornare:
- `FIELD_MAP` in tasks.js per includere `partnerId: 'partner_id'`
- `toTask` adapter per mappare `partner_id` → `partnerId`
- `TaskUpsertSchema` per includere `partnerId: z.string().optional().nullable()`

Stima: 1.5h.

---

## Fase 1A.7 — i18n (IT + EN)

~20 chiavi: partner, partners, partnerType, addPartner, removePartner,
linkPartner, unlinkPartner, partnerName, contactName, contactEmail,
partnerNotes, partnerActive, partnerInactive, partnerRole, noPartners,
typeTeam, typePartner, typeVendor, typeLab, typeDepartment, typeClient.

Stima: 15 min.

---

## Fase 1A.8 — Test + bundle + CI

- Unit test adapter (mock Supabase pattern)
- Unit test schema validation
- Build check, bundle budget update
- Verifica CI verde

Stima: 1h.
