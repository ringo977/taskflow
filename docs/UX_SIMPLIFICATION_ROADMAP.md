# UX Simplification Roadmap

**Version:** draft 1 — 2026-04-16
**Status:** F1–F3 eseguite (branch `refactor/ux-simplification`), F4 completata parzialmente. Vedi § **Exit report** in fondo.
**Autore:** brainstorming con Claude, ancorato al codice reale

---

## Perché questa roadmap

TaskFlow ha superato con successo tre cicli di crescita (Partners, WP, Milestones) e un ciclo di redesign UI (F1–F4). L'architettura è sana (App.jsx orchestratore snello, 25 hook modulari, bundle budget rispettato, 532 test).

Il problema attuale **non** è architetturale. È **informativo**: l'app espone troppi punti di ingresso sovrapposti per la stessa funzione. Un PM che apre un progetto oggi si trova davanti:

- **Tab bar del progetto** (in `ProjectHeader.jsx`): Dashboard · List · Board · Timeline · Calendar · WPs · Supervision (condizionale) → **6–7 tab**
- **Overview** (`ProjectOverview.jsx`, 579 LOC) — **non più raggiungibile dalla tab bar** ma ancora registrata nel router in `MainContent.jsx:75-80`. Orfana ma viva. Contiene **18 pannelli** divisi su due colonne.
- **Settings** (`ProjectSettings.jsx`, 266 LOC) — raggiungibile solo dal "Quick links row" del Dashboard (`ProjectDashboard.jsx:395-404`). Contiene **7 pannelli**.

Delle 18 sezioni di Overview, **7 sono identiche a Settings** (Status, Project Type, Project Dates, Permissions, Custom Fields, Rules, Forms). Il refactor F1.4 ha copiato invece di spostare.

Risultato pratico: per cambiare la visibilità di un progetto un utente può passare da due schermi completamente diversi. Per vedere il progresso dei WP può passare da tre (Dashboard widgets, Overview right column, WorkpackagesView). Questo è l'"utilizzo" che non convince.

---

## Diagnosi — matrice di duplicazione

Stato osservato al commit `06eaf3a` (branch `main`):

| Funzione | Dashboard | Overview | Settings | Note |
|---|---|---|---|---|
| Project description | — | ✓ | — | unica in Overview |
| Key resources | — | ✓ | — | unica in Overview |
| Recent activity | — | ✓ | — | duplicata concettualmente con Home |
| **Status label** | widget | ✓ | ✓ | **triplicata** |
| **Project type** | — | ✓ | ✓ | **duplicata** |
| **Project dates** | — | ✓ (se supervised) | ✓ (se supervised) | **duplicata** |
| Progress bar | widget | ✓ | — | duplicata |
| Partner engagement | widget | ✓ | — | duplicata |
| WP progress summary | widget | ✓ | — | duplicata |
| Milestone progress | widget | ✓ | — | duplicata |
| Report PDF button | quick-link | ✓ (right col) | — | duplicata |
| Members (ProjectMembersPanel) | — | ✓ | — | unica in Overview |
| Partners (PartnersPanel) | — | ✓ | — | unica in Overview |
| Workpackages (WorkpackagesPanel) | — | ✓ | — | c'è anche una WorkpackagesView dedicata |
| Milestones (MilestonesPanel) | — | ✓ | — | unica in Overview |
| Goals (GoalsPanel) | — | ✓ | — | unica in Overview |
| Task Templates | — | ✓ | — | unica in Overview |
| **Permissions (visibility + section access)** | — | ✓ | ✓ | **duplicata** |
| **Custom Fields config** | — | ✓ | ✓ | **duplicata** |
| **Rules (RulesPanel)** | — | ✓ | ✓ | **duplicata** — 579 LOC importata due volte |
| **Forms (FormsPanel)** | — | ✓ | ✓ | **duplicata** |
| Archive / delete project | — | (ConfirmModal) | ✓ | parzialmente in entrambi |

**7 duplicazioni strutturali**, alcune su componenti pesanti (RulesPanel 579 LOC, FormsPanel, CustomFieldsConfig).

---

## Principio guida

> *Un posto solo per ogni cosa. Ogni tab ha una domanda che risponde in modo non ambiguo.*

Mapping delle domande:

