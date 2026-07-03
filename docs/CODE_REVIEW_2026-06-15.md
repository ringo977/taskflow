# TaskFlow — Revisione completa

**Data:** 15 giugno 2026 · **Versione:** 0.5.x · **Stack:** React 18 + Supabase, Vite, Zod, react-router, recharts
**Scope:** bachi/correttezza, sicurezza, UX/accessibilità, qualità del codice. Revisione in sola lettura su `src/` (178 file, ~32k righe) e `supabase/`.

---

## Giudizio sintetico

La base è solida e curata: i18n IT/EN completo (511 chiavi, allineate), test estesi (unit + property + resilience + e2e Playwright), lazy-loading dei modali, ErrorBoundary, sistema Toast/Undo, RLS granulare con helper `SECURITY DEFINER`, validazione Zod sulle scritture. Il lint passa con 0 errori (4 warning).

Detto questo, ci sono **difetti di correttezza concreti** che spiegano la sensazione che "non convince": un blocco di bug legati a **shape dei dati incoerenti tra UI, rule engine e schema Zod** che rompono silenziosamente tag, subtask e diverse automazioni — a volte con perdita di dati. Sul fronte sicurezza, **MFA è aggirabile** e ci sono lacune nelle policy RLS. Sull'usabilità, le lacune principali sono **accessibilità da tastiera/screen reader** e un crash potenziale nelle card.

Priorità in tre ondate:
1. **Subito (correttezza + perdita dati):** B1, B2, B5, B6, U1.
2. **Sicurezza:** S1 (MFA), S2 (RLS UPDATE), S3 (segreti in chiaro), S4 (ai-proxy).
3. **Robustezza + UX:** il resto.

---

## 1. Bachi e correttezza

> Nota metodologica: ogni baco è stato verificato leggendo il codice reale. Le righe si riferiscono ai file in `src/`. Il warning del linter su `useRuleEngine.js:422` conferma B3.

### B1 — [CRITICO] I tag sono oggetti `{name,color}` ma lo schema li valida come stringhe → perdita silenziosa dei tag
La UI crea e salva i tag come oggetti: `TagsSection.jsx:21` fa `onUpd(task.id, { tags: [...tags, tg] })` con `tg = {name,color}`, e li rilegge come `tg.name`/`tg.color`. Ma lo schema è:

- `schemas.js:67` (`TaskUpsertSchema`): `tags: z.array(z.string().max(100)).catch([])`
- `schemas.js:99` (`TaskPatchSchema`): `tags: z.array(z.string().max(100)).optional()`

Su `TaskPatchSchema` Zod fa **throw** (`Expected string, received object`); su `TaskUpsertSchema` il `.catch([])` è peggio: salva silenziosamente `tags: []`, **cancellando tutti i tag**. Questo è esattamente il pattern "fallback che persiste dati vuoti" da evitare.
**Fix:** schema `z.array(z.object({ name: z.string().max(100), color: z.string().optional() }))`; rimuovere `.catch([])` o sostituirlo con validazione che non distrugge i dati.

### B2 — [CRITICO] Azione regola `create_subtask` usa `title`, la persistenza legge `s.t` → subtask senza titolo / update fallito
`useRuleEngine.js:121` crea `{ id: 's'+Date.now(), title, done:false }`, ma tutto il resto usa la shape `{ id, t, done }`: `tasks.js:23` (`subToRow`) legge `title: s.t`, e `schemas.js:76` richiede `t` (string max 500). Risultato: subtask salvata con titolo vuoto e, per via dello schema, l'intero upsert può fare throw.
**Fix:** nel rule engine usare `{ id, t: title, done: false }`.

### B3 — [ALTO] Stale closure: `evaluateTaskChange` usa `tasks` ma non è nelle dipendenze del `useCallback`
`useRuleEngine.js:354,377` filtrano `tasks` per i trigger `all_tasks_done_in_wp`/`all_tasks_done_in_ms`, ma le deps a `:422` sono `[getProjectRules, executeRuleActions, matchesConditions]` (manca `tasks`). Confermato dal linter (`exhaustive-deps`). I trigger aggregati valutano uno snapshot vecchio: l'ultima task completata può non far scattare "tutte fatte". `checkDeadlines` invece include correttamente `tasks` (`:470`), il che conferma l'incoerenza.
**Fix:** aggiungere `tasks` alle dipendenze.

