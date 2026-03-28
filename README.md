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
| Deploy | GitHub Pages (automated via GitHub Actions) |

---

## Project structure

```
taskflow/
├── index.html                     # SPA entry point
├── vite.config.js                 # Vite 6 + PWA + path aliases (@/ → src/)
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
    ├── App.jsx                    # App shell: state, routing, CRUD, layout
    ├── index.css                  # Design tokens, dark mode, base styles
    │
    ├── lib/                       # Data layer
    │   ├── supabase.js            # Supabase client config
    │   ├── auth.js                # Auth helpers (sign in/out, MFA, org membership)
    │   └── db.js                  # All CRUD operations + shape adapters
    │
    ├── hooks/
    │   └── useRealtimeSync.js     # Supabase realtime subscriptions
    │
    ├── context/                   # React contexts (cross-cutting concerns)
    │   ├── ToastCtx.jsx           # Toast notifications
    │   ├── UndoCtx.jsx            # Undo system (8-sec rollback window)
    │   ├── InboxCtx.jsx           # Activity feed (localStorage-persisted)
    │   └── OrgUsersCtx.jsx        # Org-scoped user directory
    │
    ├── i18n/                      # Bilingual IT/EN
    │   ├── index.js               # LangCtx + useLang() hook
    │   ├── it.js                  # Italian strings (~120 keys)
    │   └── en.js                  # English strings
    │
    ├── layout/                    # Shell components
    │   ├── IconSidebar.jsx        # Left icon nav (68px)
    │   ├── ContextSidebar.jsx     # Right contextual sidebar (240px)
    │   └── OrgSwitcher.jsx        # Organization switcher
    │
    ├── pages/                     # Full-page screens
    │   ├── LoginPage.jsx          # Email/password auth
    │   ├── MfaPage.jsx            # TOTP enrollment/verification
    │   ├── HomeDashboard.jsx      # Stats, charts, quick links
    │   ├── BrowseProjects.jsx     # Project table + create modal
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
    │   ├── TimelineView.jsx       # Gantt chart with dependency arrows
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
    │   └── index.js               # Barrel export
    │
    ├── utils/                     # Pure utility functions
    │   ├── ai.js                  # AI client (calls Edge Function proxy)
    │   ├── filters.js             # applyFilters(), isOverdue()
    │   ├── format.js              # fmtDate(), todayStr()
    │   ├── highlight.jsx          # Search term highlighting
    │   ├── initials.js            # User initials extraction
    │   ├── storage.js             # localStorage wrapper (tf_ prefix)
    │   └── exportCsv.js           # CSV export
    │
    ├── data/                      # Seed data
    │   ├── initialData.js         # PoliMi org seed
    │   ├── biomimxData.js         # BiomimX org seed
    │   ├── orgs.js                # Organization definitions
    │   └── users.js               # Static user list (legacy fallback)
    │
    └── test/
        └── setup.js               # Vitest + Testing Library setup
```

---

## Architecture decisions

### State management

All app state lives in `App.jsx` — no Redux, no Zustand. This is intentional for an early-stage app. Four React Contexts handle cross-cutting concerns: toast notifications, undo, activity feed, and org user directory.

### Routing

Uses `react-router-dom` v6 with full URL ↔ state sync. Route pattern: `/:nav/:pid/:view/:taskId`. Deep linking and browser back/forward work correctly. The `BrowserRouter` uses `/taskflow/` as base path for GitHub Pages.

### Data persistence

Supabase Postgres is the source of truth. Data is also cached in `localStorage` (`tf_*` keys) for instant UI on reload. The sync flow is: load from cache → display immediately → fetch from Supabase → update UI if different. All tables use `org_id` for multi-tenancy with Row Level Security.

### AI integration

`src/utils/ai.js` is a thin client that calls a Supabase Edge Function proxy (`supabase/functions/ai-proxy/`). The proxy holds the Anthropic API key server-side and adds rate limiting, input validation, and timeout handling. No API keys are exposed in the browser.

If the proxy is not configured (`VITE_AI_PROXY_URL` is empty), AI features are gracefully disabled — the UI never breaks.

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
  customValues, subs, cmts, deps }

// Project
{ id, name, color, status, statusLabel, portfolio,
  description, resources, members, customFields }

// Portfolio
{ id, name, color, desc, status }
```

---

## Features

- **5 project views**: Board (Kanban), List, Calendar, Timeline (Gantt), Overview
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
- **Project templates**: Kanban, Sprint, Research, Product Launch
