-- ============================================================
-- TaskFlow — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Create schemas ──────────────────────────────────────────
create schema if not exists polimi;
create schema if not exists biomimx;

-- ── Helper: create all tables inside a given schema ─────────
-- We use a function-like approach by running the block twice.
-- Just execute this entire file once.

-- ============================================================
-- POLIMI SCHEMA
-- ============================================================

create table if not exists polimi.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'member', -- admin | member | guest
  color       text not null default '#378ADD',
  created_at  timestamptz default now()
);

create table if not exists polimi.portfolios (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#378ADD',
  description text,
  created_at  timestamptz default now()
);

create table if not exists polimi.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  color        text not null default '#378ADD',
  status       text not null default 'active',   -- active | on_hold | archived
  status_label text not null default 'on_track', -- on_track | at_risk | off_track
  portfolio_id uuid references polimi.portfolios(id) on delete set null,
  description  text,
  resources    jsonb default '[]',
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now()
);

create table if not exists polimi.project_members (
  project_id uuid references polimi.projects(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists polimi.sections (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references polimi.projects(id) on delete cascade,
  name       text not null,
  position   int  not null default 0
);

create table if not exists polimi.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references polimi.projects(id) on delete cascade,
  section_id  uuid references polimi.sections(id) on delete set null,
  title       text not null,
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  priority    text not null default 'medium', -- high | medium | low
  start_date  date,
  due_date    date,
  done        boolean not null default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists polimi.subtasks (
  id      uuid primary key default gen_random_uuid(),
  task_id uuid not null references polimi.tasks(id) on delete cascade,
  title   text not null,
  done    boolean not null default false,
  position int not null default 0
);

create table if not exists polimi.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references polimi.tasks(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body       text not null,
  created_at timestamptz default now()
);

-- ── updated_at trigger ───────────────────────────────────────
create or replace function polimi.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_updated_at
  before update on polimi.tasks
  for each row execute function polimi.set_updated_at();

-- ============================================================
-- BIOMIMX SCHEMA (identical structure, different namespace)
-- ============================================================

create table if not exists biomimx.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'member',
  color       text not null default '#D85A30',
  created_at  timestamptz default now()
);

create table if not exists biomimx.portfolios (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#D85A30',
  description text,
  created_at  timestamptz default now()
);

create table if not exists biomimx.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  color        text not null default '#D85A30',
  status       text not null default 'active',
  status_label text not null default 'on_track',
  portfolio_id uuid references biomimx.portfolios(id) on delete set null,
  description  text,
  resources    jsonb default '[]',
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now()
);