### B4 — [ALTO] Trigger `comment_added` non scatta mai (`comments` vs `cmts`)
I commenti viaggiano sempre nella property `cmts` (`useTaskActions.js`, adapter, schema). Ma `useRuleEngine.js:326-328` controlla `'comments' in patch` / `prevTask.comments` / `patch.comments`, che non esistono mai. L'automazione è morta.
**Fix:** usare `cmts` ovunque.

### B5 — [ALTO] Tag come stringhe nel rule engine → `add_tag`, `tag_added`, condizione `tag` rotti + corruzione shape
`useRuleEngine.js:97-101,236,341-344` trattano `task.tags` come array di stringhe (`includes(tag)`, `Set.has(tag)`). Essendo oggetti, i confronti sono sempre falsi: `tag_added` non rileva nulla, la condizione `tag` non matcha mai, e `add_tag` inserisce una **stringa** in un array di oggetti, corrompendo la shape e poi facendo fallire la validazione (vedi B1).
**Fix:** normalizzare su `tg.name` (`current.some(t => t.name === tag)`, push `{name: tag, color}`, condizione `.some(t => t.name === cond.value)`).

### B6 — [ALTO] `reorderTask`: nessun revert se la persistenza fallisce + posizioni scritte non-atomiche
`useTaskActions.js:~222-238` riordina lo stato in modo ottimistico ma se la persistenza fallisce fa solo `log.error` — niente revert né toast: la UI mostra un ordine che il DB non ha. Inoltre `tasks.js:~262` (`updateTaskPositions`) lancia N update in `Promise.all` senza transazione: in caso di fallimento parziale le `position` restano incoerenti.
**Fix:** upsert batch unico + revert/toast come nelle altre azioni del file.

### B7 — [MEDIO] `togTask`/`addTask` usano `user.name` senza guardia
`useTaskActions.js:169,179,264` accedono a `user.name` diretto, mentre altrove (`:67,112`) si usa `user?.name ?? 'System'`. Con `user` nullo (sessione scaduta / bootstrap parziale) il completamento o la creazione di una task crasha a metà flusso ottimistico.
**Fix:** `user?.name ?? 'System'` coerente.

### B8 — [MEDIO] Lookup assignee con interpolazione in `.or()` (correttezza + edge case)
`useTaskActions.js:~50` interpola `assigneeName` dentro la stringa filtro PostgREST `.or(\`display_name.eq.${assigneeName},...\`)`. Un nome con virgole/parentesi rompe il parsing o matcha il profilo sbagliato, con possibile aggiunta del membro errato al progetto.
**Fix:** filtri parametrici (`.eq('display_name', name)`), niente interpolazione.

### B9 — [MEDIO] Circuit breaker del rule engine non deterministico
`useRuleEngine.js:~399-413`: le azioni girano in `setTimeout(...,0)` e anche il reset di `firesThisTickRef` è in `setTimeout(...,0)`; `depthRef` è incrementato in modo sincrono ma decrementato nel `finally` asincrono. Più regole nello stesso tick possono superare `MAX_FIRES_PER_TICK`/`MAX_RULE_DEPTH` prima del reset → protezione anti-loop inaffidabile.
**Fix:** reset sincrono all'inizio della evaluation "root" (tracciando se si è già dentro un tick).

### B10 — [MEDIO] `firedDeadlineRef` cresce senza pruning + notifiche perse dopo reschedule
`useRuleEngine.js:~438-459` aggiunge chiavi a un `Set` mai potato (a differenza di `recentFiresRef`), svuotato solo al cambio fingerprint regole. Se una scadenza viene spostata in avanti, la chiave resta e la notifica "due soon" non si ripresenta.
**Fix:** rimuovere la chiave quando esce dalla finestra o quando `task.due` cambia.

### B11 — [BASSO] Incoerenza fuso orario in filtri/scadenze
`filters.js:~48` usa `now.toISOString().slice(0,10)` (UTC) per "today"/"week", mentre `isOverdue` (`filters.js:~67`) e `useRuleEngine.js:433` costruiscono `new Date(due + 'T23:59:59')` in ora **locale**. Vicino a mezzanotte, per fusi ≠ UTC, si ha off-by-one di un giorno.
**Fix:** convenzione unica (preferibilmente locale, helper `localTodayStr()`).

