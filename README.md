# TaskFlow — MiMic Lab

Project management app built for MiMic Lab (Politecnico di Milano).
Inspired by Asana Starter, with integrated AI (Claude) for subtask generation, natural-language task creation, and project summaries.

---

## Quick start

```bash
git clone https://github.com/ringo977/taskflow.git
cd taskflow
npm install
npm run dev
```

Opens at `http://localhost:5173/taskflow/`.
Login with any test account — password: `mimic2026`

---

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 6 |
| Styling | CSS custom properties + Tailwind CSS 3 (utility classes) |
| Routing | react-router-dom v6 (full URL ↔ state sync, deep linking) |
| Data | Supabase Postgres + localStorage cache |
| Auth | Supabase Auth (email/password + TOTP 2FA) |
| Realtime | Supabase Realtime (postgres_changes) |
| Storage | Supabase Storage (file attachments) |
| AI | Anthropic Claude Sonnet via Supabase Edge Function proxy |
| Date utils | date-fns |
| Charts | Recharts |
| PWA | vite-plugin-pwa (offline shell, installable) |
| PDF reports | jsPDF (lazy-loaded) |
| Permissions | Per-project roles (owner/editor/viewer) + section/task visibility |
| Testing | Vitest + Testing Library (504 unit/integration tests, incl. property-based via fast-check) + Playwright E2E (28 tests: 7 smoke + 21 auth) |
| Deploy | GitHub Pages (automated via GitHub Actions) |

---

## Project structure

