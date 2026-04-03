# Brief tecnico — Layer "Project Supervision" per TaskFlow

## Obiettivo

Aggiungere a TaskFlow un layer opzionale di **supervisione progetto** pensato per uso manageriale/single-user, utile a monitorare:

- scadenze
- milestone
- deliverable
- attività critiche
- timeline di progetto
- controlli periodici

Il layer **non deve creare una seconda app** e **non deve duplicare il core** di TaskFlow.
Deve vivere **sopra i progetti esistenti**, usando lo stesso `projectId` e riusando task, milestone, timeline, permessi, dashboard e viste già presenti.

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

## Obiettivi funzionali

Il layer deve servire a rispondere rapidamente a domande come:

- cosa sta per scadere?
- quali deliverable sono imminenti o in ritardo?
- quali milestone richiedono attenzione?
- quali task critici non hanno owner?
- quali attività di controllo o review vanno fatte periodicamente?
- qual è lo stato sintetico del progetto?

## Scope della prima versione

### V1 — minimo utile
Implementare 4 capability:

1. **Deliverables Register**
2. **Deadlines / Milestones Cockpit**
3. **Recurring Governance**
4. **Supervision Timeline**

Queste quattro danno il grosso del valore senza allargare troppo il perimetro.

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
- `linkedTaskIds[]`
- `linkedMilestoneId` opzionale
- `notes`
- `createdAt`
- `updatedAt`

### Comportamento
- i deliverable appartengono a un progetto esistente
- possono essere collegati a task del core
- possono essere collegati a una milestone esistente
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
- `milestones`
- `dependencies`
- `assignees`
- `status`
- `deliverables`

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
Non serve un engine nuovo.
Meglio una soluzione leggera, tipo:

### Modello
`project_supervision.recurringItems[]` oppure entità dedicata legata al progetto con:

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
Non duplicare il rules engine esistente.
Riutilizzare dove possibile la logica già presente.

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

### Opzione consigliata
Aggiungere **solo ciò che il core non ha già**.

### Nuove entità minime
1. `project_supervision_settings`
2. `project_deliverables`
3. `project_recurring_controls`

### Esempio concettuale

```text
projects
tasks
sections
milestones (già via task flag / task data)

project_supervision_settings
- project_id
- supervision_enabled
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
- linked_task_ids[]
- linked_milestone_id
- notes
- created_at
- updated_at

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
- milestones
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

### Scelta consigliata
Il layer deve essere **opzionale per progetto**.

### Due opzioni possibili
#### Opzione A — flag
`supervisionEnabled: true/false`

#### Opzione B — tipo progetto
`projectType: standard | supervised | eu_project`

### Raccomandazione
Meglio **tipo progetto**.

Perché:
- più leggibile
- più estendibile
- più utile lato UI
- permette template futuri

Esempio:
- progetto standard → nessun layer supervision
- progetto supervised → abilita register/cockpit/timeline/recurring
- progetto eu_project → in futuro abilita anche risk register, partner view, reporting snapshot

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
- join tra task, milestone e deliverables
- recurring control → task creation
- filtri timeline supervision

### E2E
- abilitazione layer su progetto
- creazione deliverable
- visualizzazione cockpit con scadenze
- creazione recurring control
- recurring control che genera task core
- apertura da deliverable a task collegato

---

## Ordine di implementazione consigliato

### Fase 1
- `project_supervision_settings`
- Deliverables Register
- Deadlines Cockpit

### Fase 2
- Recurring Governance
- Supervision Timeline

### Fase 3
- eventuale Risk / Issues Register
- eventuale reporting snapshot
- eventuale EU-project mode più ricco

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

Vogliamo aggiungere a TaskFlow un layer opzionale di **Project Supervision** sopra i progetti esistenti, non una seconda app e non un secondo sistema di progetti. Il layer deve usare lo stesso `projectId`, leggere task/milestone/due date/assignee dal core, e aggiungere solo ciò che oggi manca per la supervisione manageriale: **Deliverables Register, Deadlines Cockpit, Recurring Governance, Supervision Timeline**. Le nuove entità devono essere poche e isolate (`project_supervision_settings`, `project_deliverables`, `project_recurring_controls`). Il principio architetturale è: **leggere molto dal core, scrivere poco, non duplicare task o permessi**.

## Ticket iniziali suggeriti

1. Creare `project_supervision_settings` con attivazione per `projectType` o flag.
2. Implementare `project_deliverables` + CRUD base + tabella register.
3. Implementare selector/metrica per cockpit scadenze.
4. Aggiungere tab `Supervision` al progetto.
5. Implementare recurring controls che creano task nel core.
6. Implementare supervision timeline derivata da milestone/task/deliverables.
7. Aggiungere test unit/integration sui selector e E2E sui flussi base.
