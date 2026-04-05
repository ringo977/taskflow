# TaskFlow — UI Redesign Roadmap

> Stato: proposta · v0.6.x · Data: aprile 2026
> Prerequisito: v0.5.4 stabile (governance, templates, regole completate)

---

## Principio guida: piattaforma unica, due livelli di esperienza

TaskFlow serve due tipi di utente nello stesso progetto:

1. **Operativo** — chi lavora sui task: deve vedere i propri task, scadenze, board, e interagire velocemente (assegnare, completare, spostare). Il suo benchmark è Asana.
2. **Strategico** — chi coordina il progetto (PM, coordinatore EU): deve avere la visione d'insieme su WP, milestone, partner, avanzamento globale, timeline cross-WP. Il suo benchmark è ClickUp.

La stessa persona può essere entrambe le cose in momenti diversi della giornata. L'interfaccia non deve forzare una scelta: deve permettere di **navigare fluidamente tra i due livelli**, dentro la stessa piattaforma.

---

## Stato attuale (v0.5.4) — cosa funziona e cosa no

### Architettura UI attuale

```
IconSidebar → ContextSidebar → MainContent
                                  ├─ nav=home       → HomeDashboard
                                  ├─ nav=projects   → ProjectContent
                                  │                     ├─ ProjectHeader (tab bar)
                                  │                     ├─ FilterBar
                                  │                     └─ view={overview|board|lista|timeline|calendario|supervision}
                                  ├─ nav=portfolios → PortfoliosView
                                  ├─ nav=mytasks    → MyTasksView
                                  ├─ nav=people     → PeopleView
                                  ├─ nav=inbox      → InboxView
                                  └─ nav=trash      → TrashView
```

### Viste progetto esistenti (src/views/)
- `ProjectOverview.jsx` (579 righe) — monolitica, contiene ~12 pannelli
- `BoardView.jsx` — kanban per sezione
- `ListView.jsx` — tabella task
- `TimelineView.jsx` — Gantt singolo progetto
- `CalendarView.jsx` — vista calendario
- `ProjectSupervisionPage` (lazy) — supervision estesa

### Tab bar attuale (ProjectHeader.jsx)
```
Overview | List | Board | Timeline | Calendar [| Supervision]
```

### Problemi identificati

| # | Problema | Impatto | Dove |
|---|---------|---------|------|
| P1 | **Overview monolitica** — 12+ pannelli in scroll verticale: status, descrizione, progress, task per WP, task per milestone, partner, members, permissions, custom fields, rules, forms, goals, templates, actions | Il coordinatore EU si perde; l'operativo non ci va mai | ProjectOverview.jsx (579 LOC) |
| P2 | **Nessun "Group by"** — Board e List raggruppano solo per sezione | Impossibile vedere task per WP, per milestone, per assegnatario senza aprire Overview | BoardView, ListView |
| P3 | **WP come campo, non come contenitore** — i WP sono un `workpackageId` sui task, visibili solo dentro Overview | Non si può "entrare in un WP" e vedere i suoi task, deliverable, milestone | Modello dati + UI |
| P4 | **FilterBar pesante** — sempre visibile sopra board/list, occupa spazio | Su mobile e schermi piccoli comprime l'area utile | FilterBar.jsx + MainContent |
| P5 | **Header denso** — tab bar + azioni + export + AI summary tutti nella stessa riga | Su schermi medi i bottoni si comprimono o wrappano | ProjectHeader.jsx |
| P6 | **Nessuna dashboard aggregata** — HomeDashboard mostra task recenti, non KPI di progetto | Il coordinatore non ha una vista "salute del progetto" a colpo d'occhio | HomeDashboard.jsx |

---

## Redesign: 4 fasi (foundation → views → reporting → hardening)

### Fase 1 — Foundation: navigazione a due livelli

**Obiettivo:** separare chiaramente il livello strategico da quello operativo, senza rompere nulla.