```
taskflow/
├── index.html                     # SPA entry point
├── vite.config.js                 # Vite 6 + PWA + path aliases + vendor chunk splitting
├── tailwind.config.js             # Tailwind config (mostly CSS vars)
├── eslint.config.js               # ESLint 9 flat config
├── .prettierrc                    # Prettier config
├── package.json                   # v0.5.0
├── .env.example                   # Environment variables template
│
├── .github/workflows/
│   ├── ci.yml                     # CI: lint + test + build on PR/push
│   └── deploy.yml                 # Deploy to GitHub Pages on push to main
│
├── supabase/
│   ├── migrations/                # 22 SQL migrations (001_init → 022_fix_project_member_default_role)
│   ├── functions/
│   │   └── ai-proxy/index.ts      # Edge Function: AI proxy (keeps API key server-side)
│   └── schema.sql                 # Base schema reference
│
└── src/
    ├── main.jsx                   # React root + BrowserRouter
    ├── App.jsx                    # Thin orchestrator (~156 LOC): bootstrap + providers + layout composition
    ├── index.css                  # Design tokens, dark mode, base styles
    ├── constants.js               # Shared constants (filters, templates, org seeds)
    │
    ├── lib/                       # Data layer
    │   ├── supabase.js            # Supabase client config
    │   ├── auth.js                # Auth helpers (sign in/out, MFA, org membership)
    │   ├── db.js                  # Re-export shim → db/ modules
    │   └── db/                    # Modular data layer (split from monolithic db.js)
    │       ├── index.js           # Barrel re-export + fetchOrgData
    │       ├── adapters.js        # Shape adapters (toTask, toProject, toPortfolio) + parseWho()
    │       ├── tasks.js           # Task CRUD + _persistRelated + multi-assignee serialization
    │       ├── projects.js        # Project + portfolio CRUD + task templates + permissions
    │       ├── sections.js        # Section operations
    │       ├── org.js             # Org directory, membership, join requests
    │       ├── trash.js           # Soft delete, restore, permanent delete
    │       ├── attachments.js     # Supabase Storage operations
    │       └── seed.js            # Org seeding
    │
    ├── hooks/                     # Custom hooks (business logic)
    │   ├── useAppBootstrap.js     # Auth, MFA, org init, realtime, data loading
    │   ├── useTaskActions.js      # Task CRUD with optimistic UI + revert on error
    │   ├── useProjectActions.js   # Project/portfolio CRUD with optimistic UI
    │   ├── useUIState.js          # Navigation, URL sync, keyboard shortcuts, modals
    │   ├── useAppActions.js        # Composed hook: wires task/project/section/AI + rule engine
    │   ├── useAIActions.js         # AI subtask gen, task creation, project summary
    │   ├── useSectionActions.js   # Kanban column (section) updates
    │   ├── useRuleEngine.js       # Automation rules: trigger detection + action execution
    │   ├── useRealtimeSync.js     # Supabase realtime: incremental sync (all event types)
    │   └── useLocalStorageSync.js # Batched localStorage writes via microtask
    │
    ├── context/                   # React contexts (cross-cutting concerns)
    │   ├── ToastCtx.jsx           # Toast notifications
    │   ├── UndoCtx.jsx            # Undo system (8-sec rollback window)
    │   ├── InboxCtx.jsx           # Activity feed (localStorage-persisted)
    │   └── OrgUsersCtx.jsx        # Org-scoped user directory
    │
    ├── i18n/                      # Bilingual IT/EN
    │   ├── index.js               # LangCtx + useLang() hook
    │   ├── it.js                  # Italian strings (~220 keys)
    │   └── en.js                  # English strings
    │
    ├── layout/                    # Shell & layout components
    │   ├── AuthGate.jsx           # Auth screen dispatcher (loading/login/MFA)
    │   ├── MainContent.jsx        # Nav routing + project view dispatcher
    │   ├── ModalLayer.jsx         # All floating panels & modals
    │   ├── IconSidebar.jsx        # Left icon nav (68px)
    │   ├── ContextSidebar.jsx     # Right contextual sidebar (240px)
    │   └── OrgSwitcher.jsx        # Organization switcher
    │
    ├── pages/                     # Full-page screens
    │   ├── LoginPage.jsx          # Email/password auth
    │   ├── MfaPage.jsx            # TOTP enrollment/verification
    │   ├── HomeDashboard.jsx      # 15-widget dashboard: stats, charts, deadlines, activity feed, project health
    │   ├── PortfoliosView.jsx     # Portfolio management
    │   ├── PeopleView.jsx         # Team directory with task counts
    │   ├── TaskPanel.jsx          # Task detail side panel (editable)
    │   ├── AddModal.jsx           # New task modal (manual + AI)
    │   ├── InboxView.jsx          # Activity feed
    │   ├── ManualPage.jsx         # Standalone bilingual manual (IT/EN, lazy-loaded)
    │   └── TrashView.jsx          # Soft-deleted items recovery
    │
    ├── views/                     # Project view modes
    │   ├── BoardView.jsx          # Kanban with drag & drop
    │   ├── ListView.jsx           # Sortable list with bulk actions
    │   ├── CalendarView.jsx       # Month/week calendar
    │   ├── TimelineView.jsx       # Gantt chart with drag & drop, tooltips, dependency arrows
    │   ├── ProjectOverview.jsx    # Project settings, status, custom fields
    │   └── MyTasksView.jsx        # Personal cross-project tasks
    │
    ├── components/                # Shared UI primitives
    │   ├── Avatar.jsx             # User avatar (initials + color)
    │   ├── AvatarGroup.jsx        # Stacked avatar row (+N overflow)
    │   ├── Badge.jsx              # Priority badge
    │   ├── Checkbox.jsx           # Animated check circle
    │   ├── StatusDot.jsx          # Project status indicator
    │   ├── FilterBar.jsx          # Search + 5 filter dropdowns
    │   ├── TaskCard.jsx           # Card for board/list views
    │   ├── CommandPalette.jsx     # Cmd+K global search
    │   ├── ConfirmModal.jsx       # Confirmation dialogs
    │   ├── LoadingScreen.jsx      # Boot loading screen
    │   ├── NewProjectModal.jsx    # New project creation modal
    │   ├── ProjectHeader.jsx      # Project header with view switcher
    │   ├── RulesPanel.jsx          # Automation rules editor (per-project)
    │   ├── FormsPanel.jsx          # Form builder (per-project)
    │   ├── FormSubmitModal.jsx     # Form submission modal → creates task
    │   ├── GoalsPanel.jsx          # Goals with automatic roll-up from linked tasks
    │   ├── TimeTracker.jsx         # Per-task time tracking (timer + manual entry)
    │   ├── ApprovalSection.jsx     # Task approval workflow (request → approve/reject)
    │   ├── SummaryPanel.jsx       # AI summary side panel
    │   ├── ErrorBoundary.jsx      # Error boundary + WidgetErrorBoundary for dashboard widgets
    │   └── index.js               # Barrel export
    │
    ├── utils/                     # Pure utility functions
    │   ├── ai.js                  # AI client (calls Edge Function proxy)
    │   ├── filters.js             # applyFilters(), isOverdue()
    │   ├── format.js              # fmtDate(), todayStr()
    │   ├── highlight.jsx          # Search term highlighting
    │   ├── initials.js            # User initials extraction
    │   ├── logger.js               # Structured logging: logger(module) → [TaskFlow:module] prefix + error sink hook
    │   ├── storage.js             # localStorage wrapper (tf_ prefix) + well-known key helpers
    │   ├── routing.js             # parseRoute(), buildPath(), deferAuthWork()
    │   ├── permissions.js          # Role hierarchy + per-project/section/task access checks
    │   ├── reportPdf.js            # Project status PDF report (jsPDF, lazy-loaded)
    │   └── exportCsv.js           # CSV export
    │
    ├── data/                      # Seed data
    │   ├── initialData.js         # PoliMi org seed
    │   ├── biomimxData.js         # BiomimX org seed
    │   └── orgs.js                # Organization definitions
    │
    └── test/
        └── setup.js               # Vitest + Testing Library + jest-dom setup

Tests: 532 total (504 unit/integration + 28 E2E).
Unit/integration (Vitest + Testing Library): 3 tiers — (1) base unit tests: permissions (45), filters (30), adapters (28), rule engine (28), hooks (useTaskActions, useProjectActions), components (FormSubmitModal, HomeDashboard); (2) resilience: corrupted localStorage + dashboard layout recovery, AI proxy edge cases + network failures, webhook/email timeout/failure, legacy JSONB + parseWho edge cases, milestones without due date + multi-assignee null; (3) property-based (fast-check): arbitrary trigger/action/condition combos, circuit breaker + dedup invariants, filter composition properties (subset, identity, monotonicity), isOverdue consistency, visibility filter safety; (4) concurrency: optimistic UI + revert on DB error, rapid sequential updates, undo integration, notification correctness.
E2E (Playwright): 7 smoke (manual page, no auth) + 21 auth (login + TOTP 2FA, dashboard layout, multi-assignee views, permissions, templates).
```

