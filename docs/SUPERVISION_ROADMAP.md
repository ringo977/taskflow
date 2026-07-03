# Roadmap implementativa — Layer Project Supervision

> Riferimento: `taskflow_project_supervision_brief_v3.md`
> Vincolo: segue integralmente il Consolidation Playbook
> Data: aprile 2026

---

## Prerequisiti

Prima di iniziare la fase 1, verificare:

- CI verde su main (lint + test + build + bundle-size)
- Nessun altro modulo funzionale nuovo in corso
- Consolidation Playbook letto e compreso da chi implementa

---

## Fase 0 — Preparazione del terreno (2–3h)

Obiettivo: rendere il core pronto a ospitare il layer senza toccarne la logica.

### 0.1 — Estrazione selector condivisi

**Cosa fare.** Estrarre da `HomeDashboard.jsx` la logica di aggregazione oggi inline e spostarla in `src/utils/selectors.js` (o `src/utils/metrics.js`). I selector da estrarre:

| Selector | Oggi in | Firma target |
|---|---|---|
| `filterOverdue(tasks)` | HomeDashboard L139 | `(tasks) → tasks[]` |
| `filterDueInRange(tasks, from, to)` | HomeDashboard L140-141 | `(tasks, fromISO, toISO) → tasks[]` |
| `buildUserTaskMap(tasks, users)` | HomeDashboard L228-234 | `(tasks, users) → { [name]: tasks[] }` |
| `buildProjectById(projects)` | HomeDashboard L237-241 | `(projects) → { [id]: project }` |
| `computeProjectHealth(tasks, projects)` | HomeDashboard L212-223 | `(tasks, projects) → healthData[]` |
| `computeOverdueByProject(tasks, projects)` | HomeDashboard L347-352 | `(tasks, projects) → overdueData[]` |
| `computeWorkload(tasks, users, threshold)` | HomeDashboard L356-362 | `(tasks, users, n) → workloadData[]` |
| `filterOwnerless(tasks)` | non esiste ancora | `(tasks) → tasks[]` (task senza assignee) |

**Poi.** Aggiornare `HomeDashboard.jsx` per importare e usare i selector estratti. Nessun cambio di comportamento — puro refactor.

**Test.** Unit test per ogni selector estratto. Almeno 2-3 casi per selector (lista vuota, caso normale, edge case).

**CI checkpoint.** Tutti i test esistenti + nuovi devono passare. Bundle size invariato (nessuna dipendenza nuova).

**Stima: 2h.** ~150 LOC nuove (selector + test), ~100 LOC rimosse da HomeDashboard.

### 0.2 — Migration: aggiungere `project_type` a `projects`

**Cosa fare.** Nuova migration `034_project_type.sql`:

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'standard'
  CHECK (project_type IN ('standard', 'supervised', 'eu_project'));
