# Roadmap implementativa — Milestone strutturate

> Fase 3 della roadmap WP + Partners + Milestones
> Vincolo: segue Consolidation Playbook
> Data: aprile 2026

---

## Contesto

TaskFlow oggi ha un flag booleano `milestone` sui task (diamante nelle card) senza struttura. Le milestone reali dei progetti EU/supervisionati hanno: nome, data target, responsabile, means of verification, e task collegati. Questa roadmap sostituisce il flag con un'entità strutturata.

---

## Scelte architetturali

### Milestone come entità strutturata

Le milestone diventano una tabella dedicata `project_milestones`. Ogni milestone ha un codice, un nome, una descrizione (means of verification), una data target (singola — il momento di raggiungimento previsto), e un owner tipizzato.

### Scope: project-level con WP opzionale

Una milestone appartiene a un progetto. Opzionalmente può essere collegata a un WP (`workpackage_id` nullable). Questo permette sia milestone di progetto (standalone) che milestone dentro un WP.

### Relazione task ↔ milestone: collegamento, non identità

Un task **non è** una milestone. La milestone è l'entità vera — il punto di verifica con data, owner, e means of verification. I task sono **collegati** a una milestone: contribuiscono al suo raggiungimento. Il campo `tasks.milestone_id` indica "questo task contribuisce alla milestone X", non "questo task è la milestone X".

Questo è importante per evitare che in futuro team e UI trattino task e milestone come quasi la stessa cosa. Il diamante nelle card indica "task collegato a una milestone", non "task che è una milestone".

### Sostituzione del flag booleano

Il campo `tasks.milestone` (boolean) viene rimosso e sostituito da `tasks.milestone_id` (UUID FK → project_milestones). Un task è collegato a una milestone se ha `milestone_id != null`. La migration droppa il vecchio campo.

### Migration UX: helper per riconversione

Il flag booleano non conteneva dati strutturati (nome, data, owner), quindi non è possibile un backfill automatico completo. I task che avevano `milestone=true` perderanno il diamante dopo la migration.

Per mitigare l'attrito, M1 include un **migration helper** nella UI: un pannello one-time che elenca i task che erano flaggati come milestone (tracciati in un campo temporaneo dalla migration) e permette di creare milestone strutturate e ri-associare i task rapidamente. La migration conserva l'informazione in `tasks._legacy_milestone` (boolean, da droppare dopo la conversione) per rendere possibile questo flusso.

**Scadenza del campo temporaneo**: `_legacy_milestone` è debito tecnico con scadenza. Viene rimosso in una migration successiva solo dopo che:
- il migration helper UI è deployato e accessibile,
- la conversione è completata o confermata — cioè almeno una di queste condizioni è vera:
  - zero task con `_legacy_milestone = true` residui (tutti convertiti o ri-associati),
  - dismiss esplicito del pannello helper da parte dell'utente (= "non mi serve, vai pure"),
- almeno un ciclo di release è trascorso dal deploy dell'helper.

Questo evita che il campo temporaneo diventi permanente per inerzia.

Le tre opzioni considerate erano:
1. **Drop secco + messaggio UI** — minimo sforzo, massimo attrito
2. **Migration helper** (scelta) — compromesso pulito: lista task ex-milestone, creazione rapida, nessun dato inventato
3. **Backfill automatico** — rischio di creare milestone placeholder senza significato reale

### Data singola (target_date)

A differenza dei WP (che hanno start_date + due_date), le milestone hanno una sola data: `target_date`. Rappresenta il momento previsto di raggiungimento. Non serve una finestra temporale — una milestone è un punto, non un intervallo.

### Owner tipizzato

Stesso pattern dei WP: `owner_user_id` (UUID FK → auth.users) + `owner_partner_id` (text FK → partners), con CHECK constraint di mutua esclusione. UI con selettore unificato (optgroup Members / Partners).

### Status lifecycle

`draft` → `pending` → `achieved` | `missed`

- **draft**: milestone definita ma non ancora attiva
- **pending**: milestone attiva, in attesa di raggiungimento
- **achieved**: milestone raggiunta
- **missed**: data target superata senza raggiungimento

### Milestone ↔ Deliverable: indipendenti

Le milestone e i deliverable restano entità separate senza relazione diretta. Il campo `linked_milestone_ref` (stringa) esistente sui deliverable resta invariato — in futuro potrà essere convertito in FK se serve.

### ID generation: UUID

Come i WP, le milestone usano `gen_random_uuid()`.

### Struttura dati