---

## Architecture decisions

### State management

`App.jsx` is a thin orchestrator (~156 LOC) that composes bootstrap, providers, and three layout components (`AuthGate`, `MainContent`, `ModalLayer`). All business logic lives in custom hooks, composed via `useAppActions`:

- **`useAppActions`** — top-level composition hook: wires task/project/section/AI actions together and wraps mutations with the rule engine
- **`useAppBootstrap`** — auth state, MFA flow, org initialization, realtime subscriptions, data loading from Supabase with localStorage fallback
- **`useTaskActions`** — task CRUD with optimistic UI and automatic revert on error
- **`useProjectActions`** — project/portfolio CRUD with optimistic UI and revert
- **`useUIState`** — navigation, URL sync, keyboard shortcuts, modal/filter state
- **`useAIActions`** — AI-driven subtask generation, natural-language task creation, project summary
- **`useSectionActions`** — Kanban column (section) rename/reorder with Supabase persistence
- **`useRuleEngine`** — automation rules engine: evaluates per-project rules on task mutations and runs periodic deadline checks

No Redux or Zustand. Five React Contexts handle cross-cutting concerns: toast notifications, undo (8-sec rollback), activity feed, org user directory, and app actions.

### Code splitting

`vite.config.js` uses `manualChunks` to separate heavy vendor libraries into dedicated bundles: `vendor-charts` (recharts, 432 KB), `vendor-pdf` (jsPDF, 391 KB), `vendor-supabase` (@supabase/supabase-js), `vendor-router` (react-router-dom), and `vendor-date` (date-fns). Combined with `React.lazy` and dynamic `import()`, this splits the former single ~1 MB bundle into a 137 KB core chunk plus on-demand page chunks. Recharts only loads when the user opens a chart-bearing view; jsPDF only loads when the user clicks "Generate Report".

### Data layer

The data layer lives in `src/lib/db/` — eight focused modules instead of one monolithic file:

- **`adapters.js`** — shape adapters mapping DB rows to client objects (`toTask`, `toProject`, `toPortfolio`)
- **`tasks.js`** — task CRUD with a shared `_persistRelated()` helper for subtasks and comments
- **`projects.js`** — project and portfolio CRUD
- **`sections.js`** — section CRUD (Kanban columns per project)
- **`org.js`** — org directory, membership, join requests, with `rpcOrFallback()` for graceful RPC degradation
- **`trash.js`** — soft delete, restore, permanent delete with cascading cleanup
- **`attachments.js`** — Supabase Storage upload/delete for file attachments
- **`seed.js`** — bulk org seeding (portfolios, projects, sections, tasks, subtasks)

All mutations follow optimistic-update-then-persist: the UI updates instantly, and if the DB call fails, the change is reverted and the user gets an error toast.

### Caching and sync

Supabase Postgres is the source of truth. Data is also cached in `localStorage` (`tf_*` keys, org-namespaced) for instant UI on reload. The sync flow is: load from cache → display immediately → fetch from Supabase → update UI if different. `useLocalStorageSync` batches all cache writes via microtask to minimize serialization overhead.

Realtime changes arrive via Supabase `postgres_changes` on the `tasks`, `projects`, and `comments` tables. `useRealtimeSync` handles every event type incrementally: UPDATE events merge DB scalars in-place via the `toTask`/`toProject` adapters (preserving local subs/cmts/deps), DELETE events remove the record from state directly, and INSERT events fetch the single new record with its relations (subtasks, comments, deps) and append it to state (with duplicate-guard for optimistic adds). Comment changes fetch the updated comment list for the parent task only. A debounced (800ms) full org data reload remains as last-resort fallback if any incremental fetch fails.

### Routing

Uses `react-router-dom` v6 with full URL ↔ state sync. Route pattern: `/:nav/:pid/:view/:taskId`. Deep linking and browser back/forward work correctly. Routing logic is extracted to `src/utils/routing.js` (`parseRoute`, `buildPath`). The `BrowserRouter` uses `/taskflow/` as base path for GitHub Pages.

### AI integration

`src/utils/ai.js` is a thin client that calls a Supabase Edge Function proxy (`supabase/functions/ai-proxy/`). The proxy holds the Anthropic API key server-side and adds rate limiting (20 req/min per IP), input validation, and 30s timeout handling. No API keys are exposed in the browser.

If the proxy is not configured (`VITE_AI_PROXY_URL` is empty), AI features are gracefully disabled — the UI never breaks.

### Observability and structured logging

All error and warning logs use a centralized `logger(module)` factory (`src/utils/logger.js`) that outputs messages with a `[TaskFlow:module]` prefix for easy filtering. Every error handler across the codebase (hooks, pages, views, context, DB layer) uses this logger — no silent `.catch(() => {})` remain. The logger's `error()` method forwards `Error` objects to an optional external sink via `setErrorSink(fn)`, ready for future Sentry integration. The only exception is `storage.js`, which uses a direct `console.warn` with `[TaskFlow:Storage]` prefix to avoid circular dependencies with the logger.

### Automation rules

Per-project automation rules are stored in `project.rules` JSONB (no extra DB table or migration needed). Each rule has a trigger, an action, and an enabled flag. The `useRuleEngine` hook evaluates rules after every task mutation and runs a periodic deadline check (every 60s). Supported triggers: task moves to section, deadline approaching (configurable N days), all subtasks completed, task assigned, priority changed, comment added, task completed, tag added. Supported actions: move to section, send notification (toast + inbox), set priority, mark as completed, assign to, add tag, set due date, create subtask, webhook (fire-and-forget HTTP POST to external URL with task payload and optional auth headers), send email (via Supabase Edge Function proxy with customizable subject/body supporting `{task}`, `{who}`, `{due}` placeholders). Rule actions use raw (unwrapped) task functions to prevent infinite loops — only user-initiated mutations trigger rule evaluation.

### Forms

Per-project forms are stored in `project.forms` JSONB. Each form defines a set of fields (text, textarea, select, date) with optional mapping to task properties (`title`, `desc`, `who`, `due`, `pri`). Unmapped fields are appended to the task description as `**Label**: value`. The `FormsPanel` component provides a form builder in the project overview; `FormSubmitModal` renders the form for submission and creates a task from the filled values.

### Goals

