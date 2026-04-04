# Roadmap implementativa — Workpackages

> Fase 2 della roadmap WP + Partners
> Vincolo: segue Consolidation Playbook
> Data: aprile 2026

---

## Contesto

TaskFlow oggi ha una gerarchia piatta: **Project → Task** (con Section come workflow state). I Workpackage (WP) aggiungono un livello di raggruppamento strutturale: **Project → WP → Task**.

Questo serve ai progetti supervisionati/EU dove i task sono organizzati per pacchetti di lavoro (WP1: Analisi, WP2: Sviluppo, WP3: Testing, ecc.), ciascuno con responsabile, scadenza e stato proprio.

---

## Scelte architetturali

### WP ≠ Section

Le Section rappresentano lo **stato di workflow** (Backlog, In Progress, Done). I WP rappresentano la **struttura di progetto** (divisione logica del lavoro). Un task ha sempre una section E opzionalmente un WP. Non si fondono.

### WP come entità project-level

A differenza dei Partner (org-level), i WP appartengono al singolo progetto. Ogni progetto ha i propri WP, non condivisi tra progetti.

### Relazione 1:1 diretta (no junction)

Un task appartiene a zero o un WP. Come per `partner_id`, si aggiunge `workpackage_id` nullable direttamente sulla tabella tasks. Niente junction table — la semplicità vince.

### Owner tipizzato

Il campo `owner` non è free text. È un campo nullable con due possibili riferimenti:
- `owner_user_id` (UUID, FK → profiles) — un membro dell'org
- `owner_partner_id` (text, FK → partners) — un partner

Un WP ha al massimo un owner. La UI mostra un singolo selettore "Responsabile" che permette di scegliere tra membri dell'org e partner collegati al progetto. Se nessuno dei due è impostato, il WP non ha owner.

Questo evita il pattern free-text usato nei deliverables (che è il pezzo più legacy di quel modello) e sfrutta le entità strutturate già esistenti.

### ID generation: UUID

I WP usano UUID standard (`gen_random_uuid()`) come PK, allineati al resto del sistema. Niente ID custom con prefisso — coerenza con il pattern di sicurezza e solidità stabilito nelle migrazioni recenti.

### Struttura dati

```
projects
  └─ project_workpackages (project-level, ordered)
       ├── id (UUID), code, name, description
       ├── owner_user_id (FK profiles), owner_partner_id (FK partners)
       ├── due_date, status, position
       └── is_active

tasks
  └─ workpackage_id (nullable FK → project_workpackages)
```

### WP opzionali

I WP non sono obbligatori. Progetti standard continuano a funzionare senza WP. L'UI mostra il pannello WP solo se il progetto ne ha almeno uno (o se l'utente clicca "Aggiungi WP").

### RLS

Stesse policy org-based di partners/deliverables:
- SELECT: `get_org_role(org_id) IS NOT NULL`
- INSERT/UPDATE/DELETE: `get_org_role(org_id) IN ('admin', 'manager')`

---

## Milestone 1 — Foundation (data layer + UI base)

### M1.1 — Migration: `035_workpackages.sql`

```sql
CREATE TABLE IF NOT EXISTS public.project_workpackages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id           text NOT NULL,
  code             text NOT NULL,              -- "WP1", "WP2.1", etc.
  name             text NOT NULL,
  description      text,
  owner_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_partner_id text REFERENCES partners(id) ON DELETE SET NULL,
  due_date         date,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','active','review','complete','delayed')),
  position         int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT wp_single_owner CHECK (
    NOT (owner_user_id IS NOT NULL AND owner_partner_id IS NOT NULL)
  )
);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS workpackage_id uuid
    REFERENCES project_workpackages(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.project_workpackages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wp_select" ON public.project_workpackages FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);
CREATE POLICY "wp_insert" ON public.project_workpackages FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "wp_update" ON public.project_workpackages FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "wp_delete" ON public.project_workpackages FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wp_project ON public.project_workpackages(project_id);
CREATE INDEX IF NOT EXISTS idx_wp_org ON public.project_workpackages(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wp ON public.tasks(workpackage_id);

-- GRANTs
GRANT ALL ON public.project_workpackages TO authenticated;
```

