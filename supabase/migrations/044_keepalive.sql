-- 044 — keepalive: evita la pausa automatica del free-tier Supabase
--
-- I progetti free-tier vanno in pausa dopo ~7 giorni senza attività.
-- Un GitHub Action schedulato (.github/workflows/keepalive.yml) esegue una
-- SELECT leggera su questa tabella per generare attività periodica sul DB.
--
-- La tabella contiene una sola riga, in sola lettura, senza dati sensibili:
-- anon può leggerla (serve solo a far girare una query reale sul database).

create table if not exists public.keepalive (
  id         smallint primary key default 1,
  last_ping  timestamptz not null default now(),
  constraint keepalive_singleton check (id = 1)
);

insert into public.keepalive (id) values (1)
  on conflict (id) do nothing;

alter table public.keepalive enable row level security;

drop policy if exists keepalive_anon_select on public.keepalive;
create policy keepalive_anon_select
  on public.keepalive
  for select
  using (true);

grant select on public.keepalive to anon, authenticated;
