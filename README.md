# TaskFlow — MiMic Lab

Project management app built for MiMic Lab (Politecnico di Milano).  
Inspired by Asana Starter, with integrated AI (Claude) for subtask generation, natural-language task creation, and project summaries.

---

## Quick start

```bash
cd taskflow
npm install
npm run dev
```

Opens at `http://localhost:5173`.  
Login with any test account — password: `mimic2026`

---

## Project structure

```
taskflow/
├── index.html                  # Entry point
├── vite.config.js              # Vite + path aliases (@/ → src/)
├── tailwind.config.js          # Tailwind (available but mostly using CSS vars)
├── postcss.config.js
├── package.json
│
└── src/
    ├── main.jsx                # React root mount
    ├── App.jsx                 # ★ All state, routing, AI calls live here
    ├── index.css               # CSS variables (light/dark), base styles
    │
    ├── i18n/                   # Bilingual IT/EN system
    │   ├── index.js            # LangCtx context + useLang() hook
    │   ├── it.js               # Italian strings
    │   └── en.js               # English strings
    │
    ├── data/
    │   ├── users.js            # USERS array + MEMBERS_LIST + DEMO_PASSWORD
    │   └── initialData.js      # Seed data: projects, portfolios, sections, tasks
    │
    ├── utils/
    │   ├── storage.js          # localStorage wrapper (prefix: tf_)
    │   ├── filters.js          # applyFilters() + isOverdue()
    │   ├── format.js           # fmtDate(), highlight(), todayStr()
    │   └── ai.js               # Anthropic API: generateSubtasks, createTaskFromText, summariseProject
    │
    ├── components/             # Shared UI primitives
    │   ├── Avatar.jsx          # Single user avatar (initials + color)
    │   ├── AvatarGroup.jsx     # Stacked avatar row (+N overflow)
    │   ├── Badge.jsx           # Priority badge (Alta/Media/Bassa)
    │   ├── Checkbox.jsx        # Animated check circle
    │   ├── StatusDot.jsx       # Project status indicator
    │   ├── FilterBar.jsx       # Search + 4 filter dropdowns
    │   ├── TaskCard.jsx        # Card used in board + list views
    │   └── index.js            # Barrel export
    │
    ├── layout/
    │   ├── IconSidebar.jsx     # Left icon nav (Home/Projects/etc + lang toggle)
    │   └── ContextSidebar.jsx  # Right contextual nav (project list or portfolio tree)
    │
    ├── views/                  # Content views (used inside project context)
    │   ├── BoardView.jsx       # Kanban with drag & drop
    │   ├── ListView.jsx        # Grouped list with collapsible sections
    │   ├── CalendarView.jsx    # Month calendar + upcoming sidebar
    │   └── MyTasksView.jsx     # Cross-project tasks grouped by urgency
    │
    └── pages/                  # Full-page screens and panels
        ├── LoginPage.jsx       # Auth screen with test account shortcuts
        ├── HomeDashboard.jsx   # Stat cards + open tasks + progress + team
        ├── BrowseProjects.jsx  # Project table with filters + create modal
        ├── PortfoliosView.jsx  # Portfolio cards with nested projects
        ├── PeopleView.jsx      # Team member cards with task counts
        ├── TaskPanel.jsx       # Right-side detail panel (editable)
        └── AddModal.jsx        # New task modal (manual + AI)
```

---

## Architecture decisions

### State management
All app state lives in `App.jsx` — no Redux, no Zustand. This is intentional for now: the app is small enough that prop drilling is manageable. When the team grows or features multiply, migrate to Zustand (simple) or React Query + Zustand (when Supabase is connected).

### i18n system
Uses React Context (`LangCtx`) with a plain object dictionary per language. Every component calls `useLang()` to get the translation object. Switching language re-renders everything via context.

To add a language: create `src/i18n/xx.js`, add it to `translations` in `src/i18n/index.js`, add a toggle button in `IconSidebar.jsx`.

### CSS approach
CSS custom properties (variables) defined in `index.css` for theming. Dark mode via `@media (prefers-color-scheme: dark)`. Tailwind is installed but mostly used for utility classes in new components. Inline styles are used in existing components for simplicity.

To migrate fully to Tailwind: replace inline `style={{}}` with `className=""` and use the CSS variables as Tailwind theme tokens (already configured in `tailwind.config.js`).

### Data persistence
Org data is loaded from **Supabase** when logged in (`src/lib/db.js`); the same state is mirrored to `localStorage` (`tf_*` keys via `src/utils/storage.js`) for offline-ish UX and instant UI.

