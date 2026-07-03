# Brief tecnico — Layer "Project Supervision" per TaskFlow (v3)

## Obiettivo

Aggiungere a TaskFlow un layer opzionale di **supervisione progetto** pensato per uso manageriale/single-user, utile a monitorare:

- scadenze
- milestone
- deliverable
- attività critiche
- timeline di progetto
- controlli periodici

Il layer **non deve creare una seconda app** e **non deve duplicare il core** di TaskFlow.  
Deve vivere **sopra i progetti esistenti**, usando lo stesso `projectId` e riusando task, timeline, permessi, dashboard e viste già presenti.

---

## Vincolo esplicito: questa è una major feature

Project Supervision è una **major feature** a tutti gli effetti.

Quindi:

- segue integralmente il **Consolidation Playbook**
- è soggetta alla regola **one in, one out**
- deve rispettare checklist pre-merge, bundle budget, soglie LOC e coverage
- **nessun altro modulo funzionale nuovo** dovrebbe entrare in parallelo fino a quando la V1 del layer non è stabile

### Definizione di “V1 stabile”
La V1 è considerata stabile quando:

- Deliverables Register e Deadlines Cockpit sono in produzione
- test unit/integration ed E2E richiesti sono verdi
- l’impatto bundle è documentato e dentro budget
- non ci sono regressioni sul core task/project flow
- il layer è usabile senza aumentare in modo evidente la complessità operativa del progetto

---

## Principio architetturale

### Regola chiave
**Il layer Project Supervision non ha progetti suoi.**

Ogni feature di supervisione deve essere legata a un **progetto TaskFlow già esistente**.

Quindi:

- niente `supervision_projects`
- niente copia dei task
- niente sincronizzazione tra due mondi
- niente secondo sistema permessi

Il modello corretto è:

- **Core layer** → progetto operativo
- **Supervision layer** → overlay manageriale sullo stesso progetto

---

## Obiettivi funzionali

Il layer deve servire a rispondere rapidamente a domande come:

- cosa sta per scadere?
- quali deliverable sono imminenti o in ritardo?
- quali milestone richiedono attenzione?
- quali task critici non hanno owner?
- quali attività di controllo o review vanno fatte periodicamente?
- qual è lo stato sintetico del progetto?

---

## Scope della prima versione

### V1 — minimo utile
Implementare 4 capability:

1. **Deliverables Register**
2. **Deadlines / Milestones Cockpit**
3. **Recurring Governance**
4. **Supervision Timeline**

Queste quattro danno il grosso del valore senza allargare troppo il perimetro.

---

## Decisioni architetturali già prese

Queste decisioni **non vanno lasciate aperte in implementazione**.

### 1. Milestone nel core
Nella V1 **le milestone non diventano una nuova entità core**.

Il layer supervision:
- usa il modello milestone già esistente nel progetto
- tratta le milestone come concetto derivato dai task/flag/dati attuali
- non apre in parallelo una seconda major refactor del core

L’eventuale promozione delle milestone a entità esplicita è una decisione futura, **fuori scope per V1**.

### 2. Recurring Governance e Rules Engine
Nella V1 **Recurring Governance NON estende il rules engine**.

Motivazione:
- `useRuleEngine` oggi è principalmente **event-driven**
- recurring governance è **time/schedule-driven**
- unirli subito allargherebbe troppo la superficie di rischio del motore più delicato del sistema

Decisione:
- recurring controls sono implementati come **scheduler leggero separato**
- il rules engine resta responsabile delle automazioni event-driven
- l’eventuale convergenza tra i due modelli si valuta **solo dopo la stabilizzazione di V1**

### 3. Deliverable ↔ Task linkage
Il link tra deliverable e task **non va modellato come array di ID** dentro il deliverable.

Decisione:
- usare una **junction table**
- evitare `linked_task_ids[]`
- mantenere join puliti, integrità referenziale e cleanup corretto su delete

### 4. Selector e logica di aggregazione
Il layer supervision **non deve duplicare logica già esistente**.

