# TaskFlow — Development Document

> Project management application inspired by Asana, built for MiMic Lab at Politecnico di Milano.

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, CSS custom properties |
| Styling | Tailwind CSS (base only), CSS variables for design tokens, inline styles |
| Routing | react-router-dom v6 (URL ↔ state sync) |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| AI | Anthropic Claude (subtask generation, task creation, project summaries) |
| Charts | Recharts |
| i18n | Custom context-based system (Italian + English) |

### Codebase (~5,900 LOC)

```
src/
├── App.jsx              # Main app: state, CRUD, routing, layout
├── main.jsx             # Entry point (BrowserRouter)
├── index.css            # Design tokens, dark mode, utilities
│
├── lib/                 # Data layer
│   ├── supabase.js      # Supabase client config
│   ├── auth.js          # Auth helpers (sign in/out, MFA, org membership)
│   └── db.js            # All CRUD: tasks, projects, portfolios, sections, deps, attachments
│
├── hooks/
│   └── useRealtimeSync.js  # Supabase realtime subscriptions
│
├── context/             # React contexts
│   ├── OrgUsersCtx.jsx  # Org-scoped user list
│   ├── ToastCtx.jsx     # Toast notifications
│   ├── InboxCtx.jsx     # Activity feed (localStorage-persisted)
│   └── UndoCtx.jsx      # Undo system with rollback
│
├── i18n/                # Internationalization
│   ├── index.js         # LangCtx provider, useLang hook
│   ├── it.js            # Italian translations (~120 keys)
│   └── en.js            # English translations
│
├── layout/              # Shell components
│   ├── IconSidebar.jsx  # Main nav (68px icon sidebar)
│   ├── ContextSidebar.jsx # Project/portfolio list (240px)
│   └── OrgSwitcher.jsx  # Organization selector
│
├── pages/               # Page-level components
│   ├── HomeDashboard.jsx    # Dashboard with stats and charts
│   ├── LoginPage.jsx        # Auth page
│   ├── MfaPage.jsx          # 2FA enrollment/verification
│   ├── TaskPanel.jsx        # Task detail side panel
│   ├── AddModal.jsx         # New task modal
│   ├── BrowseProjects.jsx   # Project browser with add modal
│   ├── InboxView.jsx        # Activity feed
│   ├── PeopleView.jsx       # Team directory
│   └── PortfoliosView.jsx   # Portfolio management
│
├── views/               # Project view modes
│   ├── BoardView.jsx    # Kanban board (drag & drop, section CRUD)
│   ├── ListView.jsx     # Sortable list with bulk actions
│   ├── CalendarView.jsx # Month/week calendar
│   ├── TimelineView.jsx # Gantt-style timeline with dependency arrows
│   ├── MyTasksView.jsx  # Personal task list
│   └── ProjectOverview.jsx # Project settings, status, resources, custom fields
│
├── components/          # Shared UI components
│   ├── Avatar.jsx, AvatarGroup.jsx, Badge.jsx, Checkbox.jsx, StatusDot.jsx
│   ├── FilterBar.jsx    # Search + filters (priority, assignee, due, status, tags)
│   ├── CommandPalette.jsx # Cmd+K global search
│   └── TaskCard.jsx     # Card used in Board and MyTasks views
│
├── utils/               # Pure functions
│   ├── ai.js            # Claude API wrappers
│   ├── exportCsv.js     # CSV export
│   ├── filters.js       # applyFilters(), isOverdue()
│   ├── format.js        # fmtDate()
│   ├── highlight.jsx    # Search term highlighting
│   └── storage.js       # localStorage wrapper
│
└── data/                # Seed data
    ├── initialData.js   # PoliMi org: projects, portfolios, sections, tasks
    ├── biomimxData.js   # BiomimX org data
    ├── orgs.js          # Organization definitions
    └── users.js         # Static user directory (migrated to DB)
```

### Database Schema (Supabase / Postgres)

```
public.profiles        — User profiles (synced via auth trigger)
public.org_members     — Organization membership (org_id, user_id, role)
public.portfolios      — Portfolio groupings
public.projects        — Projects (custom_fields JSONB)
public.sections        — Kanban sections per project
public.tasks           — Tasks (tags, activity, custom_values, attachments JSONB)
public.subtasks        — Subtasks per task
public.comments        — Comments per task
public.task_dependencies — Blocked-by relationships
```

All tables use `org_id` for multi-tenancy with Row Level Security.

### Migrations

| # | File | What it does |
|---|------|-------------|
| 1 | `001_init.sql` | Base schema: portfolios, projects, sections, tasks, subtasks, comments |
| 2 | `002_profiles_org_directory.sql` | profiles table, auth trigger, org_members RLS |
| 3 | `003_task_dependencies.sql` | task_dependencies table, recurrence + attachments columns |
| 4 | `004_tags_activity_position.sql` | tags, activity, position JSONB/int columns on tasks |
| 5 | `005_custom_fields.sql` | custom_fields on projects, custom_values on tasks |

---

## Features Implemented

### Core Task Management
- **CRUD**: Create, update, delete tasks with optimistic UI
- **Sections**: Customizable Kanban sections per project (add, rename, delete)
- **Subtasks**: Nested checklist items with progress tracking
- **Comments**: Per-task comments with @mention autocomplete
- **Attachments**: File upload via Supabase Storage with download/remove
- **Tags/Labels**: Colored tags with inline creation, cross-task palette, filter support
- **Custom Fields**: Per-project text/number/select fields, values on each task
- **Task Dependencies**: Blocked-by relationships shown in Timeline (SVG arrows), Board (⊘ icon)
- **Recurrence**: Optional repeat schedule (daily, weekly, monthly)
- **Activity Log**: Per-task change history (who changed what, when)
- **Position Ordering**: Drag-and-drop order persisted to DB

