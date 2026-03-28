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
| Testing | Vitest + Testing Library (179 tests, >80% coverage) |
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
│   ├── migrations/                # 19 SQL migrations (001_init → 019_org_members_realtime)
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
    │       ├── adapters.js        # Shape adapters (toTask, toProject, toPortfolio)
    │       ├── tasks.js           # Task CRUD + _persistRelated helper
    │       ├── projects.js        # Project + portfolio CRUD
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
    │   └── index.js               # Barrel export
    │
    ├── utils/                     # Pure utility functions
    │   ├── ai.js                  # AI client (calls Edge Function proxy)
    │   ├── filters.js             # applyFilters(), isOverdue()
    │   ├── format.js              # fmtDate(), todayStr()
    │   ├── highlight.jsx          # Search term highlighting
    │   ├── initials.js            # User initials extraction
    │   ├── storage.js             # localStorage wrapper (tf_ prefix) + well-known key helpers
    │   ├── routing.js             # parseRoute(), buildPath(), deferAuthWork()
    │   └── exportCsv.js           # CSV export
    │
    ├── data/                      # Seed data
    │   ├── initialData.js         # PoliMi org seed
    │   ├── biomimxData.js         # BiomimX org seed
    │   └── orgs.js                # Organization definitions
    │
    └── test/
        └── setup.js               # Vitest + Testing Library + jest-dom setup

Tests: 107 total — 9 unit-test files for utils + 2 integration-test files for hooks (`useTaskActions.test.js`, `useProjectActions.test.js`).
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

`vite.config.js` uses `manualChunks` to separate heavy vendor libraries into dedicated bundles: `vendor-charts` (recharts), `vendor-supabase` (@supabase/supabase-js), `vendor-router` (react-router-dom), and `vendor-date` (date-fns). Combined with `React.lazy`, this splits the former single ~1 MB bundle into a 112 KB core chunk plus on-demand page chunks (0.3–21 KB each). Recharts (432 KB) only loads when the user opens a chart-bearing view.

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

### Automation rules

Per-project automation rules are stored in `project.rules` JSONB (no extra DB table or migration needed). Each rule has a trigger, an action, and an enabled flag. The `useRuleEngine` hook evaluates rules after every task mutation and runs a periodic deadline check (every 60s). Supported triggers: task moves to section, deadline approaching (configurable N days), all subtasks completed, task assigned. Supported actions: move to section, send notification (toast + inbox), set priority, mark as completed. Rule actions use raw (unwrapped) task functions to prevent infinite loops — only user-initiated mutations trigger rule evaluation.

### Forms

Per-project forms are stored in `project.forms` JSONB. Each form defines a set of fields (text, textarea, select, date) with optional mapping to task properties (`title`, `desc`, `who`, `due`, `pri`). Unmapped fields are appended to the task description as `**Label**: value`. The `FormsPanel` component provides a form builder in the project overview; `FormSubmitModal` renders the form for submission and creates a task from the filled values.

### Goals

Per-project goals are stored in `project.goals` JSONB. Each goal can have sub-goals (key results), and each sub-goal links to specific tasks. Progress is computed automatically by counting linked tasks that are marked done, with sub-goal progress rolling up into the parent goal percentage. The `GoalsPanel` component displays progress bars and provides a goal/sub-goal editor with task linking.

### Time tracking

Time entries are stored in `task.timeEntries` JSONB array. Each entry has `{ id, who, start, end, duration, note }` where duration is in minutes. The `TimeTracker` component provides a live start/stop timer (ticking every second) and manual time entry. Total logged time is displayed in the task panel.

### Approval workflow

Approval state is stored in `task.approval` JSONB: `{ status, requestedBy, approver, requestedAt, resolvedAt, comment }`. Status transitions: none → pending → approved/rejected/changes_requested. The `ApprovalSection` component in the task panel handles request submission and resolution. Approval status icons are shown on task cards in board/list views.

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
```

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

19 migrations in `supabase/migrations/` build up the schema incrementally:

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
  customValues, subs, cmts, deps,
  timeEntries, approval }

// Project
{ id, name, color, status, statusLabel, portfolio,
  description, resources, members, customFields,
  rules, forms, goals }

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
- **Automation rules**: 8 triggers × 8 actions with multi-action chains and conditional filters (priority, assignee, tag, section). Triggers: section change, deadline, subtasks done, assignment, priority changed, comment added, task completed, tag added. Actions: move, notify, set priority, complete, assign, add tag, set due date, create subtask. Loop guard: cascade depth limit (3), dedup window (500ms), circuit breaker (20 fires/tick)
- **Dashboard**: 15 widgets — burndown, velocity, workload capacity, section completion, priority/status breakdown, upcoming deadlines (7-day lookahead), recent activity feed, project health scores (traffic-light cards)
- **Project templates**: Kanban, Sprint, Research, Product Launch — with pre-configured custom fields, rules, forms, and goals
- **Forms**: Visual form builder with 8 field types (text, textarea, select, date, number, checkbox, url, email), drag reorder, live preview, placeholder/default values, and task property mapping
- **Goals**: Per-project goals with animated SVG progress rings and automatic roll-up from linked tasks; supports sub-goals (key results)
- **Time tracking**: Per-task start/stop timer and manual time entry with duration logging
- **Approval workflow**: Request, approve, reject, or request changes on any task — visible status badges on task cards
- **Visual polish**: Skeleton loading screen, card slide-in animations on Board, rich toasts with progress bar, calendar hover previews
- **Notifications + Inbox**: In-app notification system — task assignments, @mentions, comments, approval requests/resolutions, dependency unblocks, due-date-approaching alerts; badge count on sidebar, click-to-open-task, mark read/all read
- **Mobile responsive**: Full smartphone/tablet support — collapsible sidebar with hamburger menu, stacked dashboard grids, single-column overview, horizontal-scroll board, full-width task panel, responsive modals