Decisione:
- overdue, due soon, ownerless, mappe per utente, filtri visibilità e metriche simili vanno **riusati**
- se oggi sono embedded in `HomeDashboard` o altri componenti, vanno **estratti in selector condivisi**
- il layer supervision introduce selector nuovi solo dove il core non copre già il caso

### 5. Migration strategy
Le migration del layer supervision devono essere:

- **additive**
- **forward-only**
- **senza impatti breaking sulle tabelle core**

Rollback operativo:
- rimozione del layer UI
- drop delle sole tabelle supervision introdotte

Nessun backfill complesso sulle tabelle core è previsto in V1.

### 6. Attivazione del layer
Nella V1 il layer si attiva tramite **`projectType`**.

Valori previsti:
- `standard`
- `supervised`
- `eu_project`

Decisione:
- **non usare un flag booleano alternativo**
- il tipo progetto è la sola modalità di attivazione prevista per V1

Motivazione:
- più leggibile
- più estendibile
- più utile lato UI
- permette evoluzioni future senza introdurre nuove convenzioni

---

## 1. Deliverables Register

### Scopo
Avere un oggetto più esplicito di “deliverable”, invece di derivarlo mentalmente da milestone + task.

### Dati minimi
Ogni deliverable deve avere almeno:

- `id`
- `projectId`
- `code` — es. `D1.2`
- `title`
- `description` opzionale
- `owner`
- `dueDate`
- `status` — `draft | in_progress | internal_review | submitted | accepted | delayed`
- `linkedMilestoneRef` opzionale
- `notes`
- `createdAt`
- `updatedAt`

### Link ai task
I task collegati non stanno in un array dentro il deliverable.

Usare invece:

```text
project_deliverable_tasks
- deliverable_id
- task_id
- created_at
```

### Comportamento
- i deliverable appartengono a un progetto esistente
- possono essere collegati a task del core
- possono essere collegati a una milestone esistente/derivata
- devono comparire in:
  - tabella registro
  - cockpit scadenze
  - supervision timeline

### UI minima
Tabella con:

- codice
- titolo
- owner
- scadenza
- stato
- link a task/milestone

Azioni:
- crea
- modifica
- filtra
- apri task collegati
- apri milestone collegata

### Nota progettuale
Il deliverable **non sostituisce** task o milestone:

- i task restano operativi
- la milestone resta elemento di timeline
- il deliverable è un oggetto manageriale di supervisione

---

## 2. Deadlines / Milestones Cockpit

### Scopo
Avere una vista unica per il controllo rapido del progetto.

### Cosa mostra
Almeno questi blocchi:

- milestone nei prossimi 7/14/30 giorni
- deliverable nei prossimi 7/14/30 giorni
- task in ritardo
- task senza owner
- task bloccati / dipendenti
- task ad alta priorità con due imminente
- deliverable delayed o in internal review

### Requisiti UX
- lettura in meno di 30 secondi
- filtri rapidi per finestra temporale
- click-through verso task, milestone, deliverable
- nessun editing pesante dentro il cockpit

### Fonte dati
Deve leggere quasi tutto dal core:

- `tasks`
- `milestones` derivate dal modello attuale
- `dependencies`
- `assignees`
- `status`
- `deliverables`

### Regola sui selector
Il cockpit deve **riusare prima di tutto** la logica già presente nel progetto.

Riutilizzare dove possibile:
- overdue logic
- due soon / due week logic
- owner map / user task map
- filtri di visibilità e permesso
- metriche già consolidate

Se queste logiche sono oggi embedded in `HomeDashboard` o altrove:
- vanno estratte in selector condivisi
- non riscritte dentro `supervision/`

### Principio
**Leggere molto, scrivere poco.**

Il cockpit è una vista di aggregazione, non un secondo pannello di CRUD completo.

---

## 3. Recurring Governance

### Scopo
Supportare controlli periodici e attività ricorrenti di gestione progetto.

### Use case
- review settimanale
- review mensile
- controllo avanzamento deliverable
- reminder periodico
- checkpoint di progetto
- meeting prep
- reporting interno