Per-project goals are stored in `project.goals` JSONB. Each goal can have sub-goals (key results), and each sub-goal links to specific tasks. Progress is computed automatically by counting linked tasks that are marked done, with sub-goal progress rolling up into the parent goal percentage. The `GoalsPanel` component displays progress bars and provides a goal/sub-goal editor with task linking.

### Time tracking

Time entries are stored in `task.timeEntries` JSONB array. Each entry has `{ id, who, start, end, duration, note }` where duration is in minutes. The `TimeTracker` component provides a live start/stop timer (ticking every second) and manual time entry. Total logged time is displayed in the task panel.

### Approval workflow

Approval state is stored in `task.approval` JSONB: `{ status, requestedBy, approver, requestedAt, resolvedAt, comment }`. Status transitions: none → pending → approved/rejected/changes_requested. The `ApprovalSection` component in the task panel handles request submission and resolution. Approval status icons are shown on task cards in board/list views.

### Project reports

The "Generate Report (PDF)" button in ProjectOverview produces a comprehensive A4 status report via `src/utils/reportPdf.js`. The report includes six sections: project header with status badge, progress overview with stat cards and progress bar, task breakdown by section (table), priority distribution (horizontal bars), upcoming deadlines (next 14 days), and team workload. jsPDF (~391 KB) is loaded lazily via dynamic `import()` on button click so it never impacts initial page load. Full i18n support (IT/EN).

### Multiple assignees

The `who` field on tasks supports both a single string (legacy) and an array of strings. The `parseWho()` adapter in `adapters.js` normalizes all forms (null, empty string, plain string, JSON-encoded array) into a consistent array. On write, arrays are serialized as `JSON.stringify` into the existing `assignee_name` text column — no migration needed. The `AvatarGroup` component renders stacked avatars for multi-assigned tasks across Board, List, Calendar, and Timeline views. The assignee filter in `filters.js` checks array inclusion. Activity tracking and assignment notifications in `useTaskActions` diff arrays to detect newly added assignees. CSV export joins multiple assignees with semicolons; PDF reports flatten multi-assigned tasks for workload analysis.

### Milestones

A task can be flagged as a milestone via a boolean `milestone` field (default `false`). Milestones render as diamond shapes (◆) in Timeline/Gantt view (a 20×20px rotated square at the due date position) and as diamond indicators on Calendar chips and task cards. No new DB table — the field is persisted as a regular column on the tasks table. The TaskPanel provides a simple checkbox toggle.

### Task templates

Task templates are stored in `project.taskTemplates` JSONB array (same pattern as rules, forms, goals — no migration). Each template captures title, description, priority, section, tags, and subtask list. The `SaveTemplateButton` in ProjectOverview lets users pick an existing task and save its structure as a reusable template. The `AddModal` offers a template selector dropdown that pre-fills the form via `applyTemplate()`. Templates are scoped per project.

### Granular permissions

Two-tier role model: organization-level roles control broad capabilities, project-level roles control per-project access.

Organization roles (managed in PeopleView admin panel): `admin` has full ownership on every project, can create projects/portfolios, manage members; `manager` can create projects/portfolios and defaults to editor on all projects; `member` can work on tasks (editor) in projects they belong to, but cannot create projects; `guest` has read-only access (viewer) on projects they belong to.

Project roles (managed in ProjectOverview members panel): `owner`, `editor`, `viewer`. An explicit project role always overrides the org-level default. The `getProjectRole()` function in `src/utils/permissions.js` resolves the effective role by checking org role first, then project membership. All views (AddModal, BoardView, ListView, TaskPanel) use this unified resolver — no direct `myProjectRoles` fallback. Admins can transfer project ownership to any member from the ProjectOverview members panel.

Member badges: the sidebar shows small avatar circles (initials) for each project's members, fetched via a `get_all_project_members()` SECURITY DEFINER RPC that bypasses RLS. Up to 3 avatars are shown with an overflow count.

Additional access checks: section-level access can restrict visibility to editors-only or all members; task-level visibility can be limited to assignees only. Permission data is stored in project JSONB fields (`visibility`, `section_access`) and task fields (`visibility`). This is currently enforced at the UI level; Supabase RLS enforcement can be added later for server-side security.

### Customizable dashboard