```
projects
  └─ project_milestones (project-level, optionally WP-scoped)
       ├── id (UUID), code, name, description
       ├── workpackage_id (nullable FK → project_workpackages)
       ├── owner_user_id (FK auth.users), owner_partner_id (FK partners)
       ├── target_date, status, position
       └── is_active

tasks
  └─ milestone_id (nullable FK → project_milestones)
      (replaces old boolean `milestone` field)
```

### Milestone opzionali

Come i WP, le milestone non sono obbligatorie. Progetti standard continuano a funzionare senza. L'UI mostra il pannello milestone solo se il progetto ne ha almeno una.

### RLS

Stesse policy org-based di WP/partners/deliverables:
- SELECT: `get_org_role(org_id) IS NOT NULL`
- INSERT/UPDATE/DELETE: `get_org_role(org_id) IN ('admin', 'manager')`

---

## Milestone 1 — Foundation (data layer + UI base)

### M1.1 — Migration: `037_milestones.sql`

```sql
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id           text NOT NULL,
  workpackage_id   uuid REFERENCES project_workpackages(id) ON DELETE SET NULL,
  code             text NOT NULL,              -- "MS1", "MS2", etc.
  name             text NOT NULL,
  description      text,                       -- means of verification
  owner_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_partner_id text REFERENCES partners(id) ON DELETE SET NULL,
  target_date      date,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','pending','achieved','missed')),
  position         int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  CONSTRAINT ms_single_owner CHECK (
    NOT (owner_user_id IS NOT NULL AND owner_partner_id IS NOT NULL)
  )
);

-- Replace boolean milestone flag with structured FK
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS milestone_id uuid
    REFERENCES project_milestones(id) ON DELETE SET NULL;

-- Preserve legacy flag for migration helper UI, then drop the original
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS _legacy_milestone boolean DEFAULT false;

UPDATE public.tasks SET _legacy_milestone = milestone WHERE milestone = true;

ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS milestone;

-- DEBITO CON SCADENZA: _legacy_milestone va rimosso in una migration successiva
-- solo dopo: helper UI deployato + conversione completata + almeno un ciclo di release.

-- RLS
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_select" ON public.project_milestones FOR SELECT
  USING (public.get_org_role(org_id) IS NOT NULL);
CREATE POLICY "ms_insert" ON public.project_milestones FOR INSERT
  WITH CHECK (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "ms_update" ON public.project_milestones FOR UPDATE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));
CREATE POLICY "ms_delete" ON public.project_milestones FOR DELETE
  USING (public.get_org_role(org_id) IN ('admin', 'manager'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ms_project ON public.project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_ms_org ON public.project_milestones(org_id);
CREATE INDEX IF NOT EXISTS idx_ms_wp ON public.project_milestones(workpackage_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ms ON public.tasks(milestone_id);

-- GRANTs
GRANT ALL ON public.project_milestones TO authenticated;
```

Stima: 30 min.

### M1.2 — DB adapter: `src/lib/db/milestones.js`

Pattern: identico a workpackages.js.

```
fetchMilestones(projectId)              → milestone del progetto, ordinate per position
upsertMilestone(orgId, projectId, ms)   → crea/aggiorna + audit
deleteMilestone(orgId, msId, label)     → elimina + audit
reorderMilestones(orgId, projectId, orderedIds) → bulk position update
```

Nota: `fetchOrgMilestones(orgId)` (fetch cross-progetto per dashboard/reporting) è differita a M3, quando il widget dashboard ne avrà effettivamente bisogno. Non serve in M1.

Transformer `toMilestone`: snake_case → camelCase.

Stima: 1.5h.

### M1.3 — Schema Zod: `MilestoneUpsertSchema`

```javascript
export const MilestoneUpsertSchema = z.object({
  id:             uuid.optional(),
  projectId:      z.string().optional(),
  workpackageId:  uuid.optional().nullable(),
  code:           str(50),                    // "MS1", "MS2"
  name:           str(255),
  description:    optStr(5000),               // means of verification
  ownerUserId:    uuid.optional().nullable(),  // FK auth.users
  ownerPartnerId: z.string().optional().nullable(), // FK partners
  targetDate:     isoDate,
  status:         z.enum(['draft','pending','achieved','missed']).catch('draft'),
  position:       z.number().int().min(0).catch(0),
  isActive:       z.boolean().catch(true),
}).passthrough().refine(
  d => !(d.ownerUserId && d.ownerPartnerId),
  { message: 'Milestone can have at most one owner (user or partner, not both)' }
)
```