#### F1.1 — Dashboard di progetto (nuova vista, sostituisce Overview)

Sostituire `ProjectOverview.jsx` (579 LOC monolitiche) con una **Dashboard** leggera:

```
┌─────────────────────────────────────────────────────┐
│  Header: nome progetto, status badge, date, owner   │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  Progress card       │  Milestone timeline          │
│  (% completamento    │  (prossime 3 milestone       │
│   per WP, mini bar)  │   con status e date)         │
│                      │                              │
├──────────────────────┼──────────────────────────────┤
│                      │                              │
│  Partner map         │  Attività recente            │
│  (chi fa cosa,       │  (ultimi 5-10 eventi:        │
│   badge colorati)    │   task completati, status    │
│                      │   change, commenti)          │
│                      │                              │
└──────────────────────┴──────────────────────────────┘
│  Link rapidi: WP details → | Milestone details →    │
│  Members → | Rules → | Forms → | Settings →         │
└─────────────────────────────────────────────────────┘
```

Tutto ciò che oggi è un pannello dentro Overview diventa una **sotto-pagina** accessibile da link rapido o dalla sidebar.

**File coinvolti:**
- `src/views/ProjectOverview.jsx` → diventa `src/views/ProjectDashboard.jsx` (nuovo, ~150 LOC)
- I pannelli attuali (PartnersPanel, WorkpackagesPanel, MilestonesPanel, RulesPanel, FormsPanel, GoalsPanel, ProjectMembersPanel) restano come componenti ma escono dalla vista principale
- Nuovi: `src/views/ProjectSettings.jsx` (raggruppa permissions, custom fields, actions, forms, rules)

#### F1.2 — Tab bar rivisitata

Da:
```
Overview | List | Board | Timeline | Calendar
```

A:
```
Dashboard | List | Board | Timeline | Calendar | WPs
```

- **Dashboard** = la nuova vista leggera (F1.1)
- **WPs** = nuova tab che mostra la lista WP con drill-down nei task di ciascuno (F1.3)
- Supervision diventa un'icona/toggle, non una tab (risparmio spazio)

**File coinvolti:**
- `src/components/ProjectHeader.jsx` — aggiornare VIEWS array
- `src/layout/MainContent.jsx` — aggiungere routing per nuove viste

#### F1.3 — Vista WP come contenitore navigabile

Nuova tab "WPs" che mostra:

```
┌─────────────────────────────────────────┐
│  WP1 — Bioreactor Design    ▸  12/18   │ ← click per espandere/navigare
│  WP2 — Cell Culture         ▸   8/14   │
│  WP3 — Integration          ▸   3/20   │
│  WP4 — Dissemination        ▸   5/7    │
└─────────────────────────────────────────┘
```

Click su un WP → vista lista/board filtrata per quel WP, con header WP (owner, access, deadline, deliverables, milestone collegati).

Questo è il pattern ClickUp (Space → Folder → List) adattato a TaskFlow senza rompere il modello dati: i WP restano un `workpackageId` sui task, ma la UI li presenta come contenitori navigabili.

**File coinvolti:**
- Nuovo: `src/views/WorkpackagesView.jsx`
- Nuovo: `src/views/WorkpackageDetail.jsx` (riusa ListView/BoardView con filtro WP)
- `src/hooks/useWorkpackages.js` — già esiste, riutilizzabile

#### F1.4 — Sotto-pagine Settings

Raggruppare in una pagina "Settings" accessibile dal Dashboard:
- Permissions (visibility, section access, WP access)
- Custom fields
- Rules
- Forms
- Project actions (archive, delete)

Toglie ~200 LOC da Overview e crea un luogo naturale per configurazione.

**File coinvolti:**
- Nuovo: `src/views/ProjectSettings.jsx`
- Sposta logica da ProjectOverview.jsx

---

### Fase 2 — Views: potenziare le viste operative

#### F2.1 — "Group by" su Board e List

Aggiungere un selettore nella FilterBar (o sopra la vista):

