# TaskFlow — Analisi UX competitiva e miglioramenti

**Data:** 15 giugno 2026 · **Prospettiva:** utilizzatore reale (team di un laboratorio di ricerca / progetti tipo grant EU)
**Confronto con:** Asana, monday.com, ClickUp, Linear, Trello, Notion
**Aree richieste:** usabilità grafica · calendari · organizzazione attività · comunicazione col team

---

## Premessa: dove gioca TaskFlow

TaskFlow non è (e non deve diventare) "l'ennesimo clone di Asana". Il suo vantaggio competitivo è il modello **research/grant-oriented**: Workpackage, Milestone, Deliverable, Partner, Governance/controlli ricorrenti, Supervision. Nessuno tra Asana/ClickUp/monday offre questo nativamente — gli accademici oggi lo ricostruiscono a mano con tag e liste.

La strategia giusta quindi è duplice: **(A)** raddoppiare sul niche ricerca (è il fossato), **(B)** chiudere i "table stakes" UX dove i tool mainstream hanno alzato l'asticella e dove oggi si sente la differenza. Questo documento si concentra su (B), con un occhio a (A).

Da sapere: TaskFlow è già più ricco di quanto sembri — ha tema chiaro/scuro/auto, calendario mese+settimana con drag, command palette (⌘K), viste Board/List/Timeline/Calendar/MyTasks/Dashboard, commenti con @menzioni che generano notifiche in Inbox, dipendenze, sotto-task, time tracking, campi custom, approvazioni, motore di regole (webhook/email), widget Workload. Le raccomandazioni partono da qui.

---

## 1. Usabilità grafica

**Cosa fanno i migliori.** Linear ha fatto della **velocità e della tastiera** un principio di design: ogni azione ha una scorciatoia, la command palette (⌘K) è il centro di tutto, UI ridotta all'essenziale, risposta in millisecondi. È il modello che i team tecnici amano.

**Cosa ha TaskFlow.** ⌘K esiste, ci sono scorciatoie (n/h/1-4), tema, UI pulita, aggiornamenti ottimistici. Buona base.

**Gap / opportunità.**

- **Scoperta delle scorciatoie e command palette "completa".** Oggi le scorciatoie non sono scopribili (manca un pannello `?`) e la palette serve soprattutto a navigare. Alla Linear: rendere la palette il punto da cui *creare un task, assegnare, cambiare stato/priorità, aprire un progetto, cambiare vista* — e aggiungere l'overlay `?` con tutte le scorciatoie. Alto impatto, sforzo medio.
- **Coerenza visiva.** Il codice usa stile inline ovunque, con pattern (badge, card, chip) ripetuti e leggermente divergenti. Estrarre un mini design-system (token + componenti `Badge/Chip/Card/EmptyState`) riduce il "rumore" visivo e velocizza lo sviluppo. (Già avviato con `useProjectLookups`; manca la parte stilistica.)
- **Stati vuoti e onboarding.** Mancano empty-state quando i filtri azzerano i risultati e un primo-avvio "crea il tuo primo progetto / workpackage". È il momento in cui un nuovo membro del lab decide se lo strumento è chiaro.
- **Densità e mobile.** Verificare la resa su schermi piccoli (molti ricercatori aprono al volo dal telefono per segnare una scadenza).

---

## 2. Calendari

**Cosa fanno i migliori.** Asana/monday/ClickUp: drag-and-drop su giorno/settimana/mese, **rescheduling trascinando**, aggiunta task direttamente dal calendario, viste workload, e — soprattutto — **sincronizzazione bidirezionale con Google/Outlook Calendar**. ClickUp/Asana stanno aggiungendo **suggerimenti di scheduling AI**.

**Cosa ha TaskFlow.** Vista calendario con mese + settimana e drag sulle date. Niente sync esterno, niente griglia oraria, niente "scheduling dal backlog".