### B12 — [BASSO] `usePagination` chiama due `setState` durante il render
`usePagination.js:~22-29` aggiusta lo stato in render con `setPrevTotal` + `setPage`; fragile se `items` cambia identità a ogni render. Rischio di render extra/loop in casi particolari.
**Fix:** clamp in `useEffect` o derivare `safePage` senza scrivere stato.

---

## 2. Sicurezza

### S1 — [CRITICO] MFA aggirabile dal client
`MfaPage.jsx:88-89` mostra un pulsante **"Continua senza 2FA"** che chiama `onComplete()`. `AuthGate.jsx:20` gateizza solo su un prop client `needsMfa`. Dopo il login con password la sessione Supabase è già valida (AAL1), quindi tutti gli accessi via client anon riescono **a prescindere dal TOTP** — anche chiamando direttamente le API senza mai caricare la UI. La 2FA è di fatto cosmetica.
**Fix:** imporre AAL2 lato server (policy RLS che verificano `auth.jwt()->>'aal' = 'aal2'` sulle tabelle sensibili, o Auth Hook); rimuovere/limitare l'escape "continua senza 2FA".

### S2 — [ALTO] Policy `FOR UPDATE` senza `WITH CHECK` → possibile spostamento cross-org delle righe
In `024_granular_rls.sql` le policy UPDATE di `portfolios` (:53), `projects` (:79), `sections` (:105), `tasks` (:132), `subtasks` (:158), `comments` (:185) hanno solo `USING (...)`, **niente `WITH CHECK`** (le `WITH CHECK` presenti riguardano le INSERT). Senza `WITH CHECK`, i valori della riga aggiornata non sono vincolati: chi può modificare una riga può cambiarne `org_id` spostandola in un'altra org. Stesso pattern in 031/034/035/037/039.
**Fix:** aggiungere `WITH CHECK` speculare allo `USING` su tutte le policy UPDATE.

### S3 — [ALTO sul disco / NON un leak git] Password reale + TOTP attivo in chiaro in `.env.e2e`
`.env.e2e` contiene `E2E_EMAIL=<redacted>`, `E2E_PASSWORD=<redacted>` e un `E2E_TOTP_SECRET` **attivo** in chiaro. Questo è l'account admin → chi legge il file ha password **e** secondo fattore, 2FA annullata.
**Correzione rispetto a una prima analisi:** ho verificato la cronologia git — `.env.e2e` e `.env.local` sono in `.gitignore` e **non sono mai stati committati** (`git log --all -- .env.e2e` è vuoto; `git ls-files` mostra solo i `.example`). Quindi **non è un leak nel repository**. Resta però una cattiva pratica avere credenziali admin + TOTP in chiaro su disco.
**Fix:** ruotare la password e ri-arruolare il TOTP (il secret è esposto in questo file); spostare i segreti e2e in un secret store CI; usare un account di test dedicato, non l'admin di produzione.

### S4 — [MEDIO] `ai-proxy` documentato come `--no-verify-jwt` → proxy pubblico non autenticato
`supabase/functions/ai-proxy/index.ts:8` istruisce il deploy con `--no-verify-jwt`; il client (`utils/ai.js`) non invia `Authorization`. Il rate-limit è in-memory per-istanza → si azzera a ogni cold start. Risultato: proxy pubblico verso la tua chiave Anthropic a pagamento → abuso/cost-drain (la chiave resta comunque server-side, bene).
**Fix:** richiedere verifica JWT (o controllare la sessione dentro la function); restringere CORS; rate-limit su store durevole per user id.
**Da verificare in dashboard:** se la function è stata davvero deployata `--no-verify-jwt`.

### S5 — [MEDIO] `update_org_member_role` non valida il ruolo
`012_org_member_admin_rpcs.sql`: la RPC (SECURITY DEFINER) verifica che il chiamante sia admin ma non valida `p_role` contro l'enum consentito; `org.js:155` la chiama senza validare con `OrgRoleSchema`. Un valore di ruolo arbitrario può bloccare l'utente fuori da ogni policy.
**Fix:** `RAISE EXCEPTION` se `p_role NOT IN ('admin','manager','member','guest')`; validare anche client-side.

### S6 — [MEDIO] Autorizzazione solo client-side per progetto/WP/visibilità task
`utils/permissions.js` (match per nome/email, non per id) è solo un gate UI. La RLS distingue solo i ruoli org, **non** la membership di progetto, l'`access` dei workpackage (`owner_only`/`editors`), la `visibility:'assignees'` dei task o l'accesso alle sezioni. Tutto ciò è aggirabile chiamando Supabase direttamente: ogni `member` può leggere/modificare qualunque task/WP/milestone dell'org.
**Fix:** spostare i controlli in RLS (esiste già `is_project_mate()` da 042 — usarlo in tasks/workpackages/milestones).