Configure the project URL and anon key with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`), or rely on the dev defaults in `src/lib/supabase.js`.

### Team per organisation (Supabase)
People, assignee dropdowns and avatars load **`org_members` + `public.profiles`** via `fetchOrgDirectory()` in `src/lib/db.js`. Run **`supabase/migrations/002_profiles_org_directory.sql`** in the SQL Editor (after `001_init` / your base schema) so `profiles` exists, RLS allows teammates to see each other, and new sign-ups get a profile row. If the query fails or no members exist for an org, the UI falls back to the static lists in `src/data/users.js`.

Ensure each real user is in `org_members` for the orgs they belong to (e.g. `INSERT INTO public.org_members (user_id, org_id, role) VALUES (...)`).

### Supabase auth (browser)
The client uses a dedicated **`storageKey`** (`taskflow-auth`) so tokens don’t collide with other apps. Auth callbacks defer async work (`queueMicrotask`) so they don’t hold GoTrue’s cross-tab lock while calling PostgREST — that pattern avoids `Lock ... auth-token was not released` timeouts. If you still see stuck auth after an upgrade, clear site data for localhost or remove the `taskflow-auth` entry from Application → Local Storage.

### AI integration
`src/utils/ai.js` calls `api.anthropic.com` directly from the browser. **This exposes the API key** — acceptable for local use (`npm run dev`), not for production.

For production: replace the `fetch` in `callAI()` with a call to your Cloudflare Worker proxy URL. The Worker holds the real API key and enforces per-user quotas.

---

## Key data shapes

```js
// Task
{ id, pid, title, sec, who, due, pri, desc, subs, cmts, done }

// Subtask
{ id, t, done }

// Comment
{ id, who, txt, d }

// Project
{ id, name, color, members, status, portfolio }

// Portfolio
{ id, name, color, desc }

// User
{ id, name, email, role, color }
```

---

## Roadmap — features to add

### Next (frontend, no backend needed)
- [ ] **Timeline / Gantt view** — tasks as horizontal bars on a date axis. Needs `startDate` field on tasks.
- [ ] **Project overview page** — description, project roles, key resources, status (On track / At risk / Off track), activity log.
- [ ] **Dashboard charts** — bar chart (tasks by assignee), donut (by status), area (completions over time). Use Recharts (already installed).
- [ ] **Full-size calendar** — larger cells, hover "Add task", week/day views.
- [ ] **Drag-to-reschedule** on calendar.
- [ ] **Font size scaling** — replace `px` in components with `rem` + set `font-size` on `body` to a user-controlled value.

### Requires backend (Supabase + Cloudflare Worker)
- [ ] **Real authentication** — replace demo login with `supabase.auth.signInWithPassword()`
- [ ] **Database persistence** — replace localStorage with Supabase Postgres tables
- [ ] **Real-time collaboration** — `supabase.channel().on('postgres_changes', ...)` for live updates
- [ ] **File attachments** — Supabase Storage for task attachments
- [ ] **AI proxy** — Cloudflare Worker to protect API key + enforce per-user quotas
- [ ] **Email notifications** — Supabase Edge Functions for due date reminders

---

## Backend setup (when ready)

### Supabase tables needed
```sql
users        (id, name, email, role, color)
projects     (id, name, color, status, portfolio_id, created_by)
portfolios   (id, name, color, desc)
project_members (project_id, user_id)
sections     (id, project_id, name, position)
tasks        (id, project_id, section_id, title, description, assignee_id, due_date, priority, done, start_date)
subtasks     (id, task_id, title, done)
comments     (id, task_id, author_id, text, created_at)
```

### Cloudflare Worker (AI proxy)
```js
// workers/ai-proxy.js
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname !== '/ai') return new Response('Not found', { status: 404 })

    // Verify Supabase JWT
    const auth = request.headers.get('Authorization')
    // ... verify token with Supabase ...

    // Check quota in KV
    const userId = '...' // from JWT
    const key = `quota:${userId}:${new Date().toDateString()}`
    const count = parseInt(await env.QUOTA_KV.get(key) ?? '0')
    if (count >= 20) return new Response('Quota exceeded', { status: 429 })

    // Forward to Anthropic
    const body = await request.json()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_KEY },
      body: JSON.stringify(body),
    })

    await env.QUOTA_KV.put(key, String(count + 1), { expirationTtl: 86400 })
    return response
  }
}
```

---

## Environment variables

When deploying, create a `.env` file (never commit it):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AI_PROXY_URL=https://your-worker.workers.dev/ai
```

Then in `src/utils/ai.js`, replace the hardcoded endpoint with:
```js
const endpoint = import.meta.env.VITE_AI_PROXY_URL ?? 'https://api.anthropic.com/v1/messages'
```

---

## Development workflow

```bash
npm run dev      # local dev server with hot reload → localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build locally
```

Deploy `dist/` to Cloudflare Pages by connecting the GitHub repo in the Pages dashboard.
Build command: `npm run build` — output directory: `dist`

---

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 18 |
| Build tool | Vite 6 |
| Styling | CSS custom properties + Tailwind (utility classes) |
| Routing | App-level state (no router yet — single-page) |
| Data | localStorage → Supabase Postgres |
| AI | Anthropic Claude Sonnet (direct → via CF Worker) |
| Date utils | date-fns |
| Charts (planned) | Recharts |
| Deploy | Cloudflare Pages |
| Backend (planned) | Cloudflare Workers + Supabase |
