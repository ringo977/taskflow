# Templates + Rules + Governance — Roadmap

> Punti 5 e 6 della roadmap WP + Partners.
> Prerequisiti: Partner ✅, Workpackage ✅, Milestone ✅, Audit trail ✅.

---

## Contesto

TaskFlow ha già un sistema di template progetto (4 template con sezioni, campi custom, goal, form, regole e task iniziali) e un audit trail completo. Quello che manca:

1. **I template non seedano WP, Milestone, né Partner** — le entità strutturali più recenti
2. **Il rules engine non ha execution layer** — le regole sono definite come JSON ma mai valutate
3. **Nessun permesso granulare per WP** — tutti i membri vedono e editano tutto
4. **Nessun approval gate sui milestone** — lo status si cambia manualmente senza workflow di approvazione

---

## Architettura

### Rules engine: event-driven, post-action

Le regole si valutano **dopo** una mutazione DB, non prima. Pattern:

```
task mutation → DB write → audit → evaluateRules(orgId, projectId, event)
                                     ↓
                              match trigger → execute action(s) → audit (rule-triggered)
```

Il motore è una funzione pura `evaluateRules(rules, event) → actions[]` + un dispatcher `dispatchActions(orgId, actions)`. Zero stato, zero side-effect nella valutazione. Gli effetti sono nel dispatch.

### Triggers disponibili (estensione)

| Trigger | Evento | Config |
|---|---|---|
| `section_change` | Task spostato di sezione | `{ toSection }` |
| `task_completed` | Task marcato done | — |
| `all_tasks_done_in_wp` | Tutti i task di un WP completati | `{ wpCode }` |
| `all_tasks_done_in_ms` | Tutti i task di un milestone completati | `{ msCode }` |
| `milestone_status_change` | Status milestone cambiato | `{ toStatus }` |

> **V1.5 — `deadline_approaching`**: questo trigger è l'unico time-based (non event-driven). Dipende da quando l'utente apre il progetto, rischia duplicati, e richiede un meccanismo di deduplicazione (es. "notifica inviata" flag). Lo **escludiamo dal core V1** del rules engine. Resta nei template come definizione inerte — verrà attivato quando avremo un scheduler o un check on-load con dedup robusto.

### Actions disponibili (estensione)

| Action | Effetto | Config |
|---|---|---|
| `complete_task` | Setta `done = true` | — |
| `set_priority` | Cambia priorità | `{ priority }` |
| `notify` | Push notifica inbox | `{ message }` (con `{task}`, `{wp}`, `{ms}` come placeholder) |
| `set_wp_status` | Cambia status WP | `{ status }` |
| `set_ms_status` | Cambia status milestone | `{ toStatus }` |

### Approval gate sui milestone

Non è un workflow complesso: è un **constraint** sullo status lifecycle del milestone.

```
draft → pending → [needs_approval] → achieved | missed
                       ↓
              Solo chi ha ruolo ≥ editor sul progetto può impostare "achieved"
```

In pratica: `achieved` e `missed` diventano status protetti. Chi è `viewer` non può settarli. Il MilestonesPanel mostra il badge "pending approval" e il pulsante "Approve" solo a chi ha il permesso.

### WP-level permissions: campo `access` su WP

Ogni WP può avere un campo `access`:
- `all` (default) — tutti i membri del progetto possono editare task in questo WP
- `editors` — solo chi ha ruolo ≥ editor
- `owner_only` — solo il WP owner **se `owner_user_id` è valorizzato**

**Edge case critico: `owner_only` con `owner_partner_id` ma senza `owner_user_id`.** Non esiste un mapping partner → utente, quindi `owner_only` non è applicabile. Regola esplicita: se `access === 'owner_only'` e `owner_user_id` è null, il comportamento degrada a `editors`. La UI nel WorkpackagesPanel mostra un warning "Owner must be a user for owner-only access" se si tenta di impostare `owner_only` con un partner owner.

Questo NON è RLS (troppo costoso da mantenere). È un **check client-side** in `applyVisibilityFilter` e un guard in `updateTaskField` / `upsertTask`. Stesso pattern già usato per section access nel `applyVisibilityFilter`.

---

## Phase 1 — Template seeding (WP, MS, Partner) ✅

### P1.1 — Estendere PROJECT_TEMPLATES

Aggiungere ai template esistenti: `workpackages`, `milestones`, `partners` array.

Solo il template **Research** e **Product Launch** hanno bisogno di WP/MS (quelli semplici come Kanban possono non averne). I partner sono org-level, non project-level — il template **non li crea automaticamente**. Li elenca come suggerimenti: dopo la creazione del progetto, il pannello Partners mostra un banner "Suggested partners from template" con un bottone per creare e linkare ciascuno. L'utente decide caso per caso. Questo evita di sporcare l'org con entità create implicitamente.