### S7 — [ALTO] `audit_log` falsificabile
`026_audit_log.sql`: la INSERT policy è `WITH CHECK (get_org_role(org_id) IS NOT NULL)` e `audit.js` imposta `user_id`/`action`/`diff` lato client. Un membro può forgiare voci di audit attribuendole ad altri. L'append-only c'è (no UPDATE/DELETE), ma l'integrità dei contenuti no — vanifica lo scopo forense.
**Fix:** scrivere l'audit via RPC SECURITY DEFINER che forza `user_id := auth.uid()` e valida `action`/`entity_type`.

### S8 — [MEDIO, da verificare] Storage attachments
`lib/db/attachments.js` usa `getPublicUrl` (bucket pubblico?), path con `ext = file.name.split('.').pop()` non sanificato, nessun allowlist di tipo/dimensione. Nessuna Storage RLS nelle migrazioni.
**Fix:** bucket privato + signed URL, Storage RLS per prefisso `org_id`, allowlist MIME/estensioni, limite dimensione. **Da verificare in dashboard:** se il bucket è pubblico.

### Note positive sicurezza
Nessun `dangerouslySetInnerHTML`/`innerHTML`/`eval` in `src/`; `highlight.jsx` usa `<mark>` sicuro (no XSS). Nessuna `service_role` key lato client. Le RPC admin re-verificano `auth.uid()` e usano `SET search_path = public`. Ricorsione RLS già risolta in 040/042.

---

## 3. Usabilità / UX e accessibilità

### U1 — [ALTO] Crash potenziale: `task.subs`/`task.cmts` non guardati in TaskCard
`TaskCard.jsx:11,44,45` accede a `task.subs.filter`, `task.subs.length`, `task.cmts.length` senza `?.` (idem `ActivityTab.jsx:62,69,71`). Con `subs`/`cmts` undefined (shape documentata come variabile) la card fa throw e fa cadere l'intera colonna della board (non avvolta in WidgetErrorBoundary).
**Fix:** `(task.subs ?? [])` / `(task.cmts ?? [])`, come già fatto per `tags`/`deps` altrove.