```
Group by: [Section ▾]  →  Section | WP | Milestone | Assignee | Priority
```

- Board: le colonne diventano i gruppi scelti (es. colonne = WP anziché sezioni)
- List: le righe si raggruppano sotto intestazioni collassabili

Questo è il feature più impattante: elimina la necessità di andare in Overview per vedere "task del WP3" o "task della milestone M2".

**File coinvolti:**
- `src/components/FilterBar.jsx` — aggiungere selettore groupBy
- `src/views/BoardView.jsx` — accettare prop groupBy, calcolare colonne dinamiche
- `src/views/ListView.jsx` — accettare prop groupBy, calcolare raggruppamenti

#### F2.2 — Colonna Partner (badge colorati)

Nella ListView, aggiungere una colonna "Partner" con badge colorati (stile ClickUp Lead):

```
Task            | Assignee | WP   | Partner      | Due
Design reactor  | Marco    | WP1  | 🟢 POLIMI   | Apr 15
Cell analysis   | Sara     | WP2  | 🔵 IBEC     | Apr 22
```

**File coinvolti:**
- `src/views/ListView.jsx` — aggiungere colonna partner con badge
- `src/components/Badge.jsx` — già esiste, estendere per partner colors

#### F2.3 — FilterBar collassabile

La FilterBar diventa un toggle: icona filtro + contatore filtri attivi. Click → espande i filtri. Risparmia ~40px verticali quando non serve.

**File coinvolti:**
- `src/components/FilterBar.jsx` — aggiungere stato collapsed/expanded

#### F2.4 — Timeline cross-WP (Gantt migliorato)

Il TimelineView attuale mostra task individuali. Aggiungere un livello "WP" nel Gantt:

```
WP1 ═══════════════════════════
  T1.1 ────────
  T1.2      ────────
  D1.1         ◆
  M1           ▲
WP2    ════════════════════════
  T2.1    ────────
  ...
```

**File coinvolti:**
- `src/views/TimelineView.jsx` — aggiungere raggruppamento per WP con barre aggregate

---

### Fase 3 — Reporting: dashboard e metriche

#### F3.1 — Widget configurabili nella Dashboard

Permettere al PM di scegliere quali widget mostrare e in che ordine:

Widget disponibili:
- Progress per WP (bar chart)
- Milestone timeline (next 3)
- Partner workload (chi ha più task aperti)
- Task distribution per status
- Overdue task count
- Burndown / velocity (se dati sufficienti)

Riusa `src/components/DashboardWidgets.jsx` e `src/pages/DashboardWidgetGrid.jsx` già esistenti.

**File coinvolti:**
- `src/components/DashboardWidgets.jsx` — estendere con nuovi widget
- `src/views/ProjectDashboard.jsx` — griglia widget configurabile
- `src/pages/dashboardConfig.js` — configurazione widget per progetto

#### F3.2 — HomeDashboard potenziata

La HomeDashboard diventa il punto di ingresso cross-progetto:
- I miei task in scadenza (7 giorni)
- Stato salute dei miei progetti (semaforo)
- Milestone imminenti
- Attività recente cross-progetto

**File coinvolti:**
- `src/pages/HomeDashboard.jsx` — aggiungere sezioni aggregate

---

### Fase 4 — Hardening: polish, test, performance

#### F4.1 — Design system refresh
- Spacing e tipografia più ariosi
- Badge colorati per partner consistenti ovunque
- Progress bar compatte e uniformi
- Sidebar collassabile con indicatori di stato
- Responsive migliorato (mobile-first per viste operative)

#### F4.2 — Test
- Test unitari per ogni nuovo componente (ProjectDashboard, WorkpackagesView, WorkpackageDetail, ProjectSettings)
- Test per logica groupBy in BoardView e ListView
- E2E: navigazione Dashboard → WP → task → back
- E2E: groupBy switch su Board

