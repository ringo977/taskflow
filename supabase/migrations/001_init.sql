-- ============================================================
-- TaskFlow — Full database schema
-- Run this in Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── 1. Create org schemas ─────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS polimi;
CREATE SCHEMA IF NOT EXISTS biomimx;

-- ── 2. Org membership (shared, in public schema) ──────────────
CREATE TABLE IF NOT EXISTS public.org_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     text NOT NULL CHECK (org_id IN ('polimi', 'biomimx')),
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, org_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Users can read their own memberships
CREATE POLICY "read own memberships"
  ON public.org_members FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage memberships in their org
CREATE POLICY "admins manage memberships"
  ON public.org_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members m
      WHERE m.user_id = auth.uid()
        AND m.org_id = org_members.org_id
        AND m.role = 'admin'
    )
  );

-- ── 3. Helper: check if current user belongs to an org ────────
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = auth.uid() AND org_id = p_org_id
  );
$$;

-- ── 4. Factory macro: create tables in a given schema ─────────
-- We create identical table structures in both schemas.
-- Repeat for each schema.

-- ============================================================
-- SCHEMA: polimi
-- ============================================================

CREATE TABLE IF NOT EXISTS polimi.portfolios (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#378ADD',
  description text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS polimi.projects (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  color        text NOT NULL DEFAULT '#378ADD',
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','archived')),
  status_label text NOT NULL DEFAULT 'on_track' CHECK (status_label IN ('on_track','at_risk','off_track')),
  portfolio_id text REFERENCES polimi.portfolios(id) ON DELETE SET NULL,
  description  text DEFAULT '',
  resources    jsonb DEFAULT '[]',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS polimi.project_members (
  project_id text NOT NULL REFERENCES polimi.projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS polimi.sections (
  id         text PRIMARY KEY,
  project_id text NOT NULL REFERENCES polimi.projects(id) ON DELETE CASCADE,
  name       text NOT NULL,
  position   int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS polimi.tasks (
  id           text PRIMARY KEY,
  project_id   text NOT NULL REFERENCES polimi.projects(id) ON DELETE CASCADE,
  section_id   text REFERENCES polimi.sections(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text DEFAULT '',
  assignee_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_name text DEFAULT '',
  priority     text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  start_date   date,
  due_date     date,
  done         boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS polimi.subtasks (
  id        text PRIMARY KEY,
  task_id   text NOT NULL REFERENCES polimi.tasks(id) ON DELETE CASCADE,
  title     text NOT NULL,
  done      boolean NOT NULL DEFAULT false,
  position  int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS polimi.comments (
  id         text PRIMARY KEY,
  task_id    text NOT NULL REFERENCES polimi.tasks(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text DEFAULT '',
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS for polimi schema
ALTER TABLE polimi.portfolios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE polimi.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE polimi.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE polimi.sections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE polimi.tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE polimi.subtasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE polimi.comments        ENABLE ROW LEVEL SECURITY;

-- Policy: org members can do everything
CREATE POLICY "polimi members full access" ON polimi.portfolios      FOR ALL USING (public.is_org_member('polimi'));
CREATE POLICY "polimi members full access" ON polimi.projects        FOR ALL USING (public.is_org_member('polimi'));
CREATE POLICY "polimi members full access" ON polimi.project_members FOR ALL USING (public.is_org_member('polimi'));
CREATE POLICY "polimi members full access" ON polimi.sections        FOR ALL USING (public.is_org_member('polimi'));
CREATE POLICY "polimi members full access" ON polimi.tasks           FOR ALL USING (public.is_org_member('polimi'));
CREATE POLICY "polimi members full access" ON polimi.subtasks        FOR ALL USING (public.is_org_member('polimi'));
CREATE POLICY "polimi members full access" ON polimi.comments        FOR ALL USING (public.is_org_member('polimi'));

-- ============================================================
-- SCHEMA: biomimx
-- ============================================================

CREATE TABLE IF NOT EXISTS biomimx.portfolios (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#D85A30',
  description text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomimx.projects (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  color        text NOT NULL DEFAULT '#D85A30',
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','archived')),
  status_label text NOT NULL DEFAULT 'on_track' CHECK (status_label IN ('on_track','at_risk','off_track')),
  portfolio_id text REFERENCES biomimx.portfolios(id) ON DELETE SET NULL,
  description  text DEFAULT '',
  resources    jsonb DEFAULT '[]',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomimx.project_members (
  project_id text NOT NULL REFERENCES biomimx.projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS biomimx.sections (
  id         text PRIMARY KEY,
  project_id text NOT NULL REFERENCES biomimx.projects(id) ON DELETE CASCADE,
  name       text NOT NULL,
  position   int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS biomimx.tasks (
  id            text PRIMARY KEY,
  project_id    text NOT NULL REFERENCES biomimx.projects(id) ON DELETE CASCADE,
  section_id    text REFERENCES biomimx.sections(id) ON DELETE SET NULL,
  title         text NOT NULL,
  description   text DEFAULT '',
  assignee_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_name text DEFAULT '',
  priority      text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  start_date    date,
  due_date      date,
  done          boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomimx.subtasks (
  id       text PRIMARY KEY,
  task_id  text NOT NULL REFERENCES biomimx.tasks(id) ON DELETE CASCADE,
  title    text NOT NULL,
  done     boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS biomimx.comments (
  id          text PRIMARY KEY,
  task_id     text NOT NULL REFERENCES biomimx.tasks(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text DEFAULT '',
  body        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- RLS for biomimx schema
ALTER TABLE biomimx.portfolios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomimx.projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomimx.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomimx.sections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomimx.tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomimx.subtasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE biomimx.comments        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biomimx members full access" ON biomimx.portfolios      FOR ALL USING (public.is_org_member('biomimx'));
CREATE POLICY "biomimx members full access" ON biomimx.projects        FOR ALL USING (public.is_org_member('biomimx'));
CREATE POLICY "biomimx members full access" ON biomimx.project_members FOR ALL USING (public.is_org_member('biomimx'));
CREATE POLICY "biomimx members full access" ON biomimx.sections        FOR ALL USING (public.is_org_member('biomimx'));
CREATE POLICY "biomimx members full access" ON biomimx.tasks           FOR ALL USING (public.is_org_member('biomimx'));
CREATE POLICY "biomimx members full access" ON biomimx.subtasks        FOR ALL USING (public.is_org_member('biomimx'));
CREATE POLICY "biomimx members full access" ON biomimx.comments        FOR ALL USING (public.is_org_member('biomimx'));

-- ── 5. Enable MFA (TOTP) ──────────────────────────────────────
-- Run this in Supabase Dashboard → Authentication → MFA
-- (cannot be set via SQL — must be enabled in the dashboard)
-- Authentication → Sign In / Up → Multi-Factor Authentication → Enable TOTP

-- ── 6. Realtime ───────────────────────────────────────────────
-- Enable realtime for live collaboration (optional, enable in dashboard)
-- Database → Replication → polimi.tasks, biomimx.tasks

-- ── 7. Seed first admin user ─────────────────────────────────
-- After first login via Microsoft OAuth, run:
-- INSERT INTO public.org_members (user_id, org_id, role)
-- VALUES ('<your-auth.uid()>', 'polimi', 'admin'),
--        ('<your-auth.uid()>', 'biomimx', 'admin');