### Views
- **Board** (Kanban): Drag & drop between and within sections, inline task creation
- **List**: Sortable (date, priority, name), multi-select + bulk actions (complete, move)
- **Calendar**: Month and week views, task chips by due date, "Next 7 days" sidebar
- **Timeline**: Gantt chart with zoom controls, dependency arrows, today marker
- **Project Overview**: Description, key resources, status, progress, members, custom fields config

### Navigation & Search
- **URL Routing**: Full URL ↔ state sync (deep linking, browser back/forward)
- **Command Palette** (Cmd+K): Search tasks, projects, views
- **Keyboard Shortcuts**: N (new task), H (home), 1-4 (views), Esc (close panels)
- **Filter Bar**: Text search (with tag matching), priority, assignee, due date, status, tag dropdown

### Organization & Multi-tenancy
- **Multiple Organizations**: Switch between orgs (e.g., PoliMi, BiomimX)
- **Org-scoped Users**: Each organization has its own member list
- **Portfolios**: Group projects into portfolios

### UI/UX
- **Dark Mode**: Three-state toggle (light, dark, auto/OS preference)
- **Internationalization**: Full Italian + English support (~120 keys)
- **Toasts**: Success/error notifications for all mutations
- **Undo System**: Temporal rollback for destructive actions (complete, move)
- **Activity Feed (Inbox)**: Chronological activity with unread badge
- **Mobile Responsive**: Collapsible sidebar, adaptive layout below 768px
- **Modal Accessibility**: role="dialog", aria-modal, backdrop close
- **Debounced Search**: 200ms debounce on filter bar input

### Data & Sync
- **Supabase Persistence**: All data synced to Postgres
- **Realtime Sync**: Subscribes to Postgres changes, auto-reloads on external mutations
- **localStorage Cache**: Instant load from cache, then sync from Supabase
- **CSV Export**: Download project tasks as CSV (includes custom fields)

### AI Features
- **Subtask Generation**: Claude generates subtask suggestions from task title/description
- **Smart Task Creation**: Natural language → structured task
- **Project Summary**: AI-generated status overview

### Auth & Security
- **Supabase Auth**: Email/password login
- **2FA/MFA**: TOTP enrollment and verification flow
- **Row Level Security**: All tables protected by org membership

### Project Templates
- **4 built-in templates**: Kanban, Sprint, Research, Product Launch
- Templates create projects with predefined sections and starter tasks

---

## Pending Migrations

Run these in Supabase SQL Editor if not already applied:

```sql
-- Migration 004
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS activity jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- Migration 005
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS custom_values jsonb DEFAULT '{}'::jsonb;
```

---

## What to Improve Next

### High Priority

1. **Code Splitting** — The JS bundle is 940KB. Lazy-load views with `React.lazy()` and route-based splitting. Expected savings: ~40%.

2. **Supabase Realtime RLS** — Realtime subscriptions currently use a broad `org_id` filter. Enable proper Postgres publication filters and RLS on the realtime channel for security.

3. **Error Boundaries** — No React error boundaries exist. A top-level boundary + per-view boundaries would prevent full-app crashes.

4. **Tests** — Zero test coverage. Priority areas:
   - `db.js` CRUD functions (unit tests with Supabase mocking)
   - `filters.js` (pure function, easy to test)
   - `exportCsv.js` (pure function)
   - Key user flows (integration tests with React Testing Library)

5. **Offline Mode** — The app falls back to localStorage but doesn't queue mutations for later sync. A proper offline queue would make it usable on flaky connections.

### Medium Priority

6. **Rules/Automation** — "When task moves to Done, notify assignee" or "auto-assign on section change." Requires a lightweight rule engine (stored as JSONB on projects).

7. **Email Notifications** — Supabase Edge Functions for daily digest of overdue/due-today tasks and @mention alerts.

8. **Subtask Nesting** — Currently single-level. Supporting multi-level subtasks would require a recursive data model.

9. **Forms / Intake** — Public forms that create tasks in a project, useful for external requests.

10. **Audit Log (Server-side)** — The current activity log is client-generated. A Postgres trigger-based audit log would be tamper-proof.

### Polish

11. **Drag & Drop Library** — The HTML5 DnD API is inconsistent on mobile. Migrating to `@dnd-kit/core` would improve reliability and enable touch support.

12. **Virtualization** — Large task lists (500+) will lag. React-window or TanStack Virtual for long lists.

13. **Search Indexing** — Full-text search currently runs client-side. Postgres `tsvector` + `GIN` index would scale to thousands of tasks.

14. **Accessibility Audit** — Keyboard navigation works for major flows, but focus management in modals and sidebar needs attention. ARIA roles are partial.

15. **Performance Monitoring** — No instrumentation. Adding Web Vitals tracking and Supabase query timing would identify bottlenecks.

---

## Environment

```bash
# Development
npm run dev        # Vite dev server on localhost:5173

# Production build
npm run build      # Output to dist/

# Preview production build
npm run preview
```

### Required Environment Variables (optional, has defaults)

```
VITE_SUPABASE_URL=https://ygcmvdvoflfslnccwrrf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