### Prima versione
Recurring Governance è un modulo leggero separato dal rules engine.

### Modello
Entità dedicata legata al progetto:

- `id`
- `projectId`
- `title`
- `description`
- `frequency` — `weekly | monthly | custom`
- `nextDueDate`
- `actionType` — `create_task | reminder_only`
- `templateTaskData` opzionale
- `active`

### Comportamento
Quando scatta:
- crea un task nel **core project**
  oppure
- genera un reminder / badge nel cockpit

### Nota importante
- non duplicare il rules engine esistente
- non introdurre un secondo engine general-purpose
- recurring controls coprono **solo** eventi temporali periodici

---

## 4. Supervision Timeline

### Scopo
Avere una timeline più manageriale rispetto alla timeline operativa del core.

### Deve evidenziare
- milestone
- deliverable
- slittamenti
- ritardi
- dipendenze essenziali
- finestre temporali
- stato sintetico degli item

### Differenza rispetto alla timeline attuale
La timeline core è task-centric.  
Questa deve essere **supervision-centric**.

Quindi:
- meno densità operativa
- più evidenza su milestone/deliverable/date critiche
- meno rumore

### Implementazione consigliata
Prima fase:
- derivare da task/milestone/deliverables esistenti
- non introdurre una seconda timeline engine
- creare una vista nuova sopra i dati esistenti

---

## Modello dati consigliato

### Nuove entità minime
1. `project_supervision_settings`
2. `project_deliverables`
3. `project_deliverable_tasks`
4. `project_recurring_controls`

### Esempio concettuale

```text
projects
tasks
sections
milestones (derivate dal modello task attuale)

project_supervision_settings
- project_id
- supervision_type   // standard | supervised | eu_project
- cockpit_window_default
- created_at
- updated_at

project_deliverables
- id
- project_id
- code
- title
- description
- owner
- due_date
- status
- linked_milestone_ref
- notes
- created_at
- updated_at

project_deliverable_tasks
- deliverable_id
- task_id
- created_at

project_recurring_controls
- id
- project_id
- title
- description
- frequency
- next_due_date
- action_type
- template_task_data
- active
- created_at
- updated_at
```

### Cosa NON aggiungere
- `supervision_projects`
- `supervision_tasks`
- permessi separati
- dashboard completamente separata
- secondo motore automazioni

---

## Relazione col core TaskFlow

### Interazione obbligatoria
Il layer supervision deve interagire direttamente con il core.

### Deve leggere da:
- tasks
- project metadata
- assignees
- priority
- due dates
- milestone derivate dal modello attuale
- dependencies
- approvals
- activity log, se utile

### Può scrivere:
- deliverables
- recurring controls
- task del core creati da recurring controls
- metadati supervision

### Non deve fare:
- duplicazione dei task
- sync manuale fra due sistemi
- logiche di ownership divergenti dal core

---

## Attivazione del layer

### Modalità scelta per V1
Il layer si attiva tramite **`projectType`**.

Valori previsti:
- `standard`
- `supervised`
- `eu_project`

### Comportamento atteso
- progetto `standard` → nessun layer supervision
- progetto `supervised` → abilita register/cockpit/timeline/recurring
- progetto `eu_project` → in futuro potrà abilitare anche risk register, partner view, reporting snapshot

---

## Struttura frontend consigliata

```text
src/
  supervision/
    components/
      DeliverablesRegister.jsx
      DeadlinesCockpit.jsx
      SupervisionTimeline.jsx
      RecurringControlsPanel.jsx
    hooks/
      useDeliverables.js
      useSupervisionMetrics.js
      useRecurringControls.js
    utils/
      supervisionSelectors.js
      supervisionStatus.js
    pages/
      ProjectSupervisionPage.jsx
```

### Regola
Questo modulo deve restare **isolato** dal core il più possibile.

Se serve toccare il core:
- farlo via adapter, selector o integrazione chiara
- non spargere logica supervision in tutte le view esistenti

---

## Integrazione UI consigliata

### Dentro il progetto esistente
Aggiungere una nuova tab o sezione:

- Overview
- Board
- List
- Calendar
- Timeline
- **Supervision**

### Dentro Supervision
Sottosezioni:
- Cockpit
- Deliverables
- Timeline
- Recurring

### Evitare
- nuova app
- routing parallelo completamente separato
- dashboard generale confusa con la dashboard supervision

---

## Permessi

### Regola
Riutilizzare i permessi del progetto core.

### Minimo:
- owner/editor → possono modificare deliverables e recurring controls
- viewer → sola lettura

### Evitare
Un secondo sistema permessi solo per supervision.

---

## Testing richiesto

Dato che questa è un’area di aggregazione e controllo, vanno testate soprattutto:

### Unit / integration
- selector di supervisione
- calcolo overdue / due soon / health
- join tra task, milestone derivate e deliverables
- recurring control → task creation
- filtri timeline supervision
- selector condivisi estratti da dashboard/core

### E2E
- abilitazione layer su progetto
- creazione deliverable
- visualizzazione cockpit con scadenze
- creazione recurring control
- recurring control che genera task core
- apertura da deliverable a task collegato

---

## Piano migration / rollout

### Regole
- migration additive
- forward-only
- nessuna modifica breaking alle tabelle core in V1
- nessun backfill complesso sul core

### Rollback
Se V1 va rimossa:
- si disabilita la tab/UI supervision
- si droppano solo le tabelle nuove del layer
- il core TaskFlow resta intatto

### Compatibilità
La V1 non richiede migrazioni distruttive né sostituzioni di strutture core esistenti.

---

## Ordine di implementazione consigliato

### Fase 1
1. `project_supervision_settings`
2. estrazione selector condivisi da dashboard/core per overdue, due soon, ownerless e viste aggregate
3. `project_deliverables`
4. `project_deliverable_tasks`
5. Deliverables Register
6. Deadlines Cockpit
7. aggiunta tab `Supervision`

### Fase 2
1. `project_recurring_controls`
2. Recurring Governance
3. Supervision Timeline

### Fase 3
- eventuale Risk / Issues Register
- eventuale reporting snapshot
- eventuale EU-project mode più ricco
- eventuale rivalutazione milestone come entità core

---

## Criteri di successo

Il layer è riuscito se:

- non duplica il core
- non crea un secondo sistema progetto/task
- permette di controllare progetto, scadenze e deliverable molto più velocemente
- riduce il bisogno di usare ClickUp per supervisione
- non aumenta in modo evidente la complessità del core TaskFlow

---

## Messaggio sintetico da inoltrare al programmatore

Vogliamo aggiungere a TaskFlow un layer opzionale di **Project Supervision** sopra i progetti esistenti, non una seconda app e non un secondo sistema di progetti. Il layer deve usare lo stesso `projectId`, leggere task/milestone derivate/due date/assignee dal core, e aggiungere solo ciò che oggi manca per la supervisione manageriale: **Deliverables Register, Deadlines Cockpit, Recurring Governance, Supervision Timeline**.  
Le nuove entità devono essere poche e isolate (`project_supervision_settings`, `project_deliverables`, `project_deliverable_tasks`, `project_recurring_controls`).  
Il principio architetturale è: **leggere molto dal core, scrivere poco, non duplicare task o permessi**.  
Recurring Governance resta separata dal rules engine nella V1. Le milestone restano derivate dal core nella V1. La feature è major e segue integralmente il Consolidation Playbook.

## Ticket iniziali suggeriti

1. Creare `project_supervision_settings` con attivazione via `projectType`.
2. Estrarre selector condivisi da dashboard/core per overdue, due soon, ownerless e viste aggregate.
3. Implementare `project_deliverables` + `project_deliverable_tasks` + CRUD base + tabella register.
4. Implementare selector/metrica per cockpit scadenze.
5. Aggiungere tab `Supervision` al progetto.
6. Implementare `project_recurring_controls` che creano task nel core.
7. Implementare supervision timeline derivata da milestone/task/deliverables.
8. Aggiungere test unit/integration sui selector e E2E sui flussi base.