```javascript
// Esempio: Research template con WP e MS
{
  id: 'research',
  // ...existing fields...
  workpackages: [
    { code: 'WP1', name: 'Literature Review', status: 'active' },
    { code: 'WP2', name: 'Experiment', status: 'draft' },
    { code: 'WP3', name: 'Analysis & Writing', status: 'draft' },
  ],
  milestones: [
    { code: 'MS1', name: 'Literature review complete', status: 'pending', wpCode: 'WP1' },
    { code: 'MS2', name: 'Data collection complete', status: 'draft', wpCode: 'WP2' },
    { code: 'MS3', name: 'Paper submitted', status: 'draft', wpCode: 'WP3' },
  ],
  // Partner NON creati automaticamente — mostrati come suggerimenti nel pannello Partners
  partnerSuggestions: [
    { name: 'External Lab', type: 'lab', roleLabel: 'Collaboration partner' },
  ],
}
```

### P1.2 — Estendere addProject() per seedare WP/MS

In `useProjectActions.addProject()`, dopo il seed di sections e tasks:

1. Se `tpl.workpackages`: per ogni WP, `upsertWorkpackage(orgId, projectId, wp)`
2. Se `tpl.milestones`: per ogni MS, `upsertMilestone(orgId, projectId, ms)` — con lookup `wpCode → wpId` per collegare
3. Se `tpl.partnerSuggestions`: **non creare nulla** — salvare i suggerimenti in `project.partnerSuggestions` (JSONB). Il `PartnersPanel` li legge e mostra un banner con bottoni "Create & Link" per ciascuno. Una volta creati o dismissati, il banner scompare.

### P1.3 — Collegare template task a WP e MS

I task del template possono dichiarare `wpCode` e `msCode`:

```javascript
{ title: 'Literature search', sec: 'Literature Review', pri: 'high', wpCode: 'WP1', msCode: 'MS1' }
```

Dopo il seed di WP e MS, si fa un mapping code → id e si setta `workpackageId` e `milestoneId` sui task prima dell'upsert.

### P1.4 — i18n per nuovi template text

Chiavi nuove per WP/MS/partner suggestions nei template.

### P1.5 — Unit test: template seeding

Test che verifica: dato un template con WP+MS+partner, addProject crea le entità corrette e i task sono collegati.

---

## Phase 2 — Rules execution engine ✅

### P2.1 — Core: `evaluateRules(rules, event)` in `src/utils/rules.js`

Funzione pura. Input: array di regole (dal progetto) + evento (tipo, payload). Output: array di azioni da eseguire. Zero side-effect.

```javascript
export function evaluateRules(rules, event) {
  return rules
    .filter(r => r.enabled && r.trigger === event.type)
    .filter(r => matchTriggerConfig(r.triggerConfig, event))
    .map(r => ({ ...r.actionConfig, action: r.action, ruleId: r.id, ruleName: r.name }))
}
```

### P2.2 — Dispatcher: `dispatchActions(orgId, projectId, actions)` in `src/utils/rules.js`

Esegue le azioni con le API DB. Ogni azione è wrappata in try/catch — una regola che fallisce non blocca le altre. Tutte le azioni rule-triggered producono audit con `triggeredBy: rule`.

### P2.3 — Hook nel flusso task

Inserire la valutazione regole nei punti di mutazione:
- `moveTaskToSection()` → emette evento `section_change`
- `updateTaskField()` con `done: true` → emette evento `task_completed`

Pattern: dopo l'audit, chiamare `evaluateAndDispatch(orgId, projectId, rules, event)`. Il progetto e le sue regole vengono passati dal chiamante (il hook o il componente che già li ha in contesto).

### P2.4 — Trigger `all_tasks_done_in_wp` / `all_tasks_done_in_ms`

Questi trigger richiedono un check aggregato: dopo ogni `task_completed`, verificare se TUTTI i task del WP/MS sono done. Se sì, emettere l'evento aggregato.

```javascript
async function checkAggregateCompletion(orgId, projectId, task, rules) {
  if (task.workpackageId) {
    const wpTasks = await fetchTasksByWp(projectId, task.workpackageId)
    if (wpTasks.every(t => t.done)) {
      const extraActions = evaluateRules(rules, { type: 'all_tasks_done_in_wp', wpId: task.workpackageId })
      await dispatchActions(orgId, projectId, extraActions)
    }
  }
  // same for milestoneId
}
```

### P2.5 — Nuove regole nei template

Aggiungere regole WP/MS ai template:
- Research: `all_tasks_done_in_ms` → `set_ms_status: 'achieved'` + `notify`
- Product Launch: `all_tasks_done_in_wp` → `set_wp_status: 'complete'`

### P2.6 — Unit test: evaluateRules + dispatchActions

Test puri per evaluateRules (matching, filtering regole disabilitate, config mismatch). Mock test per dispatchActions.

---

## Phase 3 — WP-level permissions ✅

### P3.1 — Migration: campo `access` su `project_workpackages`