### U2 — [ALTO] Accessibilità da tastiera assente in molti punti
- Nessun **focus trap** nei modali (`ConfirmModal`, `AddModal`, `NewProjectModal`, `FormSubmitModal`): focus non spostato all'apertura, Tab esce dietro, focus non ripristinato alla chiusura.
- **Escape incoerente:** `useUIState.js:54-68` gestisce Escape solo per CmdK/dettaglio/add; `NewProjectModal` e `FormSubmitModal` non si chiudono con Escape.
- ~40 `onClick` su `<div>`/`<span>` senza supporto tastiera. In particolare `IconSidebar.jsx:132` (avatar/**logout**) ha `role="button" tabIndex={0}` ma **manca `onKeyDown`** → logout irraggiungibile da tastiera; header di gruppo collassabili in `ListView`/`MyTasksView`; righe task ovunque.
**Fix:** hook `useModalA11y(ref, onClose)` riusabile (salva/sposta/ripristina focus + trap Tab + Escape); convertire gli elementi cliccabili in `<button>` o aggiungere `role/tabIndex/onKeyDown`.

### U3 — [MEDIO/ALTO] Feedback async invisibile agli screen reader
`ToastCtx.jsx` (container) e `UndoCtx.jsx` (UndoBar) non hanno `aria-live`/`role="status"|"alert"` (zero `aria-live` in tutto il progetto). Successi/errori di salvataggio non vengono annunciati.
**Fix:** `aria-live="polite"` sul container toast (`assertive` per errori), `role="status"` sull'UndoBar.

### U4 — [MEDIO] `deleteSec` elimina una sezione senza conferma
`BoardView.jsx:~61,219`: un solo click sul ✕ elimina la sezione e rispostai task altrove, **senza ConfirmModal** (che invece è usato correttamente per task/progetto/portfolio). Azione impattante e silenziosa.
**Fix:** ConfirmModal quando la sezione contiene task; idealmente `pushUndo`.

### U5 — [MEDIO] Stringhe hardcoded non tradotte
Nonostante l'i18n completo: `View only` (`TaskPanel.jsx:103`), messaggio permessi (`AddModal.jsx:116`), `✓ Toggle` (`ListView.jsx:121`), `OK` (`ListView.jsx:261`, `BoardView.jsx:276,298`), `Undo` (`UndoCtx.jsx:61`), `ErrorBoundary` (`:48,72`), vari `Loading...`.
**Fix:** aggiungere le chiavi mancanti a `it.js`/`en.js` col pattern difensivo `t.x ?? 'fallback'` già in uso.

### U6 — [MEDIO] Scorciatoie non scopribili
`useUIState.js` definisce `n`/`h`/`1-4`/Cmd+K senza alcun hint UI (niente pannello `?`, tooltip, badge `kbd`).
**Fix:** pannello shortcut (`?`) o badge `kbd` nei controlli vista.

### U7 — [BASSO] Varie
Template in `AddModal` applicano solo titolo+priorità (desc/subs ignorati silenziosamente, `AddModal.jsx:37-47`); manca empty-state quando i filtri azzerano i risultati e un onboarding "crea il primo progetto"; il manuale apre una tab esterna (`IconSidebar.jsx:87`) invece della navigazione interna; drag-and-drop board/calendar senza alternativa tastiera.

---

## 4. Qualità del codice / manutenibilità

### Q1 — [ALTO] Duplicazione BoardView ↔ ListView ↔ TaskCard
Ricostruzione identica di `partnerById`/`wpById`/`msById`, logica `applyVisibilityFilter`+`groupTasks` quasi identica, rendering badge WP/Milestone/Partner duplicato 3 volte con stili divergenti, add-inline ripetuto.
**Fix:** estrarre `useProjectLookups(orgId, projectId)`, un componente `<TaskMetaBadges>`, un hook `useGroupedTasks`. ~150 righe in meno e fine dei drift di stile.

### Q2 — [MEDIO] Performance: lookup non memoizzati + `blocked` O(n²)
`BoardView.jsx:20-24` e `ListView.jsx:50-54` ricreano i `*ById` a ogni render (non in `useMemo`), invalidando i `useMemo` a valle. `blocked` è calcolato con `deps.some(depId => tasks.find(...))` per ogni card a ogni render → O(deps × tasks).
**Fix:** `useMemo` per i lookup; precomputare una `Map`/`Set` dei task incompleti una sola volta.

### Q3 — [MEDIO] Componenti grandi
`DashboardWidgets.jsx` (588), `RulesPanel.jsx` (579), `PeopleView.jsx` (514), `TimelineView.jsx` (508), `CalendarView.jsx` (443), `ProjectDashboard.jsx` (429). Priorità a DashboardWidgets/RulesPanel (estrarre singoli widget/regole). TaskPanel è invece un buon esempio già rifattorizzato in tab.

### Q4 — [BASSO] Stile inline pervasivo + `localStorage` non difensivo
`style={{...}}` con valori ripetuti ovunque (pattern badge/fallback copiati); estrarre classi/componenti condivisi. `HomeDashboard.jsx:44-46` scrive su `localStorage` senza try/catch (la lettura ce l'ha) — in modalità privata/quota piena può rompere il render.

---

## Piano d'azione consigliato

**Ondata 1 — Correttezza & perdita dati (fix piccoli, impatto alto)**
B1 (schema tag) · B2 (subtask `t`) · B4 (`cmts`) · B5 (tag nel rule engine) · B3 (deps `tasks`) · U1 (null-guard subs/cmts) · B7 (`user?.name`).

**Ondata 2 — Sicurezza**
S1 (AAL2 server-side) · S2 (`WITH CHECK`) · S3 (ruotare password+TOTP, secret store) · S6/S7 (controlli in RLS, audit via RPC) · S4 (ai-proxy JWT). Verificare in dashboard: bucket storage, deploy ai-proxy.

**Ondata 3 — Robustezza & UX**
B6 (revert reorder) · B9/B10 (rule engine) · U2/U3 (a11y: focus trap, Escape, aria-live) · U4 (conferma deleteSec) · U5 (i18n) · Q1/Q2 (refactor lookup/badge + performance).

---

*Tutti i findings sono stati verificati sul codice sorgente reale. Le correzioni più rapide ad alto impatto sono il blocco shape-dati (B1, B2, B4, B5) e il null-guard U1.*
