# Roadmap implementativa — Partners / Teams

> Feature completa: v0.5.2 · aprile 2026
> Tutti i milestone completati (M1–M4)

---

## Scelte architetturali

### Partner come entità org-level

Un partner appartiene all'organizzazione (non al singolo progetto), collegato
ai progetti tramite junction table. Questo permette di riutilizzare lo stesso
partner su più progetti senza duplicazione.

### Struttura dati

```
organizations
  └─ partners (org-level, reusable)
       └─ project_partners (junction: project ↔ partner)

tasks
  └─ partner_id (nullable FK → partners, one-to-one)
```

### Non tocca auth / RLS utente

I partner usano le stesse RLS org-based delle tabelle supervision:
- SELECT: `get_org_role(org_id) IS NOT NULL`
- INSERT/UPDATE/DELETE: `get_org_role(org_id) IN ('admin', 'manager')`

---

## Milestone 1 — Foundation ✅

| Fase | Descrizione | Stato |
|---|---|---|
| 1A.1 | Migration `034_partners.sql` — tabelle, RLS, indici | ✅ Done |
| 1A.2 | DB adapter `src/lib/db/partners.js` — CRUD + audit | ✅ Done |
| 1A.3 | Schema Zod `PartnerUpsertSchema` in schemas.js | ✅ Done |
| 1A.4 | Hook `usePartners(orgId, projectId)` — state + CRUD | ✅ Done |
| 1A.5 | UI `PartnersPanel` in ProjectOverview sidebar | ✅ Done |
| 1A.6 | TaskPanel + AddModal — campo partner selector | ✅ Done |
| 1A.7 | i18n IT + EN (~20 chiavi) | ✅ Done |

---

## Milestone 2 — Filters + Display ✅

| Fase | Descrizione | Stato |
|---|---|---|
| 2.1 | FilterBar — partner filter dropdown | ✅ Done |
| 2.2 | filters.js — partner filter logic | ✅ Done |
| 2.3 | ListView — partner badge column | ✅ Done |
| 2.4 | BoardView — partner badge in TaskCard | ✅ Done |

---

## Milestone 3 — Reporting ✅

| Fase | Descrizione | Stato |
|---|---|---|
| 3.1 | Dashboard widget `tasksPartner` — bar chart | ✅ Done |
| 3.2 | CSV export — partner column (lazy-loaded) | ✅ Done |
| 3.3 | PDF report — partner engagement section | ✅ Done |
| 3.4 | ProjectOverview — partner engagement card | ✅ Done |
| 3.5 | Selectors — `computeTasksPerPartner` | ✅ Done |
| 3.6 | i18n — 3 chiavi report (partnerEngagement, chartTasksPerPartner, reportPartners) | ✅ Done |

---

## Milestone 4 — Hardening ✅

| Fase | Descrizione | Stato |
|---|---|---|
| 4.1 | Unit test partners adapter (mock Supabase) | ✅ Done |
| 4.2 | Unit test PartnerUpsertSchema + TaskUpsertSchema partnerId | ✅ Done |
| 4.3 | Unit test `computeTasksPerPartner` selectors | ✅ Done |
| 4.4 | Unit test partner filter in filters.js | ✅ Done |
| 4.5 | Manual section — manualContent + manualI18n (IT + EN) | ✅ Done |
| 4.6 | CONSOLIDATION.md — partner area + metrics update | ✅ Done |
| 4.7 | Bundle budget aggiornato per tutti i chunk impattati | ✅ Done |
| 4.8 | Build + test + lint verification | ✅ Done |

---

## Riepilogo file toccati

### File nuovi
- `supabase/migrations/034_partners.sql`
- `src/lib/db/partners.js`
- `src/lib/db/partners.test.js`
- `src/hooks/usePartners.js`
- `src/components/PartnersPanel.jsx`

### File modificati
- `src/lib/db/adapters.js` — partnerId in toTask
- `src/lib/db/tasks.js` — FIELD_MAP + upsertTask
- `src/lib/db/schemas.js` — PartnerUpsertSchema + partnerId nei task schemas
- `src/lib/db/schemas.test.js` — test PartnerUpsertSchema + partnerId
- `src/pages/TaskPanel.jsx` — partner select
- `src/pages/AddModal.jsx` — partner select
- `src/views/ProjectOverview.jsx` — PartnersPanel + engagement card + orgId prop
- `src/layout/MainContent.jsx` — orgId threading + lazy partner export
- `src/layout/ModalLayer.jsx` — orgId + project props to AddModal
- `src/components/FilterBar.jsx` — partner filter dropdown
- `src/utils/filters.js` — partner filter logic
- `src/utils/filters.test.js` — partner filter tests
- `src/utils/selectors.js` — computeTasksPerPartner
- `src/utils/selectors.test.js` — partner selector tests
- `src/utils/exportCsv.js` — partner column
- `src/utils/reportPdf.js` — partner section
- `src/views/ListView.jsx` — partner badge
- `src/views/BoardView.jsx` — partner badge
- `src/components/TaskCard.jsx` — partnerName prop
- `src/pages/dashboardConfig.js` — tasksPartner widget
- `src/pages/DashboardWidgetGrid.jsx` — partner widget case + orgId
- `src/pages/HomeDashboard.jsx` — orgId prop
- `src/components/DashboardWidgets.jsx` — TasksPerPartnerWidget
- `src/i18n/it.js` — ~21 chiavi partner
- `src/i18n/en.js` — ~21 chiavi partner
- `src/pages/manual/manualContent.jsx` — sezione partner
- `src/pages/manual/manualI18n.js` — voce partner
- `bundle-budget.json` — budget aggiornati