Aggiungere `milestoneId: uuid.optional().nullable()` a TaskUpsertSchema e TaskPatchSchema.
Rimuovere il campo `milestone: z.boolean()` dai task schema.

Stima: 15 min.

### M1.4 — Hook: `useMilestones(orgId, projectId)`

```
milestones        — lista milestone del progetto corrente
loading
save(ms)          — crea/aggiorna
remove(msId)      — elimina
reorder(orderedIds) — riordina
reload()
```

Pattern identico a useWorkpackages.

Stima: 1h.

### M1.5 — Adapter + FIELD_MAP update

In `adapters.js`: sostituire `milestone: r.milestone ?? false` con `milestoneId: r.milestone_id ?? null`.
In `tasks.js`: aggiornare FIELD_MAP e upsertTask row.

**Breaking change**: i componenti che leggevano `task.milestone` (booleano) devono passare a `task.milestoneId` (UUID o null). Da aggiornare: TaskCard (diamante), BoardView, ListView, exportCsv, reportPdf.

**Rollout atomico obbligatorio**: migration SQL + adapter + schema + UI devono andare nello stesso merge/release. Un deploy parziale (es. migration applicata ma adapter vecchio) rompe l'app. M1.1–M1.5 vanno trattati come blocco indivisibile.

Stima: 30 min.

### M1.6 — UI: MilestonesPanel in ProjectOverview

Posizione: area principale della overview, dopo WorkpackagesPanel.

Funzionalità:
- Lista milestone con: code badge, nome, WP di appartenenza (se presente), owner, target date, status badge
- Inline create/edit form con selettore owner unificato + selettore WP opzionale
- Click su milestone → espande dettagli (description/means of verification) + lista task collegati
- Status color coding: draft=grigio, pending=blu, achieved=verde, missed=rosso
- Progress bar calcolata dai task collegati (done/total)

Stima: 3h.

### M1.7 — TaskPanel + AddModal: campo Milestone

- **TaskPanel**: select "Milestone" nella meta grid, dopo WP. Mostra solo milestone del progetto corrente.
- **AddModal**: select milestone opzionale nel form.
- Rimuovere il checkbox/toggle "milestone" dal TaskPanel (sostituito dal selettore).

Stima: 1h.

### M1.8 — TaskCard: diamante → milestone strutturata

Il diamante oggi si basa su `task.milestone === true`. Va aggiornato a `task.milestoneId != null` (significato: "task collegato a una milestone", non "task è una milestone"). Il badge può mostrare il codice della milestone (es. "MS1") invece del semplice diamante, oppure mantenere il diamante con tooltip del codice.

### M1.9 — Migration helper UI

Pannello temporaneo (visibile solo se esistono task con `_legacy_milestone = true`) che:
- Elenca i task che avevano il vecchio flag milestone
- Permette di creare milestone strutturate inline
- Permette di ri-associare i task alla milestone appena creata con un click
- Mostra un contatore "X task da convertire" che si azzera man mano
- Si nasconde automaticamente quando tutti i task legacy sono stati convertiti o dismissati

Stima: 30 min.

### M1.10 — i18n (IT + EN)

~25 chiavi: milestone, milestones, addMilestone, msCode, msName, msDescription, msOwner, msTargetDate, msStatus, noMilestones, noMs, editMs, deleteMs, assignToMs, msStatusDraft, msStatusPending, msStatusAchieved, msStatusMissed, msProgress, msTasks, selectMilestone, msMeansOfVerification, msWorkpackage.

Stima: 15 min.

---

## Milestone 2 — Filters + Views integration

### M2.1 — FilterBar: filtro Milestone

Aggiungere `ms: 'all'` a EMPTY filters. Dropdown dinamico popolato dalle milestone del progetto corrente.

### M2.2 — filters.js: logica filtro Milestone

```javascript
if (filters.ms && filters.ms !== 'all') {
  if ((task.milestoneId ?? null) !== filters.ms) return false
}
```

### M2.3 — ListView: badge Milestone

Badge con code milestone (es. "MS1") colorato per status, posizionato dopo WP badge. Colore: verde (`var(--c-success)`) per distinguere da WP (viola) e partner (brand blue).

### M2.4 — BoardView: Milestone badge in TaskCard

Badge compatto milestone code nel meta row della card.

Stima totale M2: 3h.

---

## Milestone 3 — Reporting

### M3.1 — Selectors: `computeTasksPerMilestone`

Pattern identico a `computeTasksPerWorkpackage`. Ritorna per ogni milestone: code, name, status, open, done, overdue.