`HomeDashboard` supports a fully configurable layout with 13 widget types registered in `WIDGET_REGISTRY` (bilingual labels). Users can enter edit mode ("⚙ Customize") to toggle widget visibility, cycle through three sizes (small/medium/large), and reorder widgets via native HTML5 drag and drop. Layout state (visibility, order, size per widget) persists in localStorage (`tf_dashboard_layout`). Stats cards are always pinned at the top. A "Reset layout" button restores defaults. The layout uses CSS flex-wrap for responsive flow.

### Manual page

The sidebar's manual button opens `/taskflow/manual` in a new tab. `ManualPage.jsx` is a standalone, lazy-loaded page (~65 KB chunk) with 19 sections covering every feature. It reads `tf_lang` from localStorage for bilingual IT/EN content. A sticky sidebar TOC uses `IntersectionObserver` for scroll-tracking with active-section highlighting. The page is responsive (TOC hidden on mobile) and styled with the app's CSS custom variables.

### Multi-tenancy

Each organization has isolated data via `org_id` columns and Postgres RLS policies. Users can belong to multiple orgs and switch between them. Org membership is managed via `org_members` table with role-based access (owner, admin, manager, member).

---

## Environment variables

Copy `.env.example` to `.env.local` for local overrides:

```env
# Supabase (defaults baked in for dev — override for your own instance)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI proxy (leave empty to disable AI features)
VITE_AI_PROXY_URL=https://your-project.supabase.co/functions/v1/ai-proxy
```

### AI proxy setup (Supabase Edge Function)

```bash
# 1. Set the Anthropic API key as a secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 2. Deploy the Edge Function
supabase functions deploy ai-proxy --no-verify-jwt

# 3. Set the proxy URL in your environment
# VITE_AI_PROXY_URL=https://<your-project>.supabase.co/functions/v1/ai-proxy
```

---

## Development workflow

```bash
npm run dev          # Vite dev server → localhost:5173
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format
npm run test         # Run tests (Vitest)
npm run test:watch   # Run tests in watch mode
npm run validate     # Full check: lint + test + build

# E2E tests (Playwright)
npx playwright install  # First time: download browsers
npm run e2e:smoke       # Smoke tests (no auth, always green)
npm run e2e:auth        # Auth tests (needs Supabase + .env.e2e)
npm run e2e             # All E2E tests
npm run e2e:ui          # Interactive Playwright UI
```

### E2E credentials

Copy `.env.e2e.example` to `.env.e2e` and fill in your test account:

```env
E2E_EMAIL=your@email.com
E2E_PASSWORD=your-password
E2E_TOTP_SECRET=BASE32_SECRET   # only if MFA enrolled
```

The TOTP secret is the base32 key from your authenticator app. To reset it: `node scripts/reset-totp.mjs <email> <password> <current-6-digit-code>`

---

## Deploy

The project deploys automatically to **GitHub Pages** via GitHub Actions.

- **CI pipeline** (`.github/workflows/ci.yml`): runs lint, test, and build on every push and PR to `main`. Blocks merge if any step fails.
- **Deploy pipeline** (`.github/workflows/deploy.yml`): builds and deploys to GitHub Pages on push to `main`.

Live at: `https://ringo977.github.io/taskflow/`

### Environment configuration

Copy `.env.example` to `.env.local` to override defaults. The three variables are `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_AI_PROXY_URL` (optional — leave empty to disable AI features). The GitHub Actions deploy uses the baked-in defaults for the shared demo instance.

---

## Database

### Supabase schema

22 migrations in `supabase/migrations/` build up the schema incrementally:

| Tables | Purpose |
|---|---|
| `profiles` | User profiles (synced via auth trigger) |
| `org_members` | Organization membership (role-based) |
| `org_join_requests` | Pending org join requests |
| `portfolios` | Portfolio groupings |
| `projects` | Projects (with custom_fields JSONB) |
| `project_members` | Project-level membership |
| `sections` | Kanban sections per project |
| `tasks` | Tasks (tags, activity, position, recurrence, attachments JSONB) |
| `subtasks` | Checklist items per task |
| `comments` | Per-task comments |
| `task_dependencies` | Blocked-by relationships |

All tables are protected by org-scoped Row Level Security.

---

## Key data shapes