```

**Poi.** Aggiornare `ProjectUpsertSchema` in `schemas.js` per includere `project_type` con `.catch('standard')`. Aggiornare l'adapter in `projects.js` per mappare il campo. Aggiornare `migration-lint.js` se serve.

**Test.** Verificare che tutti i progetti esistenti ricevono `standard` come default. Nessun progetto cambia comportamento.

**CI checkpoint.** Migration lint + test + build.

**Stima: 1h.**

---

## Fase 1 — Deliverables Register + Cockpit (8–10h)

Obiettivo: le due capability a più alto valore — il register e il cockpit. Alla fine di questa fase, un progetto `supervised` ha la tab Supervision con deliverables e panoramica scadenze.

### 1.1 — Migration: tabelle supervision (1h)

Nuova migration `035_supervision_tables.sql`:

```sql
-- Settings (1 riga per progetto supervised)
CREATE TABLE IF NOT EXISTS project_supervision_settings (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  cockpit_window_default int NOT NULL DEFAULT 14,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Deliverables
CREATE TABLE IF NOT EXISTS project_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  owner text,  -- V1: text per semplicità (vedi nota sotto)
  due_date date,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_progress','internal_review','submitted','accepted','delayed')),
  linked_milestone_ref uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Junction: deliverable ↔ task
CREATE TABLE IF NOT EXISTS project_deliverable_tasks (
  deliverable_id uuid NOT NULL REFERENCES project_deliverables(id) ON DELETE CASCADE,
  task_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (deliverable_id, task_id)
);

-- RLS: usa i permessi del progetto padre
ALTER TABLE project_supervision_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverable_tasks ENABLE ROW LEVEL SECURITY;

-- Policy placeholder (vedi nota sotto)
-- ...
```

**Nota critica sulle RLS policy.** Le policy delle tabelle supervision devono riusare la stessa logica di accesso del progetto padre — non una semplice verifica di esistenza della foreign key. Una policy tipo `project_id IN (SELECT id FROM projects)` non esprime il vincolo utente e risulterebbe troppo permissiva. In implementazione, le policy devono richiamare le stesse condizioni usate per l'accesso ai progetti (membership org, ruolo utente, visibilità progetto). Le policy vanno scritte in fase di implementazione reale sulla base delle RLS già attive su `projects` e `tasks`.

**Nota su `owner text`.** Per V1, `owner` è un campo testo per semplicità e velocità di implementazione. Se il layer supervision cresce oltre V1, va riallineato al modello identity forte del core (UUID `owner_id` con eventuale `owner_label` di fallback), come già fatto per `assignee_ids` sui task. Non farlo subito evita di allargare lo scope, ma è debito tecnico noto.

**CI checkpoint.** Migration lint + build.

### 1.2 — DB adapter: deliverables CRUD (2h)

**Cosa fare.** Creare `src/lib/db/deliverables.js` con:

- `fetchDeliverables(projectId)` — lista deliverables + task linkati
- `upsertDeliverable(projectId, data)` — crea o aggiorna
- `deleteDeliverable(id)` — soft delete o hard delete
- `linkTaskToDeliverable(deliverableId, taskId)` — junction insert
- `unlinkTaskFromDeliverable(deliverableId, taskId)` — junction delete

Schema validation con Zod, pattern identico a `tasks.js`. Audit con `writeAuditSoft` su ogni write path.

**Test.** Unit test sull'adapter con mock Supabase (pattern da `adapters.test.js`).

**Stima: 2h.** ~200 LOC adapter + ~100 LOC test.

### 1.3 — Hook: `useDeliverables` (1h)

**Cosa fare.** Creare `src/supervision/hooks/useDeliverables.js`:

- Fetch deliverables per progetto
- Esponi CRUD actions
- Riusa `writeAuditSoft` per audit

Pattern identico a `useTaskActions` / `useProjectActions`.

**Test.** `renderHook` test con mock del DB adapter.

### 1.4 — Componente: DeliverablesRegister (2h)

**Cosa fare.** Creare `src/supervision/components/DeliverablesRegister.jsx`:

- Tabella con: codice, titolo, owner, scadenza, stato, link task/milestone
- Azioni: crea, modifica, filtra
- Click su task collegato → apre TaskPanel
- Click su milestone → naviga a task con flag milestone

**Vincoli.** File sotto 500 LOC. Se supera, splittare subito (es. `DeliverableRow.jsx`, `DeliverableForm.jsx`).

### 1.5 — Componente: DeadlinesCockpit (2h)

**Cosa fare.** Creare `src/supervision/components/DeadlinesCockpit.jsx`:

- Blocchi: milestone prossime, deliverable prossimi, task overdue, task senza owner, task bloccati, deliverable delayed
- Filtri rapidi per finestra temporale (7/14/30 giorni)
- Click-through verso task, milestone, deliverable
- Nessun editing — solo lettura

**Fonte dati.** Usa i selector condivisi estratti nella fase 0 + `useDeliverables` per i dati supervision. Hook dedicato `useSupervisionMetrics` che compone i selector.

**Vincoli.** File sotto 500 LOC. Se i blocchi sono tanti, uno per file (`CockpitOverdueBlock.jsx`, ecc).

### 1.6 — Tab Supervision + routing (1h)

**Cosa fare.**

- Aggiungere `'supervision'` all'array `VIEWS` in `ProjectHeader.jsx`, visibile solo se `project.project_type !== 'standard'`
- Aggiungere dispatch in `MainContent.jsx`: `{view === 'supervision' && <ProjectSupervisionPage ... />}`
- Creare `src/supervision/pages/ProjectSupervisionPage.jsx` con sotto-navigazione: Cockpit | Deliverables
- La pagina wrappa `DeadlinesCockpit` e `DeliverablesRegister`

**CI checkpoint finale fase 1.** Tutti i test (unit + E2E smoke) verdi. Bundle size aggiornato con `npm run bundle-size:update`. Nessuna regressione sui flussi core.

---

## Fase 2 — Recurring Governance + Supervision Timeline (6–8h)

Prerequisito: fase 1 completata e stabile (criteri V1 dal brief).

### 2.1 — Migration: recurring controls (30min)

Nuova migration `036_recurring_controls.sql`:

```sql
CREATE TABLE IF NOT EXISTS project_recurring_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  frequency text NOT NULL DEFAULT 'weekly'
    CHECK (frequency IN ('weekly','monthly','custom')),
  next_due_date date,
  action_type text NOT NULL DEFAULT 'reminder_only'
    CHECK (action_type IN ('create_task','reminder_only')),
  template_task_data jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_recurring_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_controls_access" ON project_recurring_controls
  USING (project_id IN (SELECT id FROM projects));
```

### 2.2 — DB adapter + hook: recurring controls (2h)

Pattern identico a deliverables. `src/lib/db/recurringControls.js` + `src/supervision/hooks/useRecurringControls.js`.

Logica "quando scatta": quando `next_due_date <= today` e `active = true`, se `action_type = 'create_task'` → crea task nel core usando `templateTaskData`, se `reminder_only` → mostra badge nel cockpit. Dopo l'esecuzione, avanza `next_due_date` in base a `frequency`.

**Nota critica.** Chi triggera il check? Nella V1, il check avviene client-side all'apertura della pagina Supervision (non serve un cron server-side). Il hook controlla `next_due_date` vs oggi e propone l'azione. Eventuale cron server-side è fase 3.

**Limitazione esplicita.** In V1 i recurring controls non sono uno scheduler affidabile server-side. Funzionano come supporto operativo single-user e richiedono accesso alla UI per essere valutati. Se nessuno apre la pagina Supervision per una settimana, i controlli non scattano. Questo è accettabile per il caso d'uso target (manager che apre TaskFlow quotidianamente) ma va documentato nel manuale utente.

### 2.3 — Componente: RecurringControlsPanel (2h)

Lista dei controlli ricorrenti con: titolo, frequenza, prossima scadenza, tipo azione, stato attivo/disattivo. Azioni: crea, modifica, disattiva, esecuzione manuale.

### 2.4 — Componente: SupervisionTimeline (3h)

**Cosa fare.** Vista timeline filtrata che mostra solo: milestone (task con `milestone: true`), deliverables, recurring controls prossimi, con evidenza su ritardi e slittamenti.

**Implementazione.** Non creare un secondo engine timeline. Riusare la logica di rendering di `TimelineView.jsx` (o i suoi building block) filtrando gli item per tipo. Se TimelineView è troppo accoppiato, creare una vista semplificata basata su un asse temporale lineare con barre orizzontali — meno feature ma più leggera.

**Vincolo.** File sotto 500 LOC.

### 2.5 — Aggiornare ProjectSupervisionPage (30min)

Aggiungere le sotto-sezioni: Cockpit | Deliverables | Timeline | Recurring.

**CI checkpoint finale fase 2.** Test completi, bundle size aggiornato, E2E su flussi supervision base (almeno: attivare layer, creare deliverable, visualizzare cockpit, creare recurring control).

---

## Fase 3 — Stabilizzazione + E2E (3–4h)

### 3.1 — E2E: flussi supervision (2h)

Aggiungere alla suite auth:

- Attivazione layer su progetto (cambiare project_type)
- Creazione deliverable con link a task
- Visualizzazione cockpit con scadenze reali
- Creazione recurring control
- Recurring control che genera task core
- Navigazione da deliverable a task collegato

### 3.2 — "One in, one out": split HomeDashboard (1h)

Per rispettare il consolidation playbook, il layer supervision è accompagnato dallo **split di `HomeDashboard.jsx`** (544 LOC). Questo non è un candidato — è un requisito della fase 3. La fase 0 estrae i selector, la fase 3 completa il lavoro: se dopo l'estrazione il file resta sopra 400 LOC, estrarre i widget renderer e la logica di layout/drag in file separati. L'obiettivo è portare HomeDashboard sotto 350 LOC.

Se c'è margine, consolidare anche `DashboardWidgets.jsx` (453 LOC) ora che i selector sono condivisi.

### 3.3 — Documentazione (30min)

Aggiornare il manuale utente (`manualContent.jsx`) con la sezione supervision. Aggiornare `CONSOLIDATION.md` con l'area funzionale "Supervision" nella tabella profilo di rischio.

### 3.4 — Review finale (30min)

Verificare i criteri V1 dal brief:

- [x] Deliverables Register e Deadlines Cockpit in produzione ✓
- [x] Test unit/integration ed E2E verdi (669 unit + 7 e2e suite) ✓
- [x] Impatto bundle documentato e dentro budget (ProjectSupervisionPage 30.25 kB, HomeDashboard ridotto a 25.22 kB) ✓
- [x] Nessuna regressione core (tutti i 669 test verdi) ✓
- [x] Layer usabile senza complessità aggiuntiva evidente (lazy-loaded, no vendor deps) ✓

**V1 COMPLETATA — aprile 2026**

---

## Riepilogo tempi

| Fase | Contenuto | Stima |
|---|---|---|
| Fase 0 | Selector condivisi + migration project_type | 2–3h |
| Fase 1 | Deliverables Register + Cockpit + tab | 8–10h |
| Fase 2 | Recurring Governance + Timeline | 6–8h |
| Fase 3 | E2E + one-in-one-out + docs + review | 3–4h |
| **Totale** | | **19–25h** |

---

## Regole operative durante l'implementazione

- **CI verde tra ogni step numerato.** Non accumulare modifiche senza verificare.
- **Un commit per step.** Commit atomici con messaggio chiaro.
- **Se un file supera 500 LOC**, fermati e splitta prima di andare avanti.
- **Se il bundle sfora**, corri `npm run bundle-size:update` e documenta il delta nella PR.
- **Se un test diventa flaky**, fixalo subito — non andare avanti con test instabili.
- **Nessun altro modulo funzionale nuovo** fino a V1 stabile.

---

## Dipendenze critiche

```
Fase 0.1 (selector) ──→ Fase 1.5 (cockpit usa i selector)
Fase 0.2 (project_type) ──→ Fase 1.6 (tab visibile solo se supervised)
Fase 1.1 (migration) ──→ Fase 1.2 (adapter) ──→ Fase 1.3 (hook) ──→ Fase 1.4 + 1.5 (UI)
Fase 1.* ──→ Fase 2.* (fase 2 parte solo dopo V1 cockpit+register stabile)
Fase 2.1 (migration) ──→ Fase 2.2 (adapter) ──→ Fase 2.3 (UI)
Fase 1+2 ──→ Fase 3 (stabilizzazione)
```

Fase 0.1 e 0.2 possono essere parallelizzate. All'interno della fase 1, gli step 1.1→1.2→1.3 sono sequenziali, ma 1.4 e 1.5 possono procedere in parallelo una volta che 1.3 è pronto.