Stima: 30 min.

### M1.2 — DB adapter: `src/lib/db/workpackages.js`

Pattern: identico a deliverables.js + partners.js.

```
fetchWorkpackages(projectId)        → WP del progetto, ordinati per position
upsertWorkpackage(orgId, wp)        → crea/aggiorna + audit
deleteWorkpackage(orgId, wpId, label)  → elimina + audit
reorderWorkpackages(orgId, projectId, orderedIds) → bulk position update
```

Transformer `toWorkpackage`: snake_case → camelCase.

Stima: 1.5h.

### M1.3 — Schema Zod: `WorkpackageUpsertSchema`

```javascript
export const WorkpackageUpsertSchema = z.object({
  id:             uuid.optional(),
  projectId:      z.string(),
  code:           str(50),                    // "WP1", "WP2.1"
  name:           str(255),
  description:    optStr(5000),
  ownerUserId:    uuid.optional().nullable(),    // FK profiles
  ownerPartnerId: z.string().optional().nullable(), // FK partners
  dueDate:        isoDate,
  status:         z.enum(['draft','active','review','complete','delayed']).catch('draft'),
  position:       z.number().int().min(0).catch(0),
  isActive:       z.boolean().catch(true),
}).passthrough().refine(
  d => !(d.ownerUserId && d.ownerPartnerId),
  { message: 'WP can have at most one owner (user or partner, not both)' }
)
```

Aggiungere `workpackageId: uuid.optional().nullable()` a TaskUpsertSchema e TaskPatchSchema.

Stima: 15 min.

### M1.4 — Hook: `useWorkpackages(projectId)`

```
workpackages      — lista WP del progetto corrente
loading
save(wp)          — crea/aggiorna
remove(wpId)      — elimina
reorder(orderedIds) — riordina
reload()
```

Fetch on mount, recarica quando cambia projectId. Pattern identico a usePartners ma scoped a progetto.

Stima: 1h.

### M1.5 — Adapter + FIELD_MAP update

In `adapters.js`: aggiungere `workpackageId: r.workpackage_id ?? null` a `toTask`.
In `tasks.js`: aggiungere `workpackageId: 'workpackage_id'` a FIELD_MAP e `workpackage_id: t.workpackageId ?? null` a upsertTask row.

Stima: 15 min.

### M1.6 — UI: WorkpackagesPanel in ProjectOverview

Posizione: area principale della overview, come card dedicata (non sidebar — i WP meritano più spazio dei partner).

Funzionalità:
- Lista WP con: code badge, nome, owner (avatar membro o badge partner), due date, status badge, barra di progresso (calcolata dai task collegati)
- Inline create/edit form con selettore owner unificato (membri org + partner progetto)
- Drag to reorder (position)
- Click su WP → espande dettagli + lista task collegati
- Status color coding: draft=grigio, active=blu, review=arancio, complete=verde, delayed=rosso
- Constraint UI: impedisce di selezionare sia un user che un partner come owner

Stima: 3h.

### M1.7 — TaskPanel + AddModal: campo WP

- **TaskPanel**: select "Workpackage" nella meta grid, dopo partner. Mostra solo WP del progetto corrente.
- **AddModal**: select WP opzionale nel form.

Stima: 1h.

### M1.8 — i18n (IT + EN)

~25 chiavi: workpackage, workpackages, addWorkpackage, wpCode, wpName, wpOwner, wpStatus, wpDueDate, noWorkpackages, wpDescription, status_draft, status_active, status_review, status_complete, status_delayed, wpProgress, assignToWp, removeFromWp, noWp, editWp, deleteWp, wpPosition, wpActive, wpInactive, wpTasks.

Stima: 15 min.

---

## Milestone 2 — Filters + Views integration

### M2.1 — FilterBar: filtro WP

Aggiungere `wp: 'all'` a EMPTY filters. Dropdown dinamico popolato dai WP del progetto corrente (pattern identico a partner filter).

### M2.2 — filters.js: logica filtro WP

```javascript
if (filters.wp && filters.wp !== 'all') {
  if ((task.workpackageId ?? null) !== filters.wp) return false
}
```

### M2.3 — ListView: colonna/badge WP