create table if not exists biomimx.project_members (
  project_id uuid references biomimx.projects(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  primary key (project_id, user_id)
);

create table if not exists biomimx.sections (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references biomimx.projects(id) on delete cascade,
  name       text not null,
  position   int  not null default 0
);

create table if not exists biomimx.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references biomimx.projects(id) on delete cascade,
  section_id  uuid references biomimx.sections(id) on delete set null,
  title       text not null,
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  priority    text not null default 'medium',
  start_date  date,
  due_date    date,
  done        boolean not null default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists biomimx.subtasks (
  id      uuid primary key default gen_random_uuid(),
  task_id uuid not null references biomimx.tasks(id) on delete cascade,
  title   text not null,
  done    boolean not null default false,
  position int not null default 0
);

create table if not exists biomimx.comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references biomimx.tasks(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body       text not null,
  created_at timestamptz default now()
);

create or replace function biomimx.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_updated_at
  before update on biomimx.tasks
  for each row execute function biomimx.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
do $$ declare
  s text; t text;
begin
  foreach s in array array['polimi','biomimx'] loop
    foreach t in array array['profiles','portfolios','projects','project_members','sections','tasks','subtasks','comments'] loop
      execute format('alter table %I.%I enable row level security', s, t);
    end loop;
  end loop;
end $$;

-- ── Polimi RLS policies ──────────────────────────────────────

-- Profiles: users can read all, update own
create policy "polimi: read profiles"
  on polimi.profiles for select
  to authenticated using (true);

create policy "polimi: insert own profile"
  on polimi.profiles for insert
  to authenticated with check (id = auth.uid());

create policy "polimi: update own profile"
  on polimi.profiles for update
  to authenticated using (id = auth.uid());

-- Projects: members of the project can read; creators can write
create policy "polimi: read projects"
  on polimi.projects for select
  to authenticated using (
    exists (select 1 from polimi.project_members pm where pm.project_id = id and pm.user_id = auth.uid())
    or created_by = auth.uid()
  );

create policy "polimi: insert projects"
  on polimi.projects for insert
  to authenticated with check (created_by = auth.uid());

create policy "polimi: update projects"
  on polimi.projects for update
  to authenticated using (created_by = auth.uid());

-- Project members
create policy "polimi: read members"
  on polimi.project_members for select
  to authenticated using (true);

create policy "polimi: manage members"
  on polimi.project_members for all
  to authenticated using (
    exists (select 1 from polimi.projects p where p.id = project_id and p.created_by = auth.uid())
  );

-- Sections, tasks, subtasks, comments: inherit from project membership
create policy "polimi: read sections"
  on polimi.sections for select
  to authenticated using (
    exists (select 1 from polimi.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
  );

create policy "polimi: write sections"
  on polimi.sections for all
  to authenticated using (
    exists (select 1 from polimi.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
  );

create policy "polimi: read tasks"
  on polimi.tasks for select
  to authenticated using (
    exists (select 1 from polimi.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
  );

create policy "polimi: write tasks"
  on polimi.tasks for all
  to authenticated using (
    exists (select 1 from polimi.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
  );

create policy "polimi: read subtasks"
  on polimi.subtasks for select
  to authenticated using (
    exists (
      select 1 from polimi.tasks tk
      join polimi.project_members pm on pm.project_id = tk.project_id
      where tk.id = task_id and pm.user_id = auth.uid()
    )
  );

create policy "polimi: write subtasks"
  on polimi.subtasks for all
  to authenticated using (
    exists (
      select 1 from polimi.tasks tk
      join polimi.project_members pm on pm.project_id = tk.project_id
      where tk.id = task_id and pm.user_id = auth.uid()
    )
  );

create policy "polimi: read comments"
  on polimi.comments for select
  to authenticated using (
    exists (
      select 1 from polimi.tasks tk
      join polimi.project_members pm on pm.project_id = tk.project_id
      where tk.id = task_id and pm.user_id = auth.uid()
    )
  );

create policy "polimi: write comments"
  on polimi.comments for all
  to authenticated using (
    exists (
      select 1 from polimi.tasks tk
      join polimi.project_members pm on pm.project_id = tk.project_id
      where tk.id = task_id and pm.user_id = auth.uid()
    )
  );

create policy "polimi: read portfolios"
  on polimi.portfolios for select
  to authenticated using (true);

create policy "polimi: write portfolios"
  on polimi.portfolios for all
  to authenticated using (true);

-- ── BiomimX RLS policies (same structure) ───────────────────

create policy "biomimx: read profiles"
  on biomimx.profiles for select
  to authenticated using (true);

create policy "biomimx: insert own profile"
  on biomimx.profiles for insert
  to authenticated with check (id = auth.uid());

create policy "biomimx: update own profile"
  on biomimx.profiles for update
  to authenticated using (id = auth.uid());

create policy "biomimx: read projects"
  on biomimx.projects for select
  to authenticated using (
    exists (select 1 from biomimx.project_members pm where pm.project_id = id and pm.user_id = auth.uid())
    or created_by = auth.uid()
  );

create policy "biomimx: insert projects"
  on biomimx.projects for insert
  to authenticated with check (created_by = auth.uid());

create policy "biomimx: update projects"
  on biomimx.projects for update
  to authenticated using (created_by = auth.uid());

create policy "biomimx: read members"
  on biomimx.project_members for select
  to authenticated using (true);

create policy "biomimx: manage members"
  on biomimx.project_members for all
  to authenticated using (
    exists (select 1 from biomimx.projects p where p.id = project_id and p.created_by = auth.uid())
  );

create policy "biomimx: read sections"
  on biomimx.sections for select
  to authenticated using (
    exists (select 1 from biomimx.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
  );

create policy "biomimx: write sections"
  on biomimx.sections for all
  to authenticated using (
    exists (select 1 from biomimx.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
  );

create policy "biomimx: read tasks"
  on biomimx.tasks for select
  to authenticated using (
    exists (select 1 from biomimx.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
  );

create policy "biomimx: write tasks"
  on biomimx.tasks for all
  to authenticated using (
    exists (select 1 from biomimx.project_members pm where pm.project_id = project_id and pm.user_id = auth.uid())
  );

create policy "biomimx: read subtasks"
  on biomimx.subtasks for select
  to authenticated using (
    exists (
      select 1 from biomimx.tasks tk
      join biomimx.project_members pm on pm.project_id = tk.project_id
      where tk.id = task_id and pm.user_id = auth.uid()
    )
  );

create policy "biomimx: write subtasks"
  on biomimx.subtasks for all
  to authenticated using (
    exists (
      select 1 from biomimx.tasks tk
      join biomimx.project_members pm on pm.project_id = tk.project_id
      where tk.id = task_id and pm.user_id = auth.uid()
    )
  );

create policy "biomimx: read comments"
  on biomimx.comments for select
  to authenticated using (
    exists (
      select 1 from biomimx.tasks tk
      join biomimx.project_members pm on pm.project_id = tk.project_id
      where tk.id = task_id and pm.user_id = auth.uid()
    )
  );

create policy "biomimx: write comments"
  on biomimx.comments for all
  to authenticated using (
    exists (
      select 1 from biomimx.tasks tk
      join biomimx.project_members pm on pm.project_id = tk.project_id
      where tk.id = task_id and pm.user_id = auth.uid()
    )
  );

create policy "biomimx: read portfolios"
  on biomimx.portfolios for select
  to authenticated using (true);

create policy "biomimx: write portfolios"
  on biomimx.portfolios for all
  to authenticated using (true);

-- ============================================================
-- ORG MEMBERSHIP TABLE (public schema)
-- Maps auth.users → which orgs they belong to
-- ============================================================

create table if not exists public.org_memberships (
  user_id    uuid references auth.users(id) on delete cascade,
  org_id     text not null, -- 'polimi' | 'biomimx'
  role       text not null default 'member',
  created_at timestamptz default now(),
  primary key (user_id, org_id)
);

alter table public.org_memberships enable row level security;

create policy "read own memberships"
  on public.org_memberships for select
  to authenticated using (user_id = auth.uid());

create policy "insert own memberships"
  on public.org_memberships for insert
  to authenticated with check (user_id = auth.uid());

-- ============================================================
-- AUTO-PROVISION: create profile + membership on first login
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  user_name  text;
  user_email text;
  user_org   text;
begin
  user_email := new.email;
  user_name  := coalesce(new.raw_user_meta_data->>'full_name', split_part(user_email, '@', 1));

  -- Determine org from email domain
  if user_email like '%@polimi.it' or user_email like '%@mail.polimi.it' then
    user_org := 'polimi';
  elsif user_email like '%@biomimx.com' then
    user_org := 'biomimx';
  else
    -- External / guest users: default to biomimx (invited externally)
    user_org := 'biomimx';
  end if;

  -- Create profile in the right schema
  if user_org = 'polimi' then
    insert into polimi.profiles (id, name, email, role)
    values (new.id, user_name, user_email, 'member')
    on conflict (id) do nothing;
  else
    insert into biomimx.profiles (id, name, email, role)
    values (new.id, user_name, user_email, 'member')
    on conflict (id) do nothing;
  end if;

  -- Record org membership
  insert into public.org_memberships (user_id, org_id)
  values (new.id, user_org)
  on conflict do nothing;

  -- Marco belongs to both orgs (identified by email)
  if user_email like '%@polimi.it' then
    -- Also add to biomimx if they're a guest member
    -- (add more emails here as needed)
    if user_email = 'marco.rasponi@polimi.it' then
      insert into biomimx.profiles (id, name, email, role)
      values (new.id, user_name, user_email, 'admin')
      on conflict (id) do nothing;

      insert into public.org_memberships (user_id, org_id, role)
      values (new.id, 'biomimx', 'admin')
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- Trigger: fires after each new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