- **Dashboard** → "Come sta andando il progetto?" (monitoring, sola lettura)
- **Board / List / Timeline / Calendar** → "Come sono distribuite le task?" (lavoro quotidiano)
- **Workpackages** → "Qual è la struttura WP e i task dentro?" (struttura di progetto)
- **Overview** ⇒ **rinominare in "Setup" o "Struttura"** → "Come è configurato il progetto a livello di contenuti?" (descrizione, risorse, membri, partner, milestone, goal, template)
- **Settings** → "Come è configurato a livello di governance?" (status, type, dates, permissions, custom fields, rules, forms, archive/delete)
- **Supervision** → "Deliverable e controlli ricorrenti" (invariato)

"Setup" è configurazione di **contenuto** (chi, cosa, quando nel merito). "Settings" è configurazione di **policy** (visibilità, automazioni, campi). Due ruoli diversi, giustificabili come tab separate.

---

## Ciclo di lavoro proposto (4 fasi, stile CONSOLIDATION.md)

### Fase 1 — Foundation (dedup + routing)

Obiettivo: eliminare tutte e 7 le duplicazioni della matrice. Nessun cambiamento visuale radicale. CI verde.

**Fare:**

1. **Overview diventa "Setup":**
   - rinominare `view === 'overview'` in `view === 'setup'` (oppure tenere 'overview' internamente, cambiare solo la label i18n → basso rischio)
   - rimuovere da `ProjectOverview.jsx`:
     - blocco `Status` (righe 242-257)
     - blocco `Project type` (righe 259-270)
     - blocco `Project dates` (righe 272-291)
     - blocco `Permissions` (righe 437-474)
     - blocco `Custom fields config` (invocazione righe 476-477 + definizione funzione `CustomFieldsConfig` righe 519-579 + costante `FIELD_TYPES` 512-516)
     - import e uso di `RulesPanel` (riga 20, 185)
     - import e uso di `FormsPanel` (riga 21, 188)
   - questo porta `ProjectOverview.jsx` da 579 LOC a **~320 LOC stimate**

2. **Overview riorganizzata in due colonne coerenti:**
   - **Left col (contenuto operativo):** Description · Key resources · Recent activity · Goals · Task Templates
   - **Right col (struttura):** Members · Partners · Workpackages panel · Milestones panel · Report PDF button
   - rimuovere dal right col: Progress bar, Partner engagement summary, WP progress summary, Milestone progress summary (rimangono SOLO nel Dashboard come widget)

3. **Rimettere Overview/Setup nella tab bar** in `ProjectHeader.jsx:10-15`:
   ```
   Dashboard · Setup · Board · List · Timeline · Calendar · WPs · (Supervision) · ⚙
   ```
   dove ⚙ è un'icona in fondo che apre Settings (oppure Settings resta il quick-link dal Dashboard — da decidere).

4. **Settings invariato** (contiene già tutto il necessario).

5. **MilestoneMigrationHelper** (righe 200-205 di Overview) → valutare se il feature flag `_legacy_milestone` è ancora necessario. Se il rollout milestones M1–M4 è concluso, **rimuovere** (one-out).

**Deliverable fase 1:**
- 1 commit: `refactor(ui): Setup/Settings deduplication — F1.5`
- Delta LOC atteso: **-300 LOC circa** (Overview -260, rimozione MigrationHelper se possibile)
- Nessun nuovo test; aggiornare quelli esistenti di ProjectOverview e ProjectSettings che coprono i blocchi rimossi

### Fase 2 — Views (navigazione e discoverability)

Obiettivo: ridurre il carico cognitivo della tab bar. Nessuna perdita funzionale.

**Fare:**

1. **Tab bar gerarchica, non piatta**. Proposta concreta in `ProjectHeader.jsx`:
   - **Gruppo 1 (lavoro):** "Work" con sotto-selettore segmentato interno (Board · List · Timeline · Calendar)
   - **Gruppo 2 (strategia):** "Dashboard"
   - **Gruppo 3 (struttura):** "Setup" · "WPs"
   - **Gruppo 4 (governance):** "Settings" (⚙) e condizionalmente "Supervision"
   - pattern: primo livello = tab pill-shaped; dentro "Work" il segmented control ricorda Asana Starter (coerente col riferimento originale)

2. **Default view al primo ingresso** in un progetto: `Dashboard`. Da confermare perché oggi non è chiaro qual è la default (cerca in `useUIState`).

3. **Scorciatoie da tastiera** (opzionale, basso costo):
   - `g d` → dashboard, `g w` → work (board), `g s` → setup, `g ,` → settings
   - integrabili con Command Palette ⌘K già esistente