#### F4.3 — Performance
- Lazy loading di widget Dashboard
- Memoizzazione groupBy calculations
- Bundle budget update per nuovi chunk
- Lighthouse audit su viste principali

#### F4.4 — Documentazione
- Aggiornare CONSOLIDATION.md con v0.6.x
- Manuale utente (ManualPage) aggiornato con nuove viste
- DEVELOPMENT.md aggiornato con nuova architettura componenti

---

## Architettura componenti target (v0.6.x)

```
src/views/
  ProjectDashboard.jsx      ← NUOVO (sostituisce ProjectOverview come vista principale)
  ProjectSettings.jsx       ← NUOVO (permissions, custom fields, rules, forms, actions)
  WorkpackagesView.jsx      ← NUOVO (lista WP navigabili)
  WorkpackageDetail.jsx     ← NUOVO (task di un WP, riusa ListView/BoardView)
  BoardView.jsx             ← MODIFICATO (+ groupBy)
  ListView.jsx              ← MODIFICATO (+ groupBy, + colonna partner)
  TimelineView.jsx          ← MODIFICATO (+ raggruppamento WP)
  CalendarView.jsx          ← invariato
  MyTasksView.jsx           ← invariato
  ProjectOverview.jsx       ← DEPRECATO → migrato in ProjectDashboard + ProjectSettings

src/components/
  ProjectHeader.jsx         ← MODIFICATO (nuova tab bar)
  FilterBar.jsx             ← MODIFICATO (+ groupBy selector, + collapsible)
  DashboardWidgets.jsx      ← MODIFICATO (nuovi widget)
  [tutti i pannelli]        ← invariati, solo riposizionati
```

## Tab bar target

```
Dashboard | List | Board | Timeline | Calendar | WPs [⚙ Settings]
```

## Navigazione tipo

```
Coordinatore EU:
  Home → progetto → Dashboard (KPI, milestone, partner) → click WP2 → task del WP2 → click task → dettaglio

Operativo:
  Home → progetto → Board (group by: Section) → drag task → fatto
  oppure: My Tasks → click task → dettaglio

Ibrido:
  Dashboard → vede milestone M3 in ritardo → click → vede task del M3 (group by: Milestone) → assegna task → torna a Dashboard
```

---

## Stima effort e priorità

| Fase | Item | Effort | Priorità | Note |
|------|------|--------|----------|------|
| F1 | F1.1 Dashboard | M | 🔴 Alta | Sblocca tutto il resto |
| F1 | F1.2 Tab bar | S | 🔴 Alta | Prerequisito per F1.1 |
| F1 | F1.3 WP view | M | 🔴 Alta | Differenziatore vs Asana |
| F1 | F1.4 Settings | S | 🟡 Media | Pulizia, non urgente |
| F2 | F2.1 Group by | L | 🔴 Alta | Feature più impattante per operativi |
| F2 | F2.2 Partner badge | S | 🟡 Media | Quick win visivo |
| F2 | F2.3 FilterBar collapse | S | 🟡 Media | Quick win UX |
| F2 | F2.4 Timeline cross-WP | M | 🟡 Media | Forte per coordinatori EU |
| F3 | F3.1 Widget dashboard | M | 🟡 Media | Dopo F1.1 |
| F3 | F3.2 Home potenziata | M | 🟢 Bassa | Nice-to-have |
| F4 | F4.1-F4.4 Hardening | L | 🔴 Alta | Non negoziabile |

Legenda effort: S = 1-2 sessioni, M = 3-5 sessioni, L = 5+ sessioni

---

## Vincoli

- **Nessun breaking change sul modello dati**: i WP restano `workpackageId` sui task, la navigazione è puramente UI
- **Backward compatible**: ogni fase deve lasciare l'app funzionante
- **CI verde ad ogni commit**: il ciclo foundation→views→reporting→hardening vale anche qui
- **Bundle budget**: ogni nuovo chunk deve stare nel budget, update proattivo
- **787 test esistenti**: nessuna regressione, solo aggiunta