**Gap / opportunità (questa è l'area con il salto di valore più alto per utenti accademici).**

- **Sync con Google Calendar / Outlook.** È la richiesta n.1 di chi "vive" in Outlook (PoliMi è Microsoft 365). Anche solo un **feed iCal in sola lettura** (URL sottoscrivibile) delle scadenze di task/milestone/deliverable darebbe enorme valore con sforzo contenuto. La sincronizzazione bidirezionale è il passo successivo.
- **Milestone e deliverable sul calendario.** Le scadenze di Supervision/Deliverable oggi vivono in viste separate: portarle sul calendario, color-coded, le rende finalmente "viste" da tutti. Sfrutta il niche.
- **Scheduling dal backlog.** Un pannello laterale con i task *senza data* da trascinare sul calendario (pattern Morgen/Motion) — utile per pianificare la settimana.
- **Ricorrenze davvero operative.** Esiste il campo `recurrence` sui task, ma va completata la generazione automatica delle istanze ricorrenti con una UI chiara (riunioni settimanali, report mensili, controlli di governance).
- **Vista per persona / capacità** sul calendario (chi è sovraccarico in una certa settimana).

---

## 3. Organizzazione delle attività

**Cosa fanno i migliori.** ClickUp vanta 15+ viste (List, Board, Gantt, Calendar, Timeline, **Workload**, Mind Map, Whiteboard); tutti offrono **viste salvate/filtrate per utente**, **swimlane**, dipendenze + Gantt, gestione risorse/workload interattiva, portfolio cross-progetto.

**Cosa ha TaskFlow.** Board (kanban), List con raggruppamenti e bulk, Timeline, dipendenze, sotto-task (1 livello), priorità, campi custom, template, regole. Il Workload è oggi un **widget** della dashboard.

**Gap / opportunità.**

- **Viste salvate.** Permettere a ciascuno di salvare combinazioni di filtro+raggruppamento+ordinamento ("Le mie scadenze WP3", "Task del partner X"). È tra le cose che più fanno percepire un tool come "professionale".
- **Vista Workload interattiva.** Trasformare il widget in una vista vera: persone in righe, settimane in colonne, sovraccarichi evidenziati, ribilanciamento via drag. Per un PI/coordinatore è oro.
- **Swimlane sulla Board.** Raggruppare le colonne anche per assegnatario / workpackage / priorità (oggi il grouping è parziale).
- **Portfolio timeline cross-progetto.** Una Gantt che mostra WP e milestone di più progetti del lab su un'unica linea temporale — il "quadro del laboratorio".
- **Relazioni tra task** oltre la singola dipendenza (blocca / collegato a / duplicato) e **sotto-task multilivello**, utili per scomporre deliverable complessi.

---

## 4. Comunicazione col team

**Cosa fanno i migliori.** Asana: commenti task + @menzioni + "project conversations", spesso con Slack a fianco. ClickUp: chat nativa, documenti collaborativi, lavagne e — rilevante — **proofing/annotazione su immagini, PDF e video** per i cicli di revisione.

**Cosa ha TaskFlow.** Commenti con @menzioni che **generano notifiche in Inbox** (buono!), allegati, time tracking, regole webhook/email come primitive.

**Gap / opportunità.**

- **Proofing/annotazione sugli allegati.** Per un lab che revisiona figure, paper, deliverable, poter **commentare un punto preciso di un PDF/immagine** è un differenziatore enorme e in tema col niche. Più utile qui che in un tool generico.
- **Notifiche su Teams/Slack.** Il webhook c'è come primitiva; un connettore **Microsoft Teams** di prima classe (PoliMi è M365) che posta su un canale "scadenza vicina / deliverable approvato / sei stato assegnato" chiude il cerchio della comunicazione dove il team già parla.
- **Digest email.** La primitiva `send_email` esiste: costruire un **digest giornaliero/settimanale** ("cosa ti è assegnato / cosa scade") riduce il bisogno di entrare nell'app e tiene vivo il progetto (bonus: tiene anche "sveglio" Supabase).
- **Bacheca/annunci di progetto.** Una discussione a livello di progetto (non solo per-task), tipo "project conversations" di Asana, per decisioni e comunicazioni generali.
- **Editor commenti più ricco + reazioni.** Markdown, allegati nel commento, emoji/reazioni, e @menzione di gruppi (@WP3, @partner) oltre ai singoli.

---

## Priorità consigliate

**Quick win (alto impatto / basso-medio sforzo)**
1. Feed **iCal in sola lettura** di scadenze/milestone/deliverable (sync calendario "minima").
2. **Viste salvate** (filtro+gruppo+ordinamento per utente).
3. **Digest email** giornaliero/settimanale (riusa `send_email`).
4. Overlay scorciatoie `?` + **command palette potenziata** (crea/assegna/cambia stato).
5. Milestone/deliverable **sul calendario**, color-coded.

**Scommesse più grandi (alto impatto / sforzo alto) — il fossato**
6. **Proofing/annotazione** su PDF/immagini dei deliverable.
7. Connettore **Microsoft Teams** (notifiche di canale).
8. Vista **Workload interattiva** + **portfolio timeline** cross-progetto.
9. **Sync bidirezionale** Google/Outlook Calendar.

**Igiene continua**
10. Mini design-system (coerenza visiva), empty-state/onboarding, polish mobile.

La logica: i punti 1–5 portano TaskFlow alla pari sui "table stakes" con poco sforzo; i punti 6–9 lo rendono *migliore* dei tool generici per il pubblico ricerca, sfruttando ciò che già lo distingue.

---

## Fonti
- [ClickUp — drag-and-drop scheduling](https://clickup.com/blog/drag-and-drop-scheduling-software/) · [ClickUp Calendar view](https://help.clickup.com/hc/en-us/sections/17044427193623-Calendar-view)
- [Asana Calendar view (2025)](https://ones.com/blog/comparison/asana-calendar-view-evaluating-features/) · [Asana vs ClickUp (collaborazione)](https://clickup.com/blog/asana-vs-clickup/) · [Asana vs ClickUp 2026](https://www.cloudwards.net/clickup-vs-asana/)
- [Linear — performance & design](https://techplanet.today/post/how-linear-achieves-blazing-fast-performance-a-deep-dive-into-modern-web-app-architecture) · [Linear delightful patterns](https://gunpowderlabs.com/2024/12/22/linear-delightful-patterns) · [Command palette UX](https://mobbin.com/glossary/command-palette)
- [Best PM calendar software 2026](https://thedigitalprojectmanager.com/tools/project-management-calendar/) · [Best Gantt software 2026 (monday)](https://monday.com/blog/project-management/best-gantt-chart-software-project-manager-tech-cm/)