### M3.2 — Dashboard widget: `tasksMilestone`

Bar chart con task aperti/completati per milestone. Colore verde. Registrare in dashboardConfig.js.

### M3.3 — CSV export: colonne Milestone

Lazy-load fetchMilestones at export time. Colonne: "MS Code", "MS Name".

### M3.4 — PDF report: sezione Milestone

Sezione "Milestone progress" con tabella: code, name, WP, target date, status, completamento.

### M3.5 — ProjectOverview: Milestone summary card

Card riassuntiva nella sidebar: totale, achieved, pending, missed. Mini progress.

Stima totale M3: 3h.

---

## Milestone 4 — Hardening

### M4.1 — Unit test: milestones adapter (mock Supabase)

Seguire pattern workpackages.test.js.

### M4.2 — Unit test: MilestoneUpsertSchema + milestoneId su task schemas

### M4.3 — Unit test: computeTasksPerMilestone selector

### M4.4 — Unit test: Milestone filter in filters.js

### M4.5 — Manual section: manualContent + manualI18n

Sezione "Milestone" con spiegazione concetto, creazione, means of verification, assegnamento task, filtri, report.

### M4.6 — CONSOLIDATION.md + MILESTONES_ROADMAP.md update

### M4.7 — Bundle budget update + final build/test/lint

Stima totale M4: 2h.

---

## Riepilogo stima

| Milestone | Descrizione | Stima |
|---|---|---|
| M1 | Foundation: migration, adapter, hook, UI, TaskPanel, TaskCard, i18n | ~8.5h |
| M2 | Filters + views integration (badge, filter) | ~3h |
| M3 | Reporting: dashboard, CSV, PDF, overview | ~3h |
| M4 | Hardening: test, manual, docs | ~2h |
| **Totale** | | **~16.5h** |

---

## Differenze chiave rispetto a Workpackages

| Aspetto | Workpackages | Milestones |
|---|---|---|
| Scope | Project-level, fisso | Project-level con WP opzionale |
| Temporal model | Intervallo (start_date + due_date) | Punto (target_date) |
| Status lifecycle | draft → active → review → complete/delayed | draft → pending → achieved/missed |
| Task relation | FK `workpackage_id` su tasks | FK `milestone_id` su tasks (sostituisce flag booleano) |
| Semantica | Raggruppamento strutturale del lavoro | Punto di verifica/obiettivo |
| Description | Generica | Means of verification |
| Colore UI | Viola | Verde |

---

## Impatto su codice esistente (breaking change)

La rimozione del campo `tasks.milestone` (boolean) richiede aggiornamenti in:

| File | Campo vecchio | Campo nuovo |
|---|---|---|
| `adapters.js` | `milestone: r.milestone ?? false` | `milestoneId: r.milestone_id ?? null` |
| `tasks.js` (FIELD_MAP) | `milestone: 'milestone'` | `milestoneId: 'milestone_id'` |
| `TaskCard.jsx` | `task.milestone && ◆` | `task.milestoneId && ◆` (= "task collegato a MS") |
| `schemas.js` | `milestone: z.boolean()` | `milestoneId: uuid.optional().nullable()` |
| Eventuali test che usano `milestone: true` | — | Da aggiornare a `milestoneId: 'ms-uuid'` |

---

## Estensioni future (post-M4)

- **Milestone → Deliverable link**: convertire `linked_milestone_ref` (stringa) in FK strutturato verso `project_milestones`
- **Milestone timeline view**: visualizzazione temporale delle milestone con diamanti su una linea del tempo
- **Milestone notifications**: alert quando una milestone si avvicina alla target_date senza essere achieved
- **Milestone templates**: set di milestone predefiniti per tipologie di progetto (EU, agile, waterfall)

---

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Breaking change flag → FK | Rollout atomico: migration + adapter + schema + UI nello stesso merge/release (M1.1–M1.5 indivisibili); campo `_legacy_milestone` preserva l'informazione |
| `_legacy_milestone` diventa permanente per inerzia | Trattato come debito con scadenza: rimosso solo dopo helper deployato + conversione completata + un ciclo di release |
| Task perdono diamante dopo migration | Migration helper UI (M1.9): lista task ex-milestone, creazione rapida MS, ri-associazione con un click |
| Confusione milestone vs deliverable | Tooltip/help: "Milestone = punto di verifica, Deliverable = output consegnabile" |
| Overhead per progetti semplici | Pannello nascosto se nessuna milestone esiste; opt-in |