```js
// Task
{ id, pid, sec, title, desc, who, pri, startDate, due, done,
  recurrence, attachments, tags, activity, position,
  customValues, createdAt, updatedAt, subs, cmts, deps,
  timeEntries, approval, milestone, visibility }

// Project
{ id, name, color, status, statusLabel, portfolio,
  description, resources, members, customFields,
  rules, forms, goals, taskTemplates,
  visibility, sectionAccess }

// Portfolio
{ id, name, color, desc, status }
```

---

## Features

- **5 project views**: Board (Kanban with card animations), List, Calendar (drag & drop date changes, hover previews), Timeline (Gantt with drag & drop scheduling, resize edges, hover tooltips, filter integration, interactive dependency arrows), Overview
- **Task management**: CRUD, subtasks, comments, attachments, tags, custom fields, dependencies, recurrence
- **AI-powered**: Subtask generation, natural-language task creation, project summaries (via Claude)
- **Multi-org**: Organization switching, role-based access, member management
- **Auth**: Email/password + TOTP 2FA via Supabase Auth
- **Realtime**: Live updates via Supabase postgres_changes
- **i18n**: Italian + English
- **Dark mode**: Three-state toggle (light/dark/auto)
- **Keyboard shortcuts**: Cmd+K (search), N (new task), H (home), 1-4 (views)
- **Undo system**: 8-second rollback for destructive actions
- **Soft delete**: Trash view with restore and permanent delete
- **CSV export**: Download project tasks as spreadsheet
- **PWA**: Installable, offline shell
- **Automation rules**: 8 triggers × 10 actions with multi-action chains and conditional filters (priority, assignee, tag, section). Triggers: section change, deadline, subtasks done, assignment, priority changed, comment added, task completed, tag added. Actions: move, notify, set priority, complete, assign, add tag, set due date, create subtask, webhook (outbound HTTP POST), send email (via Edge Function). Loop guard: cascade depth limit (3), dedup window (500ms), circuit breaker (20 fires/tick)
- **Multiple assignees**: Assign multiple team members to a task — stacked AvatarGroup display across all views, array-aware filters, notifications for newly added assignees
- **Milestones**: Flag tasks as milestones — diamond rendering in Timeline/Gantt, indicators on Calendar and task cards
- **Task templates**: Save any task as a reusable template (title, description, priority, subtasks, tags); load templates when creating new tasks
- **Granular permissions**: Per-project roles (owner/editor/viewer) with admin ownership transfer, per-section access control, per-task visibility (all / assignees only), member badges in sidebar
- **Customizable dashboard**: Drag & drop widget reorder, toggle visibility, 3 size options per widget, localStorage persistence, reset to defaults
- **Dashboard**: 15 widgets — burndown, velocity, workload capacity, section completion, priority/status breakdown, upcoming deadlines (7-day lookahead), recent activity feed (scrollable, up to 15 events), project health scores (traffic-light cards). Activity feed derives timestamps from the task activity log and DB `updated_at`/`created_at` fields for accuracy, with due-date fallback for legacy tasks. Both activity and deadline widgets use fixed-height scrollable containers (Asana-style)
- **Manual**: Standalone bilingual (IT/EN) documentation page with 19 sections, sticky scroll-tracking TOC, lazy-loaded
- **Project templates**: Kanban, Sprint, Research, Product Launch — with pre-configured custom fields, rules, forms, and goals
- **Forms**: Visual form builder with 8 field types (text, textarea, select, date, number, checkbox, url, email), drag reorder, live preview, placeholder/default values, and task property mapping
- **Goals**: Per-project goals with animated SVG progress rings and automatic roll-up from linked tasks; supports sub-goals (key results)
- **Time tracking**: Per-task start/stop timer and manual time entry with duration logging
- **Approval workflow**: Request, approve, reject, or request changes on any task — visible status badges on task cards
- **Visual polish**: Skeleton loading screen, card slide-in animations on Board, rich toasts with progress bar, calendar hover previews
- **Notifications + Inbox**: In-app notification system — task assignments, @mentions, comments, approval requests/resolutions, dependency unblocks, due-date-approaching alerts; badge count on sidebar, click-to-open-task, mark read/all read
- **Mobile responsive**: Full smartphone/tablet support — collapsible sidebar with hamburger menu, stacked dashboard grids, single-column overview, horizontal-scroll board, full-width task panel, responsive modals