Badge con code WP (es. "WP1") colorato per status, posizionato prima del partner badge. Con wpById lookup map.

### M2.4 — BoardView: WP badge in TaskCard

Badge compatto WP code nel meta row della card, prima del partner badge.

Stima totale M2: 3h.

---

## Milestone 3 — Reporting

### M3.1 — Selectors: `computeTasksPerWorkpackage`

Pattern identico a `computeTasksPerPartner`. Ritorna per ogni WP: code, name, open, done, overdue, status.

### M3.2 — Dashboard widget: `tasksWorkpackage`

Bar chart con task aperti/completati per WP. Registrare in dashboardConfig.js.

### M3.3 — CSV export: colonna WP

Lazy-load fetchWorkpackages at export time (pattern partner). Colonne: "WP Code", "WP Name".

### M3.4 — PDF report: sezione WP

Sezione "Workpackage progress" con tabella: code, name, owner, due, status, completamento (barra).

### M3.5 — ProjectOverview: WP progress summary

Card riassuntiva con: totale WP, attivi, completati, in ritardo. Mini progress bar globale.

Stima totale M3: 3h.

---

## Milestone 4 — Hardening

### M4.1 — Unit test: workpackages adapter (mock Supabase)

Seguire pattern partners.test.js.

### M4.2 — Unit test: WorkpackageUpsertSchema + workpackageId su task schemas

### M4.3 — Unit test: computeTasksPerWorkpackage selector

### M4.4 — Unit test: WP filter in filters.js

### M4.5 — Manual section: manualContent + manualI18n

Sezione "Workpackages" con spiegazione concetto, creazione, assegnamento task, filtri, report.

### M4.6 — CONSOLIDATION.md + WORKPACKAGES_ROADMAP.md update

### M4.7 — Bundle budget update + final build/test/lint

Stima totale M4: 2h.

---

## Riepilogo stima

| Milestone | Descrizione | Stima |
|---|---|---|
| M1 | Foundation: migration, adapter, hook, UI, TaskPanel, i18n | ~7.5h |
| M2 | Filters + views integration (badge, no group-by) | ~3h |
| M3 | Reporting: dashboard, CSV, PDF, overview | ~3h |
| M4 | Hardening: test, manual, docs | ~2h |
| **Totale** | | **~15.5h** |

---

## Differenze chiave rispetto a Partners

| Aspetto | Partners | Workpackages |
|---|---|---|
| Scope | Org-level (riusabili tra progetti) | Project-level (specifici per progetto) |
| Junction table | Sì (`project_partners`) | No (FK diretto su tasks) |
| Codice strutturato | No | Sì (`code`: WP1, WP2.1) |
| Status proprio | No (solo isActive) | Sì (draft, active, review, complete, delayed) |
| Ordinamento | No | Sì (`position`) |
| Owner | No (contactName è del partner) | Sì (typed: user o partner, non free text) |
| ID strategy | Text con prefisso (`pt` + epoch) | UUID (`gen_random_uuid()`) |

---

## Estensioni future (post-M4)

Queste funzionalità sono intenzionalmente escluse dalla V1 per evitare complessità prematura. Da valutare dopo aver osservato l'uso reale dei WP:

- **BoardView group-by WP** — raggruppare colonne per WP invece che per section. Richiede che gli utenti abbiano già familiarità con la distinzione WP vs Section, altrimenti crea confusione. Da implementare solo dopo feedback positivo sull'adozione WP.
- **WP nesting** — WP gerarchici (WP1 → WP1.1, WP1.2). Il campo `code` supporta già la notazione puntata, ma la UI è piatta in V1.
- **WP templates** — creare un progetto con set di WP predefiniti (utile per progetti EU con struttura standard).
- **Deliverable ↔ WP linking** — collegare deliverable a un WP specifico (oggi i deliverable sono a livello progetto).

---

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| WP + Section confusione utente | Tooltip/help text chiaro: "WP = struttura, Section = workflow" |
| Overhead UI per progetti semplici | WP panel nascosto se nessun WP esiste; opt-in |
| Performance con molti WP | Position-based ordering + index su project_id |
| Migration su DB con task esistenti | workpackage_id nullable, nessun backfill necessario |
