# TaskFlow — Consolidation Playbook

> Stato: v0.5.0 · 142 file sorgente · 24k LOC · 644 unit test · 6 suite E2E
> Data: aprile 2026

TaskFlow non ha più come collo di bottiglia le feature. I tre colli di bottiglia attuali sono disciplina operativa, stabilità dell'esperienza e complessità accumulata. Questo documento definisce le regole operative per i prossimi cicli di sviluppo.

---

## 1 — Disciplina operativa

### CI come gatekeeper unico

Nessun merge va su `main` senza CI verde. La pipeline attuale copre: security audit, migration lint, ESLint, 644 unit test, coverage >70%, build Vite, bundle size check, E2E smoke, E2E auth (quando abilitato). Ogni nuovo gate (es. lighthouse, type check) si aggiunge qui prima di essere considerato "attivo".

### Migration safety

Ogni file in `supabase/migrations/` passa per `migration-lint.js`. Regole: nessuna colonna droppata senza periodo di deprecation, ordering invariant sugli script, nomi consistenti. Se il lint non lo copre, non è enforced.

### Credenziali e environment

Le variabili Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) vivono nei GitHub vars/secrets. I secret E2E (`E2E_EMAIL`, `E2E_PASSWORD`, `E2E_TOTP_SECRET`) sono gated dietro `E2E_ENABLED=true`. Nessun `.env` viene committato; `.env.example` documenta le chiavi necessarie.

### Deploy gating

Il deploy è separato dal CI (`deploy.yml` vs `ci.yml`). CI valida, deploy esegue. Se si aggiunge un ambiente di staging, il flusso diventa: CI → deploy staging → smoke → promote prod.

### Incident response

Quando qualcosa passa il CI e poi rompe:

**CI rotta su main.** Il merge su main è bloccato fino a fix. Chi ha causato il break apre un hotfix branch entro 1h. Se non è disponibile, chiunque può fixare. Nessun altro merge finché main non è verde.

**Migration rompe staging/prod.** Non applicare una migration correttiva al volo. Prima: verificare l'impatto (quante righe toccate, dati persi?). Se i dati sono intatti, scrivere una migration forward-only che corregge lo schema. Se c'è perdita di dati, fare rollback del deploy alla versione precedente e poi ragionare sulla fix con calma.

**Rollback vs hotfix.** Rollback se il problema è visibile agli utenti e la fix richiede più di 30 minuti. Hotfix se il problema è contenuto (es. un log rotto, un campo non visibile) e la fix è chiara. Nel dubbio, rollback — costa meno di un hotfix sbagliato.

**Chi decide il blocco.** Chi vede il problema lo segnala. Chi ha l'accesso al deploy può rollbackare autonomamente se il danno è utente-visibile. Per bloccare i merge su main serve una comunicazione esplicita (issue, messaggio, o commento sulla PR).

**Postmortem leggero.** Ogni incidente che richiede rollback o blocco merge genera una nota breve (anche un commento su issue o PR) con tre punti: cosa è successo, come è stato risolto, cosa si cambia per evitare che ricapiti. Non serve un documento formale — serve che la lezione venga scritta da qualche parte prima di chiudere l'incidente.

---

## 2 — Stabilità dell'esperienza

### Principi E2E

I test E2E non testano "il codice funziona" — testano "l'utente riesce a fare la cosa". Le regole:

- **Selettori**: solo `data-testid` tramite `e2e/sel.js`. Nessun `text=`, nessun CSS strutturale. Se un componente non ha testid, lo si aggiunge prima di scrivere il test.
- **Wait deterministici**: mai `page.waitForTimeout()`. Sempre `waitForSelector`, `waitForResponse`, o assertion con auto-retry di Playwright.
- **Isolamento auth**: il flusso di login è centralizzato in `e2e/auth.js`. I test non replicano la logica di login.
- **Flaky = bug**: un test flaky non si skippa — si fixa o si riscrive. Se fallisce per timing, il problema è nel wait. Se fallisce per stato, il problema è nell'isolamento.

### Quando gira cosa

| Suite | Trigger | Durata target | Cosa copre |
|---|---|---|---|
| **Smoke E2E** | Ogni PR, ogni push su main | < 2 min | Navigazione, rendering pagine, flussi pubblici. Obbligatoria — se fallisce, il merge è bloccato. |
| **Auth E2E** | Ogni PR (se `E2E_ENABLED=true`) | < 5 min | Login, MFA, CRUD task autenticato, permessi. Gira quando le credenziali E2E sono configurate. |
| **Nightly / suite lunghe** | Cron (da configurare) | < 15 min | Visual regression, flussi completi cross-vista, performance rendering. Oggi non attiva — da aggiungere quando le suite crescono oltre i 10 minuti su PR. |

Regola operativa: le suite su PR devono restare sotto 5 minuti totali. Quando un test nuovo porta il tempo oltre soglia, valutare se spostarlo nella nightly.

### Cosa testare con unit vs E2E

Unit test (Vitest + jsdom): hook, utility, logica di business, adapter, reducer. Tutto ciò che è pura funzione o stato isolabile. E2E (Playwright): flussi utente end-to-end, interazioni cross-componente, flussi di auth, comportamento reale del router.

La zona grigia — componenti con side effect pesanti — va coperta da integration test con `renderHook` + mock dei servizi.

---

## 3 — Gestione della complessità

### Snapshot del codebase

| Metrica | Valore |
|---|---|
| File sorgente (src/) | 142 |
| Linee di codice | 24.337 |
| Hook custom | 21 |
| Viste / pagine | 8 viste + 21 pagine |
| Moduli DB | 15 |
| Test unitari | 644 |
| Suite E2E | 6 |
| Chunk bundle | 40 |
| Bundle totale | 2.063 kB |