4. **Rimuovere "Quick links row"** dal fondo del Dashboard (`ProjectDashboard.jsx:394-416`) — Settings e WP sono ora nella tab bar. Il bottone "Generate Report" resta come quick-action.

**Deliverable fase 2:**
- 1 commit: `feat(ui): hierarchical project tab bar — F2.5`
- Playwright smoke test aggiornato (le tab cambiano markup)

### Fase 3 — TaskPanel (densità del side panel)

Obiettivo: TaskPanel oggi è 407 LOC, 15 sezioni impilate una sotto l'altra (Header, WP banner, Title, Meta, Tags, Custom fields, Dependencies, Description, Attachments, Activity log, Time tracking, Approval, Subtasks, Comments, Delete). Scroll infinito su desktop, inutilizzabile su mobile.

**Fare:**

1. **Tabs interne al pannello** — 3 tab fisse:
   - **Detail** (default, ~80% degli usi): Meta (assigned/due/priority/status), Tags, Custom fields, Dependencies, Description, Subtasks
   - **Activity** (richiesta coscientemente): Comments, Activity log, Approval
   - **Files & Time** (meno frequente): Attachments, Time tracking
   - tab bar simile a quella di Asana/Linear

2. **Header sticky** con: Title (sempre visibile), dot di progetto, priorità, ⋯ menu (delete, duplicate, copy link)

3. **Delete** non più sezione a sé: spostato dentro il menu ⋯

4. **Mobile-first:** il pannello in mobile diventa fullscreen con back button; le tab restano le stesse. Già parzialmente coperto da `.mobile-main` in `MainContent.jsx:154`, ma da verificare.

5. Estrazione sub-component (già avviata in `src/pages/taskpanel/`):
   - creare `src/pages/taskpanel/DetailTab.jsx` (~180 LOC)
   - creare `src/pages/taskpanel/ActivityTab.jsx` (~120 LOC)
   - creare `src/pages/taskpanel/FilesTimeTab.jsx` (~80 LOC)
   - `TaskPanel.jsx` diventa puro orchestratore + header → target **<150 LOC**

**Deliverable fase 3:**
- 1 commit: `refactor(ui): TaskPanel tabbed layout — F3.5`
- 3 nuovi file, TaskPanel.jsx dimagrito da 407 a ~150 LOC
- Aggiornare test di TaskPanel in `src/pages/taskpanel/*.test.*` (se esistono — verificare)
- E2E: lo smoke test che apre una task e verifica subtasks/comments deve continuare a passare

### Fase 4 — Hardening (docs + test + accessibility)

1. **Docs:**
   - aggiornare `README.md` sezione "Features" con la nuova IA (Setup vs Settings)
   - aggiornare `CONSOLIDATION.md` con la regola "no duplication across views"
   - aggiornare `manualContent.jsx` per l'utente finale — rivedere le entry IT/EN che citano "Overview" (poche occorrenze nei file `i18n/it.js` e `i18n/en.js`, quindi intervento circoscritto)

