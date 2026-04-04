export function content(lang) {
  const L = lang === 'it'
  return {
    start: L ? (
      <>
        <h3>Accesso</h3>
        <p>Vai su <code>/taskflow/</code> e accedi con email e password. Sono disponibili account di test con password <code>mimic2026</code>.</p>
        <h3>Autenticazione a due fattori (2FA)</h3>
        <p>Se l'admin ha configurato il 2FA, dopo il login ti verrà chiesto un codice a 6 cifre dall'app di autenticazione (Google Authenticator, Authy, ecc.). Al primo accesso con 2FA, scansiona il QR code mostrato a schermo.</p>
        <h3>Organizzazione</h3>
        <p>TaskFlow è multi-tenant: ogni organizzazione ha dati separati. Dopo il login, se appartieni a più organizzazioni puoi passare dall'una all'altra tramite il selettore nella barra laterale. Puoi anche richiedere l'accesso a organizzazioni esistenti, e l'admin riceverà la richiesta.</p>
      </>
    ) : (
      <>
        <h3>Signing in</h3>
        <p>Go to <code>/taskflow/</code> and sign in with email and password. Test accounts are available with password <code>mimic2026</code>.</p>
        <h3>Two-factor authentication (2FA)</h3>
        <p>If 2FA is configured by the admin, you'll be asked for a 6-digit code from your authenticator app (Google Authenticator, Authy, etc.) after login. On first enrollment, scan the QR code shown on screen.</p>
        <h3>Organization</h3>
        <p>TaskFlow is multi-tenant: each organization has separate data. After login, if you belong to multiple organizations you can switch between them via the selector in the sidebar. You can also request access to existing organizations — the admin will receive the request.</p>
      </>
    ),

    nav: L ? (
      <>
        <h3>Barra laterale (68px)</h3>
        <p>La barra a sinistra contiene la navigazione principale con queste voci:</p>
        <table>
          <thead><tr><th>Icona</th><th>Pagina</th><th>Descrizione</th></tr></thead>
          <tbody>
            <tr><td>🏠</td><td>Home</td><td>Dashboard con statistiche, grafici, scadenze e feed attività</td></tr>
            <tr><td>📊</td><td>Progetti</td><td>Lista di tutti i progetti con accesso rapido</td></tr>
            <tr><td>💼</td><td>Portfolios</td><td>Raggruppamenti di progetti per area</td></tr>
            <tr><td>✅</td><td>I miei task</td><td>Tutti i task assegnati a te, cross-progetto</td></tr>
            <tr><td>👥</td><td>People</td><td>Directory del team con ruoli e workload</td></tr>
            <tr><td>📬</td><td>Inbox</td><td>Feed di notifiche e attività (badge per non letti)</td></tr>
            <tr><td>🗑</td><td>Cestino</td><td>Elementi eliminati, con opzione di recupero</td></tr>
          </tbody>
        </table>
        <h3>Barra inferiore</h3>
        <p>Sotto la navigazione trovi: il pulsante Manuale (📖), il selettore lingua (IT/EN), il selettore tema (scuro/chiaro/automatico), l'indicatore stato database (verde = Supabase, giallo = localStorage, rosso = offline), e l'avatar utente (clic per logout).</p>
        <h3>Selettore organizzazione</h3>
        <p>In cima alla barra, subito sotto il logo, trovi il selettore organizzazione. Cliccaci per passare a un'altra organizzazione o crearne una nuova.</p>
      </>
    ) : (
      <>
        <h3>Sidebar (68px)</h3>
        <p>The left sidebar contains the main navigation:</p>
        <table>
          <thead><tr><th>Icon</th><th>Page</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>🏠</td><td>Home</td><td>Dashboard with stats, charts, deadlines, and activity feed</td></tr>
            <tr><td>📊</td><td>Projects</td><td>List of all projects with quick access</td></tr>
            <tr><td>💼</td><td>Portfolios</td><td>Project groupings by area</td></tr>
            <tr><td>✅</td><td>My Tasks</td><td>All tasks assigned to you, cross-project</td></tr>
            <tr><td>👥</td><td>People</td><td>Team directory with roles and workload</td></tr>
            <tr><td>📬</td><td>Inbox</td><td>Notification and activity feed (badge for unread)</td></tr>
            <tr><td>🗑</td><td>Trash</td><td>Deleted items with recovery option</td></tr>
          </tbody>
        </table>
        <h3>Bottom bar</h3>
        <p>Below the navigation: the Manual button (📖), language selector (IT/EN), theme selector (dark/light/auto), database status indicator (green = Supabase, yellow = localStorage, red = offline), and user avatar (click to sign out).</p>
        <h3>Organization selector</h3>
        <p>At the top of the sidebar, just below the logo, you'll find the organization selector. Click to switch to another organization or create a new one.</p>
      </>
    ),

    dashboard: L ? (
      <>
        <h3>Panoramica</h3>
        <p>La Dashboard mostra una visione d'insieme del tuo lavoro. È suddivisa in widget:</p>

        <h3>Metriche chiave (riga superiore)</h3>
        <p>Quattro card con: task aperti, scaduti, in scadenza oggi e questa settimana. Clic su "Vedi tutti" per andare alla lista task.</p>

        <h3>Avanzamento progetti</h3>
        <p>Barre di progresso per ogni progetto attivo. La percentuale indica il rapporto task completati / totali.</p>

        <h3>Scadenze in arrivo</h3>
        <p>I prossimi task in scadenza (7 giorni), ordinati per data. Mostra progetto, titolo e giorni rimanenti. In rosso se scaduti. Il widget ha un'altezza fissa con scorrimento interno per gestire molti elementi.</p>

        <h3>Attività recente</h3>
        <p>Feed delle ultime 15 azioni: task creati, completati, commentati, assegnati e spostati. I timestamp relativi ("2m", "3h", "1d") si aggiornano automaticamente ogni 15 secondi. Il widget ha un'altezza fissa con scorrimento interno (stile Asana). I timestamp derivano dal log attività del task e dai campi <code>updated_at</code>/<code>created_at</code> del database per la massima accuratezza.</p>

        <h3>Salute dei progetti</h3>
        <p>Un pannello con lo stato di ogni progetto: 🟢 In linea (meno del 10% scaduti), 🟡 A rischio (10-25%), 🔴 Fuori rotta (oltre 25%).</p>

        <h3>Grafici (10 tipi)</h3>
        <ol>
          <li><strong>Task per persona</strong> — barre: aperti vs completati per membro</li>
          <li><strong>Task per priorità</strong> — donut: alta/media/bassa</li>
          <li><strong>Attività ultime 2 settimane</strong> — area: creati vs completati</li>
          <li><strong>Burndown</strong> — linea: rimanenti vs ideale</li>
          <li><strong>Velocità settimanale</strong> — linea: task completati per settimana</li>
          <li><strong>Task per stato</strong> — torta: aperti/completati</li>
          <li><strong>Scaduti per progetto</strong> — barre orizzontali</li>
          <li><strong>Completamento per sezione</strong> — barre impilate</li>
          <li><strong>Carico di lavoro</strong> — barre con indicatore di capacità</li>
          <li><strong>Tutti i grafici</strong> sono interattivi: passa il mouse per i tooltip</li>
        </ol>

        <h3>Personalizzazione dashboard</h3>
        <p>Clicca "⚙ Personalizza" per entrare in modalità modifica. Puoi:</p>
        <ul>
          <li><strong>Nascondere/mostrare</strong> singoli widget con il toggle visibilità</li>
          <li><strong>Ridimensionare</strong> ogni widget ciclando tra tre dimensioni (S/M/L)</li>
          <li><strong>Riordinare</strong> i widget con drag & drop nativo HTML5</li>
        </ul>
        <p>Il layout viene salvato in localStorage e ripristinato automaticamente. Usa "Ripristina layout" per tornare al default.</p>
      </>
    ) : (
      <>
        <h3>Overview</h3>
        <p>The Dashboard provides an overview of your work, divided into widgets:</p>

        <h3>Key metrics (top row)</h3>
        <p>Four cards showing: open tasks, overdue, due today, and due this week. Click "See all" to go to the task list.</p>

        <h3>Project progress</h3>
        <p>Progress bars for each active project. Percentage shows completed/total tasks ratio.</p>

        <h3>Upcoming deadlines</h3>
        <p>Next tasks due (7 days), sorted by date. Shows project, title and remaining days. Red if overdue. The widget has a fixed height with internal scrolling for many items.</p>

        <h3>Recent activity</h3>
        <p>Feed of the last 15 actions: tasks created, completed, commented, assigned, and moved. Relative timestamps ("2m", "3h", "1d") auto-refresh every 15 seconds. The widget has a fixed height with internal scrolling (Asana-style). Timestamps are derived from the task activity log and DB <code>updated_at</code>/<code>created_at</code> fields for accuracy.</p>

        <h3>Project health</h3>
        <p>A panel showing each project's status: 🟢 On track (less than 10% overdue), 🟡 At risk (10-25%), 🔴 Off track (over 25%).</p>

        <h3>Charts (10 types)</h3>
        <ol>
          <li><strong>Tasks per person</strong> — bars: open vs completed per member</li>
          <li><strong>Tasks by priority</strong> — donut: high/medium/low</li>
          <li><strong>Activity last 2 weeks</strong> — area: created vs completed</li>
          <li><strong>Burndown</strong> — line: remaining vs ideal</li>
          <li><strong>Weekly velocity</strong> — line: tasks completed per week</li>
          <li><strong>Tasks by status</strong> — pie: open/completed</li>
          <li><strong>Overdue by project</strong> — horizontal bars</li>
          <li><strong>Completion by section</strong> — stacked bars</li>
          <li><strong>Workload</strong> — bars with capacity indicator</li>
          <li><strong>All charts</strong> are interactive: hover for tooltips</li>
        </ol>

        <h3>Dashboard customization</h3>
        <p>Click "⚙ Customize" to enter edit mode. You can:</p>
        <ul>
          <li><strong>Show/hide</strong> individual widgets with the visibility toggle</li>
          <li><strong>Resize</strong> each widget by cycling through three sizes (S/M/L)</li>
          <li><strong>Reorder</strong> widgets with native HTML5 drag & drop</li>
        </ul>
        <p>Layout is saved in localStorage and automatically restored. Use "Reset layout" to return to defaults.</p>
      </>
    ),

    projects: L ? (
      <>
        <h3>Lista progetti</h3>
        <p>Dalla pagina Progetti vedi tutti i progetti dell'organizzazione. Ogni card mostra: nome, colore, owner, portfolio, stato e conteggio task. Usa il campo di ricerca per filtrare.</p>

        <h3>Creare un progetto</h3>
        <p>Clicca "+ Crea progetto". Compila: nome, colore, portfolio (opzionale) e template. I template disponibili sono:</p>
        <ul>
          <li><strong>Vuoto</strong> — nessuna sezione predefinita</li>
          <li><strong>Kanban</strong> — sezioni: Da fare, In corso, In revisione, Fatto</li>
          <li><strong>Sprint</strong> — sezioni: Backlog, Sprint corrente, In corso, QA, Fatto</li>
          <li><strong>Ricerca</strong> — sezioni: Letteratura, Sperimentale, Analisi, Pubblicazione</li>
          <li><strong>Product Launch</strong> — sezioni: Pianificazione, Sviluppo, Test, Lancio</li>
        </ul>
        <p>I template pre-caricano anche regole, form, obiettivi e campi personalizzati di esempio.</p>

        <h3>Stato del progetto</h3>
        <p>In ProjectOverview puoi impostare lo stato: On track (verde), At risk (giallo), Off track (rosso). Lo stato viene mostrato in Dashboard e nella lista progetti.</p>

        <h3>Risorse del progetto</h3>
        <p>Nella sezione "Risorse" di ProjectOverview puoi aggiungere link esterni (documenti, Figma, repo, ecc.) con titolo e URL.</p>

        <h3>Campi personalizzati</h3>
        <p>Ogni progetto può avere campi personalizzati (testo, numero, select, checkbox, data…). Definiscili in ProjectOverview → "Campi personalizzati". I valori vengono mostrati nel pannello task.</p>

        <h3>Template task</h3>
        <p>In ProjectOverview → "Template task", salva un task esistente come template riutilizzabile. Il template cattura titolo, descrizione, priorità, tag e lista subtask. Quando crei un nuovo task, puoi selezionare un template dal dropdown per pre-compilare i campi.</p>

        <h3>Permessi granulari</h3>
        <p>In ProjectOverview puoi configurare permessi a più livelli:</p>
        <ul>
          <li><strong>Ruoli per progetto</strong> — assegna Owner, Editor o Viewer a ogni membro. Quando aggiungi un membro, scegli il ruolo dal dropdown</li>
          <li><strong>Trasferimento ownership</strong> — l'admin può trasferire la proprietà di un progetto a un altro membro dal pannello membri</li>
          <li><strong>Visibilità progetto</strong> — tutta l'organizzazione, solo membri o solo assegnatari</li>
          <li><strong>Accesso per sezione</strong> — limita la visibilità di singole sezioni a editor e owner</li>
          <li><strong>Visibilità task</strong> — ogni task può essere visibile a tutti o solo agli assegnatari</li>
        </ul>

        <h3>Badge membri nella sidebar</h3>
        <p>La sidebar mostra piccoli avatar (iniziali) per ogni progetto, indicando i membri del progetto. Fino a 3 avatar sono visibili, con un contatore "+N" per i rimanenti.</p>

        <h3>Portfolios</h3>
        <p>I portfolios raggruppano più progetti. Crea un portfolio dalla pagina Portfolios, poi associa i progetti. La barra di progresso del portfolio aggrega i dati di tutti i progetti al suo interno.</p>
      </>
    ) : (
      <>
        <h3>Project list</h3>
        <p>From the Projects page you see all organization projects. Each card shows: name, color, owner, portfolio, status and task count. Use the search field to filter.</p>

        <h3>Creating a project</h3>
        <p>Click "+ Create project". Fill in: name, color, portfolio (optional) and template. Available templates are:</p>
        <ul>
          <li><strong>Blank</strong> — no default sections</li>
          <li><strong>Kanban</strong> — sections: To Do, In Progress, In Review, Done</li>
          <li><strong>Sprint</strong> — sections: Backlog, Current Sprint, In Progress, QA, Done</li>
          <li><strong>Research</strong> — sections: Literature, Experimental, Analysis, Publication</li>
          <li><strong>Product Launch</strong> — sections: Planning, Development, Testing, Launch</li>
        </ul>
        <p>Templates also preload sample rules, forms, goals, and custom fields.</p>

        <h3>Project status</h3>
        <p>In ProjectOverview you can set status: On track (green), At risk (yellow), Off track (red). Status is shown in Dashboard and project list.</p>

        <h3>Project resources</h3>
        <p>In the "Resources" section of ProjectOverview you can add external links (documents, Figma, repos, etc.) with a title and URL.</p>

        <h3>Custom fields</h3>
        <p>Each project can have custom fields (text, number, select, checkbox, date…). Define them in ProjectOverview → "Custom fields". Values appear in the task panel.</p>

        <h3>Task templates</h3>
        <p>In ProjectOverview → "Task Templates", save an existing task as a reusable template. The template captures title, description, priority, tags and subtask list. When creating a new task, you can select a template from the dropdown to pre-fill the form.</p>

        <h3>Granular permissions</h3>
        <p>In ProjectOverview you can configure permissions at multiple levels:</p>
        <ul>
          <li><strong>Per-project roles</strong> — assign Owner, Editor or Viewer to each member. When adding a member, choose the role from the dropdown</li>
          <li><strong>Ownership transfer</strong> — admins can transfer project ownership to any member from the members panel</li>
          <li><strong>Project visibility</strong> — entire organization, members only, or assignees only</li>
          <li><strong>Section access</strong> — limit section visibility to editors and owners</li>
          <li><strong>Task visibility</strong> — each task can be visible to everyone or assignees only</li>
        </ul>

        <h3>Member badges in sidebar</h3>
        <p>The sidebar shows small avatars (initials) for each project, indicating its members. Up to 3 avatars are shown, with a "+N" counter for the rest.</p>

        <h3>Portfolios</h3>
        <p>Portfolios group multiple projects. Create a portfolio from the Portfolios page, then associate projects. The portfolio progress bar aggregates data from all its projects.</p>
      </>
    ),

    tasks: L ? (
      <>
        <h3>Creare un task</h3>
        <p>Ci sono tre modi:</p>
        <ol>
          <li><strong>Pulsante "+ Task"</strong> — apre un modale con titolo, sezione, priorità, assegnatario e scadenza</li>
          <li><strong>AI</strong> — nel modale, clicca "Crea con AI", descrivi il task in linguaggio naturale e premi "Genera"</li>
          <li><strong>Form</strong> — se il progetto ha form configurati, compilali per creare task strutturati</li>
        </ol>

        <h3>Pannello dettaglio task</h3>
        <p>Clic su un task per aprire il pannello laterale destro. Qui puoi modificare tutti i campi:</p>
        <ul>
          <li><strong>Titolo e descrizione</strong> — modifica inline</li>
          <li><strong>Sezione</strong> — dropdown per spostare il task</li>
          <li><strong>Priorità</strong> — Alta (rossa), Media (gialla), Bassa (verde)</li>
          <li><strong>Assegnatari multipli</strong> — seleziona più membri dal dropdown. Ogni assegnatario appare come tag rimovibile. Il filtro per assegnatario controlla l'inclusione nell'array.</li>
          <li><strong>Milestone</strong> — checkbox per contrassegnare il task come milestone. I milestone appaiono come diamanti ◆ nella Timeline e nel Calendario.</li>
          <li><strong>Visibilità task</strong> — controlla chi può vedere il task: tutti, solo gli assegnatari.</li>
          <li><strong>Scadenza e data inizio</strong> — date picker</li>
          <li><strong>Tag</strong> — aggiungi etichette colorate, filtra per tag</li>
          <li><strong>Ricorrenza</strong> — giornaliera, settimanale, mensile o personalizzata (ogni N giorni)</li>
        </ul>

        <h3>Sottoattività</h3>
        <p>Aggiungi checklist items sotto il task principale. Puoi generarle automaticamente con l'AI cliccando "✦ Riepilogo AI" → genera sottoattività. Quando tutti i subtask sono completati, il trigger "subtask completati" può far scattare una regola (vedi Automazione).</p>

        <h3>Commenti e @menzioni</h3>
        <p>Aggiungi commenti in fondo al task. Usa <code>@NomeUtente</code> per menzionare qualcuno — riceverà una notifica nell'Inbox.</p>

        <h3>Dipendenze</h3>
        <p>Collega i task tra loro con relazioni "Blocca" / "Bloccato da". Un task bloccato mostra un indicatore arancione. Quando il blocco viene rimosso (task completato), viene inviata una notifica.</p>

        <h3>Allegati</h3>
        <p>Carica file al task. I file vengono salvati su Supabase Storage. Puoi eliminare singoli allegati.</p>

        <h3>Log attività</h3>
        <p>Ogni task ha un log delle modifiche (chi ha cambiato cosa e quando). Espandibile con "Mostra tutte".</p>

        <h3>Eliminazione e undo</h3>
        <p>I task eliminati finiscono nel Cestino (soft delete) e possono essere recuperati. Inoltre, molte azioni hanno un bottone "Annulla" nel toast che appare per 8 secondi.</p>
      </>
    ) : (
      <>
        <h3>Creating a task</h3>
        <p>There are three ways:</p>
        <ol>
          <li><strong>"+ Task" button</strong> — opens a modal with title, section, priority, assignee and due date</li>
          <li><strong>AI</strong> — in the modal, click "Create with AI", describe the task in natural language and press "Generate"</li>
          <li><strong>Form</strong> — if the project has configured forms, fill them to create structured tasks</li>
        </ol>

        <h3>Task detail panel</h3>
        <p>Click on a task to open the right side panel. Here you can edit all fields:</p>
        <ul>
          <li><strong>Title and description</strong> — inline editing</li>
          <li><strong>Section</strong> — dropdown to move the task</li>
          <li><strong>Priority</strong> — High (red), Medium (yellow), Low (green)</li>
          <li><strong>Multiple assignees</strong> — select multiple members from the dropdown. Each assignee appears as a removable tag. The assignee filter checks array inclusion.</li>
          <li><strong>Milestone</strong> — checkbox to mark the task as a milestone. Milestones appear as diamonds ◆ in Timeline and Calendar views.</li>
          <li><strong>Task visibility</strong> — control who can see the task: everyone or assignees only.</li>
          <li><strong>Due date and start date</strong> — date pickers</li>
          <li><strong>Tags</strong> — add colored labels, filter by tag</li>
          <li><strong>Recurrence</strong> — daily, weekly, monthly or custom (every N days)</li>
        </ul>

        <h3>Subtasks</h3>
        <p>Add checklist items under the main task. You can auto-generate them with AI by clicking "✦ AI Summary" → generate subtasks. When all subtasks are completed, the "subtasks completed" trigger can fire a rule (see Automation).</p>

        <h3>Comments & @mentions</h3>
        <p>Add comments at the bottom of the task. Use <code>@Username</code> to mention someone — they'll receive an Inbox notification.</p>

        <h3>Dependencies</h3>
        <p>Link tasks with "Blocking" / "Blocked by" relationships. A blocked task shows an orange indicator. When the blocker is completed, a notification is sent.</p>

        <h3>Attachments</h3>
        <p>Upload files to the task. Files are stored on Supabase Storage. You can delete individual attachments.</p>

        <h3>Activity log</h3>
        <p>Each task has a change log (who changed what and when). Expandable with "Show all".</p>

        <h3>Deletion and undo</h3>
        <p>Deleted tasks go to Trash (soft delete) and can be recovered. Also, many actions have an "Undo" button in the toast that appears for 8 seconds.</p>
      </>
    ),

    views: L ? (
      <>
        <h3>Board (Kanban)</h3>
        <p>Vista a colonne per sezione. Trascina i task tra le sezioni. Doppio clic sull'intestazione di sezione per rinominarla. Pulsante "+" in fondo a ogni colonna per aggiungere task rapidi.</p>

        <h3>Lista</h3>
        <p>Tabella ordinabile per titolo, priorità, assegnatario, scadenza, stato. Supporta selezione multipla per azioni in blocco: cambiare priorità, assegnatario o stato a più task contemporaneamente.</p>

        <h3>Calendario</h3>
        <p>Due modalità: mese e settimana. I task sono posizionati per data di scadenza. Drag & drop per ripianificare. I task scaduti sono evidenziati in rosso. Colore per priorità o progetto.</p>

        <h3>Timeline (Gantt)</h3>
        <p>Visualizzazione temporale con barre di durata (da "inizio" a "scadenza"). Le frecce indicano le dipendenze tra task. I task contrassegnati come milestone appaiono come diamanti ◆. Trascina le barre per ripianificare, trascina i bordi per cambiare durata. Passa il mouse per i dettagli. Zoom e pan con scroll e drag.</p>

        <h3>Overview</h3>
        <p>Pagina di impostazioni del progetto: descrizione, stato, risorse, membri, campi personalizzati, progresso, attività recente, regole, form, obiettivi. Qui trovi anche il pulsante "Genera Report (PDF)".</p>

        <h3>Cambio vista</h3>
        <p>Usa i tab nella barra superiore del progetto per passare tra Board, Lista, Calendario, Timeline e Overview.</p>
      </>
    ) : (
      <>
        <h3>Board (Kanban)</h3>
        <p>Column view by section. Drag tasks between sections. Double-click section headers to rename. "+" button at the bottom of each column for quick task creation.</p>

        <h3>List</h3>
        <p>Sortable table by title, priority, assignee, due date, status. Supports multi-select for bulk actions: change priority, assignee or status for multiple tasks at once.</p>

        <h3>Calendar</h3>
        <p>Two modes: month and week. Tasks are positioned by due date. Drag & drop to reschedule. Overdue tasks are highlighted in red. Color by priority or project.</p>

        <h3>Timeline (Gantt)</h3>
        <p>Time-based view with duration bars (from start to due date). Arrows show dependencies. Tasks marked as milestones appear as diamonds ◆. Drag bars to reschedule, drag edges to change duration. Hover for details. Zoom and pan with scroll and drag.</p>

        <h3>Overview</h3>
        <p>Project settings page: description, status, resources, members, custom fields, progress, recent activity, rules, forms, goals. Here you'll also find the "Generate Report (PDF)" button.</p>

        <h3>Switching views</h3>
        <p>Use the tabs in the project header bar to switch between Board, List, Calendar, Timeline and Overview.</p>
      </>
    ),

    automation: L ? (
      <>
        <h3>Come funziona</h3>
        <p>Ogni progetto può avere regole di automazione. Le regole vengono valutate automaticamente dopo ogni modifica a un task e periodicamente (ogni 60 secondi per le scadenze). Vai in ProjectOverview → sezione "Regole" per configurarle.</p>

        <h3>Trigger (8 tipi)</h3>
        <table>
          <thead><tr><th>Trigger</th><th>Si attiva quando…</th></tr></thead>
          <tbody>
            <tr><td>Task spostata in sezione</td><td>Un task viene spostato in una sezione specifica (o qualsiasi)</td></tr>
            <tr><td>Scadenza in avvicinamento</td><td>Mancano N giorni alla scadenza (configurabile)</td></tr>
            <tr><td>Tutti i subtask completati</td><td>Tutti i subtask del task sono segnati come fatti</td></tr>
            <tr><td>Task assegnata</td><td>Il task viene assegnato a qualcuno</td></tr>
            <tr><td>Priorità cambiata</td><td>La priorità del task cambia (opzionalmente a un valore specifico)</td></tr>
            <tr><td>Commento aggiunto</td><td>Viene aggiunto un nuovo commento</td></tr>
            <tr><td>Task completata</td><td>Il task viene segnato come completato</td></tr>
            <tr><td>Tag aggiunto</td><td>Viene aggiunto un tag (opzionalmente uno specifico)</td></tr>
          </tbody>
        </table>

        <h3>Azioni (10 tipi)</h3>
        <table>
          <thead><tr><th>Azione</th><th>Cosa fa</th></tr></thead>
          <tbody>
            <tr><td>Sposta in sezione</td><td>Muove il task in una sezione specifica</td></tr>
            <tr><td>Invia notifica</td><td>Mostra un toast e aggiunge un messaggio all'Inbox (supporta <code>{'{task}'}</code> e <code>{'{who}'}</code>)</td></tr>
            <tr><td>Imposta priorità</td><td>Cambia la priorità del task</td></tr>
            <tr><td>Segna come completata</td><td>Completa automaticamente il task</td></tr>
            <tr><td>Assegna a</td><td>Assegna il task a un membro del team</td></tr>
            <tr><td>Aggiungi tag</td><td>Aggiunge un tag al task</td></tr>
            <tr><td>Imposta scadenza</td><td>Imposta la scadenza a +N giorni da oggi</td></tr>
            <tr><td>Crea subtask</td><td>Crea automaticamente un subtask con titolo specifico</td></tr>
            <tr><td>Webhook (HTTP POST)</td><td>Invia un POST JSON a un URL esterno con i dati del task (fire-and-forget). Supporta header di autenticazione.</td></tr>
            <tr><td>Invia email</td><td>Invia un'email via Edge Function con oggetto e corpo personalizzabili (supporta <code>{'{task}'}</code>, <code>{'{who}'}</code>, <code>{'{due}'}</code>)</td></tr>
          </tbody>
        </table>

        <h3>Multi-azione e condizioni</h3>
        <p>Ogni regola può avere più azioni (eseguite in sequenza) e condizioni (filtri). Le condizioni sono in AND: la regola si attiva solo se tutte le condizioni sono soddisfatte. Le condizioni disponibili sono: priorità, assegnatario, tag e sezione.</p>

        <h3>Sicurezza</h3>
        <p>Il motore ha protezioni anti-loop: profondità massima 3, finestra di dedup 500ms, e circuit breaker a 20 esecuzioni per ciclo di valutazione.</p>
      </>
    ) : (
      <>
        <h3>How it works</h3>
        <p>Each project can have automation rules. Rules are evaluated automatically after every task change and periodically (every 60 seconds for deadlines). Go to ProjectOverview → "Rules" section to configure them.</p>

        <h3>Triggers (8 types)</h3>
        <table>
          <thead><tr><th>Trigger</th><th>Fires when…</th></tr></thead>
          <tbody>
            <tr><td>Task moved to section</td><td>A task is moved to a specific section (or any)</td></tr>
            <tr><td>Deadline approaching</td><td>N days before the due date (configurable)</td></tr>
            <tr><td>All subtasks completed</td><td>All subtasks of the task are marked done</td></tr>
            <tr><td>Task assigned</td><td>The task gets an assignee</td></tr>
            <tr><td>Priority changed</td><td>Task priority changes (optionally to a specific value)</td></tr>
            <tr><td>Comment added</td><td>A new comment is posted</td></tr>
            <tr><td>Task completed</td><td>The task is marked as completed</td></tr>
            <tr><td>Tag added</td><td>A tag is added (optionally a specific one)</td></tr>
          </tbody>
        </table>

        <h3>Actions (10 types)</h3>
        <table>
          <thead><tr><th>Action</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td>Move to section</td><td>Moves the task to a specific section</td></tr>
            <tr><td>Send notification</td><td>Shows a toast and adds a message to Inbox (supports <code>{'{task}'}</code> and <code>{'{who}'}</code>)</td></tr>
            <tr><td>Set priority</td><td>Changes the task priority</td></tr>
            <tr><td>Mark complete</td><td>Auto-completes the task</td></tr>
            <tr><td>Assign to</td><td>Assigns the task to a team member</td></tr>
            <tr><td>Add tag</td><td>Adds a tag to the task</td></tr>
            <tr><td>Set due date</td><td>Sets due date to +N days from today</td></tr>
            <tr><td>Create subtask</td><td>Auto-creates a subtask with a specific title</td></tr>
            <tr><td>Webhook (HTTP POST)</td><td>Sends a JSON POST to an external URL with task data (fire-and-forget). Supports authentication headers.</td></tr>
            <tr><td>Send email</td><td>Sends an email via Edge Function with customizable subject and body (supports <code>{'{task}'}</code>, <code>{'{who}'}</code>, <code>{'{due}'}</code>)</td></tr>
          </tbody>
        </table>

        <h3>Multi-action & conditions</h3>
        <p>Each rule can have multiple actions (executed sequentially) and conditions (filters). Conditions use AND logic: the rule fires only if all conditions are met. Available conditions: priority, assignee, tag and section.</p>

        <h3>Safety</h3>
        <p>The engine has anti-loop protections: max depth 3, dedup window 500ms, and circuit breaker at 20 fires per evaluation cycle.</p>
      </>
    ),

    forms: L ? (
      <>
        <h3>Panoramica</h3>
        <p>I Form permettono di creare task strutturati tramite moduli personalizzati. Ideali per segnalazioni bug, richieste funzionalità, onboarding, ecc. Configura i form in ProjectOverview → "Form".</p>

        <h3>Creare un form</h3>
        <p>Ogni form ha un nome, una descrizione opzionale e una sezione di destinazione (dove finirà il task creato). Poi aggiungi i campi:</p>
        <ul>
          <li><strong>Testo</strong> — input a riga singola</li>
          <li><strong>Testo lungo</strong> — textarea multi-riga</li>
          <li><strong>Select</strong> — dropdown con opzioni personalizzate</li>
          <li><strong>Data</strong> — date picker</li>
          <li><strong>Numero</strong> — input numerico</li>
          <li><strong>Checkbox</strong> — spunta sì/no</li>
          <li><strong>URL</strong> — link</li>
          <li><strong>Email</strong> — indirizzo email</li>
        </ul>

        <h3>Mapping dei campi</h3>
        <p>Ogni campo può essere mappato a una proprietà del task: Titolo, Descrizione, Assegnatario, Scadenza o Priorità. I campi non mappati vengono aggiunti alla descrizione del task come testo formattato.</p>

        <h3>Opzioni avanzate</h3>
        <p>Per ogni campo puoi impostare: obbligatorio/opzionale, placeholder, valore predefinito. L'ordine dei campi è modificabile con i pulsanti freccia ▲▼.</p>

        <h3>Compilazione</h3>
        <p>Cliccando su un form si apre un modale di compilazione. Dopo l'invio, un task viene creato nella sezione destinazione con i valori mappati.</p>
      </>
    ) : (
      <>
        <h3>Overview</h3>
        <p>Forms let you create structured tasks via custom forms. Ideal for bug reports, feature requests, onboarding, etc. Configure forms in ProjectOverview → "Forms".</p>

        <h3>Creating a form</h3>
        <p>Each form has a name, an optional description and a target section (where the created task will go). Then add fields:</p>
        <ul>
          <li><strong>Text</strong> — single-line input</li>
          <li><strong>Long text</strong> — multi-line textarea</li>
          <li><strong>Select</strong> — dropdown with custom options</li>
          <li><strong>Date</strong> — date picker</li>
          <li><strong>Number</strong> — numeric input</li>
          <li><strong>Checkbox</strong> — yes/no toggle</li>
          <li><strong>URL</strong> — link</li>
          <li><strong>Email</strong> — email address</li>
        </ul>

        <h3>Field mapping</h3>
        <p>Each field can be mapped to a task property: Title, Description, Assignee, Due date or Priority. Unmapped fields are added to the task description as formatted text.</p>

        <h3>Advanced options</h3>
        <p>For each field you can set: required/optional, placeholder, default value. Field order can be changed with the ▲▼ arrow buttons.</p>

        <h3>Submission</h3>
        <p>Clicking on a form opens a submission modal. After submitting, a task is created in the target section with the mapped values.</p>
      </>
    ),

    goals: L ? (
      <>
        <h3>Panoramica</h3>
        <p>Gli Obiettivi permettono di tracciare traguardi di progetto con key results (risultati chiave). Configura gli obiettivi in ProjectOverview → "Obiettivi".</p>

        <h3>Struttura</h3>
        <p>Ogni obiettivo ha un nome e un anello di progresso (SVG). Il progresso viene calcolato automaticamente in base al completamento dei task collegati. Puoi avere:</p>
        <ul>
          <li><strong>Obiettivi semplici</strong> — collegati direttamente ai task</li>
          <li><strong>Obiettivi con sotto-obiettivi</strong> — ogni sotto-obiettivo (Key Result) ha i suoi task collegati. Il progresso del parent si calcola come media dei sotto-obiettivi.</li>
        </ul>

        <h3>Collegare i task</h3>
        <p>In ogni sotto-obiettivo, usa le checkbox per collegare/scollegare i task del progetto. Il progresso si aggiorna in tempo reale quando completi i task.</p>
      </>
    ) : (
      <>
        <h3>Overview</h3>
        <p>Goals let you track project milestones with key results. Configure goals in ProjectOverview → "Goals".</p>

        <h3>Structure</h3>
        <p>Each goal has a name and a progress ring (SVG). Progress is calculated automatically based on linked task completion. You can have:</p>
        <ul>
          <li><strong>Simple goals</strong> — linked directly to tasks</li>
          <li><strong>Goals with sub-goals</strong> — each sub-goal (Key Result) has its own linked tasks. Parent progress is calculated as the average of sub-goals.</li>
        </ul>

        <h3>Linking tasks</h3>
        <p>In each sub-goal, use checkboxes to link/unlink project tasks. Progress updates in real time when you complete tasks.</p>
      </>
    ),

    time: L ? (
      <>
        <h3>Panoramica</h3>
        <p>Ogni task ha una sezione "Tracciamento tempo" nel pannello dettaglio. Puoi registrare il tempo in due modi:</p>

        <h3>Timer</h3>
        <p>Premi "Avvia" per far partire il cronometro. Il tempo trascorso viene mostrato in tempo reale. Premi "Stop" per salvare l'entry. Il timer persiste mentre navighi nell'app.</p>

        <h3>Inserimento manuale</h3>
        <p>Premi "Manuale" per inserire ore e minuti direttamente. Opzionalmente aggiungi una nota descrittiva.</p>

        <h3>Storico</h3>
        <p>Tutte le entry vengono mostrate in ordine cronologico inverso con: avatar utente, durata, nota e data. Puoi eliminare singole entry. Il totale delle ore registrate è mostrato nel titolo della sezione.</p>
      </>
    ) : (
      <>
        <h3>Overview</h3>
        <p>Each task has a "Time Tracking" section in the detail panel. You can log time in two ways:</p>

        <h3>Timer</h3>
        <p>Press "Start" to begin the timer. Elapsed time is shown in real time. Press "Stop" to save the entry. The timer persists while navigating the app.</p>

        <h3>Manual entry</h3>
        <p>Press "Manual" to enter hours and minutes directly. Optionally add a descriptive note.</p>

        <h3>History</h3>
        <p>All entries are shown in reverse chronological order with: user avatar, duration, note and date. You can delete individual entries. Total logged hours are shown in the section title.</p>
      </>
    ),

    approvals: L ? (
      <>
        <h3>Panoramica</h3>
        <p>Il flusso di approvazione è disponibile nel pannello task sotto "Approvazione". Serve per richiedere e ottenere l'approvazione di un lavoro prima di procedere.</p>

        <h3>Flusso</h3>
        <ol>
          <li><strong>Richiedi</strong> — l'autore clicca "Richiedi approvazione" con una nota opzionale. Una notifica viene inviata.</li>
          <li><strong>In attesa</strong> — il badge mostra "In attesa" finché l'approvatore non agisce.</li>
          <li><strong>Risolvi</strong> — l'approvatore può: Approvare ✅, Rifiutare ❌ o Richiedere modifiche 🔄. Può aggiungere un commento.</li>
          <li><strong>Ri-invia</strong> — se rifiutato o con modifiche richieste, l'autore può ri-inviare la richiesta.</li>
        </ol>

        <h3>Indicatori</h3>
        <p>Lo stato di approvazione (icona) appare sulle card dei task in Board e Lista, così è facile vedere a colpo d'occhio quali task sono in attesa di approvazione.</p>
      </>
    ) : (
      <>
        <h3>Overview</h3>
        <p>The approval workflow is available in the task panel under "Approval". Use it to request and get approval on work before proceeding.</p>

        <h3>Flow</h3>
        <ol>
          <li><strong>Request</strong> — the author clicks "Request approval" with an optional note. A notification is sent.</li>
          <li><strong>Pending</strong> — the badge shows "Pending" until the approver acts.</li>
          <li><strong>Resolve</strong> — the approver can: Approve ✅, Reject ❌ or Request changes 🔄. They can add a comment.</li>
          <li><strong>Resubmit</strong> — if rejected or changes requested, the author can resubmit the request.</li>
        </ol>

        <h3>Indicators</h3>
        <p>Approval status (icon) appears on task cards in Board and List views, making it easy to see at a glance which tasks are pending approval.</p>
      </>
    ),

    ai: L ? (
      <>
        <h3>Prerequisiti</h3>
        <p>Le funzioni AI richiedono che sia configurata la variabile <code>VITE_AI_PROXY_URL</code> (Edge Function Supabase). Se non è configurata, le funzioni AI sono disabilitate automaticamente — l'app funziona normalmente senza.</p>

        <h3>Generazione sottoattività</h3>
        <p>Nel pannello task, il pulsante "✦ Riepilogo AI" genera automaticamente una lista di sottoattività basate sul titolo e la descrizione del task. Utile per scomporre task complessi in passi concreti.</p>

        <h3>Creazione task da linguaggio naturale</h3>
        <p>Nel modale "Nuovo task", clicca "Crea con AI" e descrivi il task in linguaggio naturale (es. "Prepara la presentazione per il review di venerdì con priorità alta"). L'AI estrae titolo, descrizione, priorità, scadenza e assegnatario.</p>

        <h3>Riepilogo progetto</h3>
        <p>Dal pulsante "✦ Riepilogo AI" nell'header del progetto, genera un riassunto automatico dello stato del progetto: progressi, criticità, task in ritardo e prossime scadenze.</p>
      </>
    ) : (
      <>
        <h3>Prerequisites</h3>
        <p>AI features require the <code>VITE_AI_PROXY_URL</code> environment variable (Supabase Edge Function). If not configured, AI features are automatically disabled — the app works normally without them.</p>

        <h3>Subtask generation</h3>
        <p>In the task panel, the "✦ AI Summary" button auto-generates a list of subtasks based on the task's title and description. Useful for breaking complex tasks into concrete steps.</p>

        <h3>Natural language task creation</h3>
        <p>In the "New task" modal, click "Create with AI" and describe the task in natural language (e.g., "Prepare the presentation for Friday's review with high priority"). The AI extracts title, description, priority, due date and assignee.</p>

        <h3>Project summary</h3>
        <p>From the "✦ AI Summary" button in the project header, generate an automatic summary of the project status: progress, issues, overdue tasks and upcoming deadlines.</p>
      </>
    ),

    team: L ? (
      <>
        <h3>Directory</h3>
        <p>La pagina People mostra tutti i membri dell'organizzazione con: nome, avatar, ruolo (colore), conteggio task aperti e completati.</p>

        <h3>Gestione membri (solo Admin)</h3>
        <ul>
          <li><strong>Invita</strong> — inserisci l'email per invitare un nuovo membro. L'utente deve essersi già registrato.</li>
          <li><strong>Cambia ruolo</strong> — seleziona il ruolo dal dropdown (Admin, Manager, Membro, Ospite)</li>
          <li><strong>Rimuovi</strong> — rimuovi un membro dall'organizzazione (non elimina l'account)</li>
          <li><strong>Elimina account</strong> — elimina definitivamente l'account di un utente</li>
        </ul>

        <h3>Richieste di accesso</h3>
        <p>Se un utente richiede l'accesso all'organizzazione, la richiesta appare in People → "Richieste in attesa" (visibile solo agli admin). L'admin può approvare o rifiutare.</p>

        <h3>Registrazioni in attesa</h3>
        <p>Se un utente si è registrato ma non ha confermato l'email, l'admin può confermarlo manualmente dalla sezione "Registrazioni in attesa".</p>
      </>
    ) : (
      <>
        <h3>Directory</h3>
        <p>The People page shows all organization members with: name, avatar, role (color-coded), open and completed task counts.</p>

        <h3>Member management (Admin only)</h3>
        <ul>
          <li><strong>Invite</strong> — enter email to invite a new member. The user must have already registered.</li>
          <li><strong>Change role</strong> — select role from dropdown (Admin, Manager, Member, Guest)</li>
          <li><strong>Remove</strong> — remove a member from the organization (doesn't delete the account)</li>
          <li><strong>Delete account</strong> — permanently delete a user's account</li>
        </ul>

        <h3>Access requests</h3>
        <p>If a user requests access to the organization, the request appears in People → "Pending requests" (visible to admins only). Admin can approve or reject.</p>

        <h3>Pending signups</h3>
        <p>If a user registered but didn't confirm their email, the admin can manually confirm them from the "Pending signups" section.</p>
      </>
    ),

    inbox: L ? (
      <>
        <h3>Panoramica</h3>
        <p>L'Inbox raccoglie tutte le notifiche in un feed cronologico. Il badge nella sidebar mostra il numero di notifiche non lette.</p>

        <h3>Tipi di notifica</h3>
        <ul>
          <li>Task creato, completato, riaperto</li>
          <li>Task assegnato a te</li>
          <li>@menzione in un commento</li>
          <li>Sottoattività generate dall'AI</li>
          <li>Approvazione richiesta / risolta</li>
          <li>Dipendenza risolta (task sbloccato)</li>
          <li>Scadenza in avvicinamento (1 giorno prima)</li>
          <li>Notifiche dalle regole di automazione</li>
        </ul>

        <h3>Azioni</h3>
        <p>Clicca su una notifica per aprire il task collegato. Usa "Segna tutti letti" per azzerare il badge.</p>
      </>
    ) : (
      <>
        <h3>Overview</h3>
        <p>The Inbox collects all notifications in a chronological feed. The sidebar badge shows the number of unread notifications.</p>

        <h3>Notification types</h3>
        <ul>
          <li>Task created, completed, reopened</li>
          <li>Task assigned to you</li>
          <li>@mention in a comment</li>
          <li>AI-generated subtasks</li>
          <li>Approval requested / resolved</li>
          <li>Dependency resolved (task unblocked)</li>
          <li>Deadline approaching (1 day before)</li>
          <li>Notifications from automation rules</li>
        </ul>

        <h3>Actions</h3>
        <p>Click a notification to open the linked task. Use "Mark all read" to clear the badge.</p>
      </>
    ),

    search: L ? (
      <>
        <h3>Command Palette</h3>
        <p>Premi <kbd>Cmd+K</kbd> (Mac) o <kbd>Ctrl+K</kbd> (Windows/Linux) per aprire la ricerca globale. Cerca per:</p>
        <ul>
          <li>Titolo o descrizione di task</li>
          <li>Nome di progetto</li>
          <li>Pagine di navigazione (Home, Task, Inbox, People, Portfolios)</li>
        </ul>
        <p>Usa le frecce ↑↓ per navigare i risultati e Enter per selezionare. Esc per chiudere.</p>

        <h3>Filtri task</h3>
        <p>Nella barra filtri sopra la lista/board trovi: ricerca testo (con debounce 200ms), priorità, assegnatario, scadenza (tutti/scaduti/oggi/settimana), stato (tutti/aperti/completati), tag. Il pulsante "✕ reset" ripristina tutti i filtri.</p>

        <h3>Scorciatoie da tastiera</h3>
        <table>
          <thead><tr><th>Tasto</th><th>Azione</th></tr></thead>
          <tbody>
            <tr><td><kbd>Cmd/Ctrl + K</kbd></td><td>Apri/chiudi Command Palette</td></tr>
            <tr><td><kbd>N</kbd></td><td>Nuovo task (se non sei in un campo di testo)</td></tr>
            <tr><td><kbd>H</kbd></td><td>Vai alla Home</td></tr>
            <tr><td><kbd>1</kbd></td><td>Vista Board</td></tr>
            <tr><td><kbd>2</kbd></td><td>Vista Lista</td></tr>
            <tr><td><kbd>3</kbd></td><td>Vista Timeline</td></tr>
            <tr><td><kbd>4</kbd></td><td>Vista Calendario</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Chiudi modale/pannello (priorità: palette → task → modale)</td></tr>
          </tbody>
        </table>
      </>
    ) : (
      <>
        <h3>Command Palette</h3>
        <p>Press <kbd>Cmd+K</kbd> (Mac) or <kbd>Ctrl+K</kbd> (Windows/Linux) to open global search. Search by:</p>
        <ul>
          <li>Task title or description</li>
          <li>Project name</li>
          <li>Navigation pages (Home, Tasks, Inbox, People, Portfolios)</li>
        </ul>
        <p>Use ↑↓ arrows to navigate results and Enter to select. Esc to close.</p>

        <h3>Task filters</h3>
        <p>In the filter bar above list/board you'll find: text search (200ms debounce), priority, assignee, due date (all/overdue/today/week), status (all/open/completed), tag. The "✕ reset" button clears all filters.</p>

        <h3>Keyboard shortcuts</h3>
        <table>
          <thead><tr><th>Key</th><th>Action</th></tr></thead>
          <tbody>
            <tr><td><kbd>Cmd/Ctrl + K</kbd></td><td>Open/close Command Palette</td></tr>
            <tr><td><kbd>N</kbd></td><td>New task (if not in a text field)</td></tr>
            <tr><td><kbd>H</kbd></td><td>Go to Home</td></tr>
            <tr><td><kbd>1</kbd></td><td>Board view</td></tr>
            <tr><td><kbd>2</kbd></td><td>List view</td></tr>
            <tr><td><kbd>3</kbd></td><td>Timeline view</td></tr>
            <tr><td><kbd>4</kbd></td><td>Calendar view</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Close modal/panel (priority: palette → task → modal)</td></tr>
          </tbody>
        </table>
      </>
    ),

    reports: L ? (
      <>
        <h3>Report PDF</h3>
        <p>In ProjectOverview, clicca "Genera Report (PDF)" per scaricare un report A4 con:</p>
        <ol>
          <li>Header con nome progetto, stato e data</li>
          <li>Panoramica progresso: card con task totali, completati, aperti, in ritardo + barra di progresso</li>
          <li>Breakdown per sezione: tabella con sezione, aperti, completati e percentuale</li>
          <li>Distribuzione priorità: barre orizzontali colorate (alta/media/bassa)</li>
          <li>Scadenze prossime (14 giorni): lista con task, assegnatario e data</li>
          <li>Carico di lavoro team: tabella con membro, task aperti e completati</li>
        </ol>
        <p>Il file viene salvato automaticamente come <code>report_nomeprogetto_data.pdf</code>.</p>

        <h3>Esportazione CSV</h3>
        <p>Dalla barra filtri è possibile esportare i task del progetto corrente in formato CSV, includendo tutti i campi (titolo, priorità, assegnatario, scadenza, stato, ecc.).</p>
      </>
    ) : (
      <>
        <h3>PDF Report</h3>
        <p>In ProjectOverview, click "Generate Report (PDF)" to download an A4 report with:</p>
        <ol>
          <li>Header with project name, status and date</li>
          <li>Progress overview: cards with total, completed, open, overdue tasks + progress bar</li>
          <li>Section breakdown: table with section, open, completed and percentage</li>
          <li>Priority distribution: colored horizontal bars (high/medium/low)</li>
          <li>Upcoming deadlines (14 days): list with task, assignee and date</li>
          <li>Team workload: table with member, open and completed tasks</li>
        </ol>
        <p>The file is automatically saved as <code>report_projectname_date.pdf</code>.</p>

        <h3>CSV Export</h3>
        <p>From the filter bar you can export the current project's tasks as CSV, including all fields (title, priority, assignee, due date, status, etc.).</p>
      </>
    ),

    trash: L ? (
      <>
        <h3>Cestino</h3>
        <p>Quando elimini un task o un progetto, viene spostato nel Cestino (soft delete). Dalla pagina Cestino puoi:</p>
        <ul>
          <li><strong>Ripristina</strong> — riporta l'elemento allo stato precedente</li>
          <li><strong>Elimina definitivamente</strong> — rimozione permanente (irreversibile, richiede conferma)</li>
        </ul>

        <h3>Sistema Undo</h3>
        <p>Per molte azioni (elimina, completa, sposta, ecc.), appare un toast con pulsante "Annulla" che dura 8 secondi. Cliccalo per ripristinare immediatamente lo stato precedente.</p>
      </>
    ) : (
      <>
        <h3>Trash</h3>
        <p>When you delete a task or project, it's moved to Trash (soft delete). From the Trash page you can:</p>
        <ul>
          <li><strong>Restore</strong> — bring the item back to its previous state</li>
          <li><strong>Delete permanently</strong> — permanent removal (irreversible, requires confirmation)</li>
        </ul>

        <h3>Undo system</h3>
        <p>For many actions (delete, complete, move, etc.), a toast appears with an "Undo" button lasting 8 seconds. Click it to immediately restore the previous state.</p>
      </>
    ),

    settings: L ? (
      <>
        <h3>Lingua</h3>
        <p>Clicca il pulsante IT/EN nella barra laterale per cambiare lingua. La scelta viene salvata e ricordata al prossimo accesso.</p>

        <h3>Tema</h3>
        <p>Clicca il pulsante tema nella barra laterale per passare tra: 🌙 Scuro, ☀️ Chiaro, ⚙️ Automatico (segue le preferenze di sistema).</p>

        <h3>Stato database</h3>
        <p>L'icona database nella barra laterale indica lo stato della connessione:</p>
        <ul>
          <li>🟢 Verde — connesso a Supabase (dati sincronizzati in tempo reale)</li>
          <li>🟡 Giallo — solo localStorage (funziona offline ma senza sync)</li>
          <li>🔵 Blu animato — sincronizzazione in corso</li>
          <li>🔴 Rosso — errore di connessione</li>
        </ul>

        <h3>PWA (installazione)</h3>
        <p>TaskFlow è una Progressive Web App. Puoi installarla dal browser (Chrome → "Installa app") per averla come app standalone con icona nel dock/desktop. Funziona anche offline con i dati in cache.</p>
      </>
    ) : (
      <>
        <h3>Language</h3>
        <p>Click the IT/EN button in the sidebar to switch language. The choice is saved and remembered on next visit.</p>

        <h3>Theme</h3>
        <p>Click the theme button in the sidebar to toggle between: 🌙 Dark, ☀️ Light, ⚙️ Auto (follows system preferences).</p>

        <h3>Database status</h3>
        <p>The database icon in the sidebar shows connection status:</p>
        <ul>
          <li>🟢 Green — connected to Supabase (data synced in real time)</li>
          <li>🟡 Yellow — localStorage only (works offline but no sync)</li>
          <li>🔵 Animated blue — syncing in progress</li>
          <li>🔴 Red — connection error</li>
        </ul>

        <h3>PWA (installation)</h3>
        <p>TaskFlow is a Progressive Web App. You can install it from the browser (Chrome → "Install app") to get it as a standalone app with a dock/desktop icon. Works offline with cached data.</p>
      </>
    ),

    roles: L ? (
      <>
        <h3>Tabella ruoli</h3>
        <table>
          <thead><tr><th>Ruolo</th><th>Gestione membri</th><th>Crea/elimina progetti</th><th>Gestisci task</th><th>Visualizza tutto</th></tr></thead>
          <tbody>
            <tr><td><strong>Admin</strong></td><td>✅ Invita, rimuovi, cambia ruoli, conferma email, approva richieste</td><td>✅</td><td>✅</td><td>✅</td></tr>
            <tr><td><strong>Manager</strong></td><td>❌</td><td>✅</td><td>✅</td><td>✅</td></tr>
            <tr><td><strong>Membro</strong></td><td>❌</td><td>❌</td><td>✅</td><td>✅</td></tr>
            <tr><td><strong>Ospite</strong></td><td>❌</td><td>❌</td><td>Solo i propri task</td><td>Solo i propri task</td></tr>
          </tbody>
        </table>

        <h3>Admin</h3>
        <p>L'admin ha accesso completo all'organizzazione. Può invitare e rimuovere membri, cambiare i ruoli, approvare richieste di accesso, confermare email in attesa ed eliminare account. Nella pagina People, l'admin vede le sezioni extra per la gestione.</p>

        <h3>Manager</h3>
        <p>Il manager può creare e gestire progetti e tutti i task, ma non può gestire i membri dell'organizzazione.</p>

        <h3>Membro</h3>
        <p>Il membro standard può creare e modificare task in tutti i progetti, ma non può creare o eliminare progetti.</p>

        <h3>Ospite</h3>
        <p>L'ospite ha visibilità limitata: può vedere e modificare solo i task assegnati a sé.</p>

        <h3>Ruoli per progetto</h3>
        <p>Oltre ai ruoli organizzativi, ogni progetto ha i propri ruoli (Owner, Editor, Viewer). Questi controllano cosa ogni membro può fare all'interno del singolo progetto:</p>
        <ul>
          <li><strong>Owner</strong> — accesso completo: modifica task, impostazioni progetto, regole, permessi</li>
          <li><strong>Editor</strong> — crea e modifica task, ma non può cambiare le impostazioni del progetto</li>
          <li><strong>Viewer</strong> — sola lettura, non può modificare nulla</li>
        </ul>

        <h3>Trasferimento ownership</h3>
        <p>L'admin dell'organizzazione può trasferire la proprietà di un progetto a qualsiasi membro. In ProjectOverview → pannello Membri, clicca sul ruolo di un membro e seleziona "Owner". Il precedente owner diventa automaticamente Editor.</p>
      </>
    ) : (
      <>
        <h3>Role table</h3>
        <table>
          <thead><tr><th>Role</th><th>Manage members</th><th>Create/delete projects</th><th>Manage tasks</th><th>View everything</th></tr></thead>
          <tbody>
            <tr><td><strong>Admin</strong></td><td>✅ Invite, remove, change roles, confirm emails, approve requests</td><td>✅</td><td>✅</td><td>✅</td></tr>
            <tr><td><strong>Manager</strong></td><td>❌</td><td>✅</td><td>✅</td><td>✅</td></tr>
            <tr><td><strong>Member</strong></td><td>❌</td><td>❌</td><td>✅</td><td>✅</td></tr>
            <tr><td><strong>Guest</strong></td><td>❌</td><td>❌</td><td>Own tasks only</td><td>Own tasks only</td></tr>
          </tbody>
        </table>

        <h3>Admin</h3>
        <p>Admin has full access to the organization. Can invite and remove members, change roles, approve access requests, confirm pending emails and delete accounts. In the People page, admin sees extra management sections.</p>

        <h3>Manager</h3>
        <p>Manager can create and manage projects and all tasks, but cannot manage organization members.</p>

        <h3>Member</h3>
        <p>Standard member can create and edit tasks in all projects, but cannot create or delete projects.</p>

        <h3>Guest</h3>
        <p>Guest has limited visibility: can only see and edit tasks assigned to them.</p>

        <h3>Per-project roles</h3>
        <p>In addition to organization-level roles, each project has its own roles (Owner, Editor, Viewer). These control what each member can do within a specific project:</p>
        <ul>
          <li><strong>Owner</strong> — full access: edit tasks, project settings, rules, permissions</li>
          <li><strong>Editor</strong> — create and edit tasks, but cannot change project settings</li>
          <li><strong>Viewer</strong> — read-only, cannot modify anything</li>
        </ul>

        <h3>Ownership transfer</h3>
        <p>Organization admins can transfer project ownership to any member. In ProjectOverview → Members panel, click a member's role and select "Owner". The previous owner is automatically demoted to Editor.</p>
      </>
    ),

    supervision: L ? (
      <>
        <h3>Cos'è la supervisione</h3>
        <p>La supervisione è un layer opzionale per i progetti che richiedono governance strutturata. Quando un progetto ha tipo <strong>Supervisionato</strong>, compare una tab aggiuntiva "Supervision" nell'header progetto con quattro sotto-viste: Cockpit, Deliverable, Timeline e Controlli ricorrenti.</p>

        <h3>Attivare la supervisione</h3>
        <p>Vai in Panoramica progetto → barra laterale destra → Tipo progetto. Seleziona <strong>Supervisionato</strong>. Compariranno anche i campi data di inizio e fine progetto. Solo admin e manager possono modificare il tipo.</p>

        <h3>Cockpit</h3>
        <p>Il cockpit mostra 5 card con indicatori a colpo d'occhio:</p>
        <ul>
          <li><strong>Milestone in arrivo</strong> — task con flag milestone, non completati, entro la finestra temporale</li>
          <li><strong>Deliverable in arrivo</strong> — deliverable non accettati, con data di scadenza nella finestra</li>
          <li><strong>Task scaduti</strong> — task aperti con scadenza passata</li>
          <li><strong>Task senza owner</strong> — task senza assegnatario</li>
          <li><strong>Deliverable in ritardo</strong> — deliverable con stato "delayed" o scadenza passata</li>
        </ul>
        <p>Usa il selettore finestra (7/14/30 giorni) per regolare l'orizzonte delle card "in arrivo".</p>

        <h3>Registro Deliverable</h3>
        <p>Un registro tabellare con codice, titolo, proprietario, scadenza, stato e task collegati. Puoi filtrare per codice, titolo o proprietario. Clicca <strong>+ Aggiungi</strong> per creare un deliverable con form inline. Gli stati disponibili sono: bozza, in corso, revisione interna, consegnato, accettato, in ritardo.</p>

        <h3>Timeline supervisione</h3>
        <p>Una timeline lineare orizzontale che mostra milestone (viola), deliverable (brand) e controlli ricorrenti (arancione) su un asse temporale. La linea rossa verticale "TODAY" indica oggi. Le voci scadute sono evidenziate in rosso. Selettore finestra: 30/60/90 giorni.</p>

        <h3>Controlli ricorrenti</h3>
        <p>Checklist periodiche per la governance del progetto. Ogni controllo ha: titolo, frequenza (settimanale, mensile, personalizzata), prossima scadenza e tipo azione (solo promemoria o crea task). Quando un controllo è "due", compare un badge arancione sulla tab. Clicca ▶ per eseguirlo: se il tipo è "crea task", viene creato un task automaticamente dal template; in entrambi i casi la prossima scadenza avanza al periodo successivo.</p>
      </>
    ) : (
      <>
        <h3>What is supervision</h3>
        <p>Supervision is an optional layer for projects requiring structured governance. When a project has type <strong>Supervised</strong>, an additional "Supervision" tab appears in the project header with four sub-views: Cockpit, Deliverables, Timeline, and Recurring Controls.</p>

        <h3>Enabling supervision</h3>
        <p>Go to Project Overview → right sidebar → Project type. Select <strong>Supervised</strong>. Start and end date fields will also appear. Only admins and managers can change the project type.</p>

        <h3>Cockpit</h3>
        <p>The cockpit shows 5 at-a-glance metric cards:</p>
        <ul>
          <li><strong>Upcoming milestones</strong> — tasks flagged as milestones, not completed, within the time window</li>
          <li><strong>Upcoming deliverables</strong> — deliverables not accepted, with due dates within the window</li>
          <li><strong>Overdue tasks</strong> — open tasks with past due dates</li>
          <li><strong>Ownerless tasks</strong> — tasks with no assignee</li>
          <li><strong>Delayed deliverables</strong> — deliverables with "delayed" status or past due dates</li>
        </ul>
        <p>Use the window selector (7/14/30 days) to adjust the horizon for "upcoming" cards.</p>

        <h3>Deliverables register</h3>
        <p>A tabular register with code, title, owner, due date, status, and linked tasks. You can filter by code, title, or owner. Click <strong>+ Add</strong> to create a deliverable with an inline form. Available statuses: draft, in progress, internal review, submitted, accepted, delayed.</p>

        <h3>Supervision timeline</h3>
        <p>A linear horizontal timeline showing milestones (purple), deliverables (brand color), and recurring controls (orange) on a time axis. The red vertical "TODAY" line marks the current day. Overdue items are highlighted in red. Window selector: 30/60/90 days.</p>

        <h3>Recurring controls</h3>
        <p>Periodic checklists for project governance. Each control has: title, frequency (weekly, monthly, custom), next due date, and action type (reminder only or create task). When a control is due, an orange badge appears on the tab. Click ▶ to execute: if the action type is "create task", a task is automatically created from the template; in both cases the next due date advances to the next period.</p>
      </>
    ),

    partners: L ? (
      <>
        <h3>Cosa sono i partner</h3>
        <p>I partner sono entità esterne (fornitori, laboratori, team, dipartimenti, clienti) che collaborano ai progetti dell'organizzazione. Ogni partner appartiene all'organizzazione e può essere collegato a uno o più progetti. I task possono essere associati a un partner per tracciare chi è responsabile del lavoro.</p>

        <h3>Gestione partner</h3>
        <p>Apri la panoramica di un progetto: nella barra laterale destra, sotto i membri, trovi il pannello <strong>Partner</strong>. Da qui puoi:</p>
        <ul>
          <li><strong>Collegare</strong> un partner esistente al progetto tramite il menu a tendina</li>
          <li><strong>Creare</strong> un nuovo partner con il form inline (nome, tipo, contatto, email, note)</li>
          <li><strong>Scollegare</strong> un partner dal progetto (il partner resta nell'organizzazione)</li>
          <li><strong>Modificare</strong> nome, tipo, contatto e stato attivo/inattivo</li>
        </ul>
        <p>I tipi disponibili sono: team, partner, vendor, lab, department, client. Ogni tipo è indicato da un badge colorato.</p>

        <h3>Partner nei task</h3>
        <p>Nel pannello task e nel modal di creazione task trovi un selettore <strong>Partner/Team</strong>. Seleziona il partner responsabile del task. Questo valore appare come badge nelle viste Lista e Board, ed è disponibile come colonna nell'esportazione CSV.</p>

        <h3>Filtro partner</h3>
        <p>Nella barra filtri è presente un selettore partner. Filtra i task per vedere solo quelli assegnati a un determinato partner.</p>

        <h3>Report e dashboard</h3>
        <p>Il widget dashboard <strong>Task per partner</strong> mostra un grafico a barre con task aperti e completati per ciascun partner attivo. Nella panoramica progetto, la card <strong>Partner engagement</strong> mostra una barra di progresso per ogni partner collegato. Il report PDF include una sezione dedicata con il riepilogo per partner (aperti, completati, in ritardo).</p>
      </>
    ) : (
      <>
        <h3>What are partners</h3>
        <p>Partners are external entities (vendors, labs, teams, departments, clients) that collaborate on the organization's projects. Each partner belongs to the organization and can be linked to one or more projects. Tasks can be associated with a partner to track who is responsible for the work.</p>

        <h3>Managing partners</h3>
        <p>Open a project's overview: in the right sidebar, below members, you'll find the <strong>Partners</strong> panel. From here you can:</p>
        <ul>
          <li><strong>Link</strong> an existing partner to the project via the dropdown</li>
          <li><strong>Create</strong> a new partner with the inline form (name, type, contact, email, notes)</li>
          <li><strong>Unlink</strong> a partner from the project (the partner remains in the organization)</li>
          <li><strong>Edit</strong> name, type, contact, and active/inactive status</li>
        </ul>
        <p>Available types are: team, partner, vendor, lab, department, client. Each type is shown with a colored badge.</p>

        <h3>Partners in tasks</h3>
        <p>In the task panel and the new task modal you'll find a <strong>Partner/Team</strong> selector. Choose the partner responsible for the task. This value appears as a badge in List and Board views, and is available as a column in CSV exports.</p>

        <h3>Partner filter</h3>
        <p>The filter bar includes a partner selector. Filter tasks to see only those assigned to a specific partner.</p>

        <h3>Reports and dashboard</h3>
        <p>The <strong>Tasks per partner</strong> dashboard widget shows a bar chart with open and completed tasks for each active partner. In the project overview, the <strong>Partner engagement</strong> card shows a progress bar for each linked partner. The PDF report includes a dedicated section with a per-partner summary (open, done, overdue).</p>
      </>
    ),
  }
}