### I 10 file più grandi

| File | LOC |
|---|---|
| manualContent.jsx | 964 |
| RulesPanel.jsx | 579 |
| HomeDashboard.jsx | 544 |
| PeopleView.jsx | 514 |
| TimelineView.jsx | 480 |
| DashboardWidgets.jsx | 453 |
| CalendarView.jsx | 443 |
| FormsPanel.jsx | 428 |
| useRuleEngine.js | 407 |
| ProjectOverview.jsx | 402 |

Questi sono i candidati principali per il prossimo round di split se crescono ancora. Le soglie operative sono definite nella checklist pre-merge: >300 LOC segnalare, >500 LOC giustificare, >700 LOC non mergeabile senza eccezione. manualContent.jsx (964 LOC) è oggi l'unico file oltre soglia dura — accettabile come contenuto statico, ma da monitorare.

### Regola del "one in, one out"

Da v0.5.0 in poi, ogni nuova major feature (nuova vista, nuovo pannello, nuovo engine) deve essere accompagnata da almeno una di queste azioni: rimozione di una feature deprecata o non usata, split o semplificazione di un modulo esistente, oppure riduzione misurabile della superficie di test (meno mock, meno fixture, meno setup condiviso).

Lo scopo non è bloccare lo sviluppo ma forzare una valutazione esplicita del costo cognitivo di ogni aggiunta.

### Aree funzionali e profilo di rischio

TaskFlow copre queste aree. Per ognuna: livello di rischio, requisiti minimi su PR che la toccano, e chi dovrebbe fare review quando il team cresce.

| Area | File chiave | Rischio | Requisiti PR | Review suggerito |
|---|---|---|---|---|
| Core task management | tasks.js, sezioni, drag & drop | Alto | Unit test + E2E auth | Chi conosce il data model |
| Viste | Board, List, Calendar, Timeline, Portfolio, Dashboard | Medio | Smoke E2E + visual check mobile | Chiunque |
| Regole e automazioni | useRuleEngine, RulesPanel | Alto | Unit test regole + E2E se tocca UI | Chi ha scritto il rule engine |
| Forms e approvals | FormsPanel, FormSubmitModal, ApprovalSection | Medio | E2E del flusso submit/approve | Chi conosce il flusso utente |
| AI proxy | utils/ai.js | Basso (codice), alto (dipendenza) | Test resilience (ai.resilience.test.js) | Chiunque |
| PDF/export | reportPdf, exportCsv | Basso | Unit test output | Chiunque |
| Permessi e auth | permissions.js, LoginPage, MfaPage, org.js | Alto | E2E auth obbligatorio | Chi ha accesso ai secret |
| Audit | audit.js, retry.js | Basso | Unit test retry | Chiunque |
| Goals e time tracking | GoalsPanel, TimeTracker | Medio | Unit test logica | Chiunque |
| Manuale | ManualPage, manualContent | Basso | Nessuno specifico | Chiunque |

Oggi il team è piccolo e la review è informale. La colonna "review suggerito" diventa operativa quando si aggiungono contributor — a quel punto ogni area ad alto rischio dovrebbe avere almeno un reviewer designato.

### Bundle budget come guardrail

Il budget per chunk è definito in `bundle-budget.json` con 10% di headroom. CI fallisce se un chunk sfora. Per aggiornare dopo un refactor legittimo: `npm run bundle-size:update`. Il budget totale attuale è ~2.27 MB — l'obiettivo è mantenerlo sotto 2.5 MB per i prossimi 3 cicli.

### Quando aggiungere una nuova dipendenza

Prima di `npm install` una nuova libreria, verificare: è già coperta da qualcosa che abbiamo (date-fns, recharts, jspdf)? Quanto pesa sul bundle? (controllare con `npm run build && npm run bundle-size`). Ha alternative più leggere? Se aggiunge un nuovo chunk vendor sopra 50 kB, va discussa esplicitamente.

---

## Checklist pre-merge

Per ogni PR su `main`:

1. CI verde (lint + test + build + bundle-size)
2. Se tocca un flusso utente: E2E aggiornato o aggiunto
3. Se aggiunge/modifica hook: test unitario con `renderHook`
4. Se tocca DB: audit coverage verificata (writeAuditSoft sui write path)
5. Se cambia schema DB o payload/contract esterno: documentare compatibilità backward, strategia di backfill se necessaria, e piano di rollback nella PR description
6. Se aggiunge dipendenza: impatto bundle documentato
7. Soglie LOC per file nuovi o modificati:
   - \>300 LOC: segnalare nella PR description
   - \>500 LOC: spiegare perché non è stato splittato
   - \>700 LOC: non mergeabile senza eccezione motivata e approvata

---

## Prossimi cicli suggeriti

Questi non sono task — sono direzioni. La priorità dipende da quello che emerge dall'uso reale.

**Stabilità**: Portare la coverage E2E ai flussi di creazione task, regole, e forms. Aggiungere smoke test per le viste Calendar e Timeline che oggi non ne hanno. Valutare Playwright visual regression per i componenti più ricchi.

**Operativa**: Aggiungere un environment di staging se il deploy diventa più frequente. Valutare TypeScript incrementale (strict su `src/utils/` e `src/lib/db/` prima, il resto dopo). Automatizzare il changelog da commit convenzionali.

**Complessità**: Splittare RulesPanel (579 LOC) e HomeDashboard (544 LOC) seguendo il pattern usato per TaskPanel e ManualPage. Valutare se FormsPanel e DashboardWidgets possono diventare lazy-loaded. Rivedere i 21 hook per consolidare quelli con sovrapposizioni.