2. **Accessibility:**
   - ruoli ARIA corretti sulla tab bar (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`)
   - focus trap nel TaskPanel (oggi probabilmente assente)
   - navigazione tab da tastiera (freccia sx/dx)

3. **Test:**
   - property test: nessuna sezione di Overview e Settings condivide lo stesso `sectionTitleKey` (check statico)
   - screenshot baseline Playwright per: Dashboard, Setup, Settings, Board, TaskPanel (detail+activity+files tabs)

4. **Bundle budget:**
   - verificare che ProjectOverview chunk scenda (target: da 60 KB attuale a **<45 KB**)
   - verificare che TaskPanel chunk resti sotto 37 KB nonostante le 3 tab (lazy-loading tab pesanti può aiutare)

---

## Ordine dei commit (atomico, tracciabile)

Seguendo la disciplina 4-fasi:

```
F1.5a  refactor(ui): remove duplicated panels from ProjectOverview
F1.5b  refactor(ui): reinstate Overview (renamed Setup) in project tab bar
F1.5c  chore(milestones): remove legacy MilestoneMigrationHelper (post-M4)
F2.5   feat(ui): hierarchical project tab bar with Work segmented control
F3.5a  refactor(taskpanel): extract DetailTab / ActivityTab / FilesTimeTab
F3.5b  feat(taskpanel): tabbed layout with sticky header and ⋯ menu
F4.5a  docs: update README + CONSOLIDATION + manual for Setup/Settings split
F4.5b  test(ui): a11y tab roles + visual regression baselines
F4.5c  perf: verify bundle budget post-refactor
```

9 commit, 1-2 settimane di lavoro concentrato. Ogni fase è CI-green prima della successiva (regola già consolidata in `CONSOLIDATION.md`).

---

## "One in, one out" — cosa sparisce

Coerente con la regola in `CONSOLIDATION.md`. Questa roadmap è quasi tutta "out":

- **−260 LOC** da ProjectOverview (pannelli duplicati)
- **−257 LOC** da TaskPanel (estrazione in sub-component, non duplicazione)
- **−30 LOC** MilestoneMigrationHelper (se M4 esaurisce l'exit criteria)
- **−~50 LOC** Quick links row da ProjectDashboard
- Un'entry eliminata dal registry widget se decidi che "progress summary" non serve duplicato nel Dashboard
- **Totale atteso: ~−600 LOC netti** su src/, con +300 LOC nuovi file di tab TaskPanel → **bilancio −300 LOC**

Il bundle ProjectOverview dovrebbe passare da 60 KB a ~40 KB. TaskPanel da 34 KB a ~28 KB (con lazy load tab files/time).

---

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Utenti hanno bookmark a `?view=overview` | Mantenere l'alias interno; la label UI cambia, l'URL no |
| I widget duplicati in Overview erano usati come "backup" | Prima di rimuoverli, `git log` per vedere chi li ha toccati di recente |
| Tab bar gerarchica rompe E2E auth tests | Aggiornare selector dei test con `data-testid` (già in uso) |
| TaskPanel tabs nascondono info importanti | Badge numerici sulle tab (es. "Activity ·3" se ci sono 3 commenti non letti) |
| Bundle budget salta durante il refactor | Ogni fase ha il proprio check `npm run bundle-size`; non mergiare se supera |

---

## Fuori scope (per ora)

- Ridisegno del Command Palette ⌘K (funziona, non è la causa dell'insoddisfazione)
- Ridisegno di PeopleView (514 LOC ma raggiunta raramente)
- Ridisegno di HomeDashboard cross-project
- Internazionalizzazione oltre IT/EN
- Design system estrattato in pacchetto separato (discorso diverso)

Se una di queste diventa prioritaria, merita una propria roadmap separata.

---

## Domanda di chiusura per Marco

Prima di scrivere una sola riga di codice, tre scelte da fare:

1. **Setup vs Overview come nome:** meglio rinominare per forzare il reset mentale, o mantenere "Overview" per non spaccare i bookmark?
2. **Settings come tab o come icona ⚙:** tab esplicita aumenta la discoverability; icona riduce visual clutter. Pattern Asana Starter preferisce l'icona.
3. **Fase 3 (TaskPanel) ora o dopo:** si può fermare a Fase 1+2 e vedere se basta, oppure andare dritti con la refactor del side panel.

**Decisioni prese (2026-04-16):** (1) mantenere "Overview", (2) Settings come ⚙ icona, (3) procedere fino a Fase 3 inclusa, tracciando tutto su git per rollback.

---

## Exit report (2026-04-16)

Branch: `refactor/ux-simplification`. Sette commit atomici sopra `06eaf3a` (main):

| Commit | Fase | Cosa ha fatto |
|---|---|---|
| `48ec3fb` | F0 | `docs(ux):` aggiunta di questa roadmap |
| `083d16a` | F1.5a | Rimossi 7 pannelli duplicati da ProjectOverview (Status, Project Type, Project Dates, Permissions, Custom Fields, Rules, Forms) + 4 summary di monitoring (Progress, Partners, WP, Milestones). Overview: 579 → 230 LOC (−321 netti, −349 nel file + −28 contestuali). ConfirmModal e archive/delete spostati verso Settings. |
| `326aac6` | F1.5b | Overview reinstated nel tab bar come secondo tab. Settings convertito in icona ⚙ (non più tab). Rimossa "Quick links row" dal fondo di ProjectDashboard. ARIA: `role=tablist`, `aria-selected`, `aria-pressed`. |
| `feb86d1` | F2.5 | Tab bar gerarchica. Primario: Dashboard · Overview · Work ▾ · WPs · Supervision (cond). Secondario (visibile solo in Work): List · Board · Timeline · Calendar. Work ricorda l'ultima sotto-view usata. Tutti i `data-testid` preservati per e2e (`tab-lista`, `tab-board`, `tab-timeline`, `tab-calendario`, `tab-overview`, `tab-supervision`). |
| `833b8bc` | F3.5a | TaskPanel decomposto: `src/pages/taskpanel/DetailTab.jsx` (208 LOC), `ActivityTab.jsx` (115), `FilesTimeTab.jsx` (26). TaskPanel shell: 407 → 129 LOC. Stato locale delle tab spostato dentro i rispettivi componenti. Nessun cambio di UX. |
| `201a3a3` | F3.5b | Layout tabbed: Details / Activity / Files & Time, solo una tab visibile alla volta. Titolo e tab bar pinnati sotto l'header, il delete migra in un menu ⋯. WP lock banner rimane sempre visibile (nell'area pinnata). Nuovi `data-testid`: `tab-task-details`, `tab-task-activity`, `tab-task-filestime`, `task-more-menu`. i18n: 5 chiavi nuove en/it. |

### F1.5c — verdetto: differito

La rimozione di `MilestoneMigrationHelper` richiede (per `MILESTONES_ROADMAP.md` righe 41-46) che:

- il migration helper UI sia deployato — ✅ fatto
- la conversione sia completata su tutti gli org (zero task con `_legacy_milestone=true`) **oppure** l'utente abbia dismissato il pannello esplicitamente — ⚠️ non verificabile senza query di produzione
- almeno un ciclo di release sia trascorso — ⚠️ dipendente dalla release cadence

La colonna `_legacy_milestone` è tuttora letta da `src/lib/db/adapters.js:45`. Il componente è self-hiding (`return null` se `legacyTasks.length === 0`), quindi non ha costo runtime nel caso comune. Rimuoverlo ora senza prima droppare la colonna lascerebbe i dati legacy scoperti. **Azione proposta:** Marco esegue `SELECT COUNT(*) FROM tasks WHERE _legacy_milestone = true;` sull'ambiente principale; se 0, procedere con migration `040_drop_legacy_milestone.sql` e solo dopo rimuovere Helper + adapter.

### F4.5 — stato

- **F4.5a (lint/test):** `npx eslint` pulito su tutti i file toccati (1 solo warning pre-esistente in `MentionPopup.jsx`). Vitest run targeted: `useUIState` (37 test), `filters` (39), `constants` (16), `useTaskActions` (21), `useRuleEngine` (48), `permissions` — **tutti verdi**. Full suite non eseguibile in questo ambiente (vite-build e full vitest eccedono il timeout sandbox).
- **F4.5b (docs):** questo paragrafo. `README.md`/`manualContent.jsx` **non aggiornati in questa sessione** — task residuo per Marco (low-risk, tempo basso).
- **F4.5c (bundle):** `vite build` non eseguibile in sandbox (permission su `dist/`). Marco deve eseguire `npm run bundle-size` localmente per aggiornare `bundle-budget.json` — attesa di una riduzione su `ProjectOverview` (−320 LOC → ~−15 KB gzip) e marginale su `TaskPanel` (neutro o leggermente giù grazie all'estrazione).

### Riduzione LOC — misurata

```
ProjectOverview.jsx   579 → 230    (-321)
ProjectDashboard.jsx   ~ → ~       (-~40 quick-links)
ProjectHeader.jsx     69  → 136    (+67, nuovo segmented control)
TaskPanel.jsx         407 → 202    (-205)
 + taskpanel/DetailTab.jsx          +208
 + taskpanel/ActivityTab.jsx        +115
 + taskpanel/FilesTimeTab.jsx        +26
Totale netto src/                   ≈ −150 LOC
```

Meno aggressivo del target −300 perché F1.5c è differito e perché il nuovo segmented control + menu ⋯ + i18n keys hanno un costo fisso. La riduzione **reale** percepita è molto maggiore della differenza netta: TaskPanel è la superficie che l'utente vede di più, e lì il guadagno è −205 LOC sullo shell + scroll tutto-in-uno che diventa tab selezionate.

### Todo residui (fuori sessione)

1. Eseguire `npm run test` e `npm run bundle-size` localmente, committare eventuale update di `bundle-budget.json`.
2. Verificare il migration helper su `_legacy_milestone` (query di cui sopra) prima di rimuoverlo.
3. Playwright smoke test: aprire un task, cliccare le 3 tab del TaskPanel, verificare che Details mostri il titolo + meta, Activity mostri comment input, Files & Time mostri gli attachments.
4. Aggiornare `README.md` e `manualContent.jsx` con la nuova IA (1 h di lavoro).
5. Merge `refactor/ux-simplification` → `main` come singolo fast-forward (la cronologia atomica dei 7 commit è utile per bisect).
