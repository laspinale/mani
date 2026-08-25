create table if not exists public.humans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text,
  platform_key text unique,
  can_self_register boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.humans (name)
values ('Alessandra')
on conflict (name) do nothing;

insert into public.agents (name, emoji, platform_key, can_self_register)
values ('Steve', '⚙️', 'steve', true)
on conflict (name) do nothing;

alter table public.humans enable row level security;
alter table public.agents enable row level security;

drop policy if exists "anon can select humans" on public.humans;
create policy "anon can select humans"
  on public.humans
  for select
  to anon
  using (true);

drop policy if exists "anon can insert humans" on public.humans;
create policy "anon can insert humans"
  on public.humans
  for insert
  to anon
  with check (true);

drop policy if exists "anon can select agents" on public.agents;
create policy "anon can select agents"
  on public.agents
  for select
  to anon
  using (true);

drop policy if exists "anon can insert agents" on public.agents;
create policy "anon can insert agents"
  on public.agents
  for insert
  to anon
  with check (true);