```sql
ALTER TABLE public.project_workpackages
  ADD COLUMN IF NOT EXISTS access text NOT NULL DEFAULT 'all'
  CHECK (access IN ('all', 'editors', 'owner_only'));
```

### P3.2 — Adapter + schema update

Aggiungere `access` a `toWorkpackage`, `WorkpackageUpsertSchema`, e `WorkpackagesPanel`.

### P3.3 — Guard client-side: `canEditTaskInWp(userRole, wp, userId)`

Utility in `src/utils/permissions.js` (esiste già il file). Logica:
- `wp.access === 'all'` → sempre true
- `wp.access === 'editors'` → `userRole >= editor`
- `wp.access === 'owner_only'` → se `wp.ownerUserId` esiste: `wp.ownerUserId === userId`; se `wp.ownerUserId` è null (owner è un partner): fallback a `editors` (ruolo ≥ editor)

### P3.4 — Integrare guard in TaskPanel e viste

Se `canEditTaskInWp` è false: task read-only (edit button disabilitato, drag disabled, inline edit bloccato). Il badge WP mostra un'icona 🔒 quando il WP è ristretto.

### P3.5 — Unit test: canEditTaskInWp

Test per tutte le combinazioni ruolo × access level.

---

## Phase 4 — Milestone approval gate ✅

### P4.1 — Guard: solo editor+ può settare achieved/missed

In `upsertMilestone`: se il nuovo status è `achieved` o `missed`, verificare il ruolo dell'utente corrente nel progetto. Se viewer, rifiutare.

### P4.2 — UI: approve/reject button in MilestonesPanel

Quando il milestone è `pending` e l'utente ha ruolo ≥ editor, mostrare i bottoni "Approve" (→ achieved) e "Reject" (→ missed). Per viewer, mostrare solo il badge "Pending approval".

### P4.3 — Audit: log di approvazione distinto

`action: 'milestone_approved'` o `'milestone_rejected'` con diff che include chi ha approvato.

### P4.4 — Rule trigger: `milestone_status_change`

Quando lo status di un milestone cambia (in particolare verso `achieved`), emettere un evento che le regole possono intercettare (es. per notificare il team).

### P4.5 — Unit test + i18n

Test per il guard di approvazione. Chiavi i18n: approveMilestone, rejectMilestone, pendingApproval, milestoneApproved, milestoneRejected.

---

## Phase 5 — Hardening ✅

### P5.1 — Unit test: rules engine end-to-end (mock task flow)

### P5.2 — Manual section: rules + governance

Sezione manuale per: regole (concetto, trigger/action, template), permessi WP, approval gate milestone.

### P5.3 — CONSOLIDATION.md + roadmap update

### P5.4 — Bundle budget + final build/test/lint

---

## Riepilogo stima

| Phase | Descrizione | Stima |
|---|---|---|
| P1 | Template seeding (WP, MS, Partner) | ~3h |
| P2 | Rules execution engine | ~5h |
| P3 | WP-level permissions | ~3h |
| P4 | Milestone approval gate | ~2.5h |
| P5 | Hardening | ~2h |
| **Totale** | | **~15.5h** |

---

## Differenze rispetto a un rules engine "vero"

Questo è un motore regole **leggero e sincrono**, adatto a TaskFlow:

| Aspetto | Enterprise rules engine | TaskFlow rules |
|---|---|---|
| Valutazione | Asincrona, event bus, worker | Sincrona, inline post-mutation |
| Persistenza trigger | Event store | Nessuno — fire-and-forget |
| Conflitto regole | Priorità, ordine esecuzione | Tutte le regole matchate, ordine di definizione nell'array |
| UI editor | Visual flow builder | Dropdown trigger/action (futuro) |
| Deadline trigger | Scheduler/cron | Polling client o check periodico |

Il trigger `deadline_approaching` resta il più complesso: richiede un check periodico (cron lato server o polling client). Per ora lo implementiamo come check on-load (quando il progetto si apre, si valutano le deadline). Un vero scheduler è un'estensione futura.

---

## Rischi e mitigazioni

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Loop di regole (regola A triggera B che triggera A) | Medio | Max depth = 2, poi stop. Log warning. |
| Regola che fallisce blocca il flusso task | Alto | try/catch per azione, regola fallita → log + skip |
| Template seeding parziale (WP creati, MS fallisce) | Medio | Rollback ottimistico: se seed fallisce, il progetto è creato ma senza le entità — tollerabile, l'utente le crea a mano |
| Permission check solo client-side | Medio | Accettabile per v1: i dati sono già protetti da RLS org-level. Il check WP-level è UX, non security |
| `deadline_approaching` duplicati e timing-dependent | Alto | Escluso dal core V1. Richiede scheduler + dedup prima di essere attivato |
| `owner_only` con partner owner (no user mapping) | Basso | Fallback esplicito a `editors`. Warning UI se si tenta la combinazione |
| Partner creati implicitamente da template | Medio | Eliminato: i partner sono solo suggerimenti, l'utente decide se crearli |
