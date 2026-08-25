create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  agent text not null,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null check (status in ('todo', 'doing', 'needsInput', 'done')),
  progress integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks (status, sort_order);

alter table public.tasks enable row level security;

drop policy if exists "anon can select tasks" on public.tasks;
create policy "anon can select tasks"
  on public.tasks
  for select
  to anon
  using (true);

drop policy if exists "anon can update tasks" on public.tasks;
create policy "anon can update tasks"
  on public.tasks
  for update
  to anon
  using (true)
  with check (true);

insert into public.tasks (title, agent, priority, status, progress, sort_order)
values
  ('Draft onboarding checklist', '📋', 'medium', 'todo', null, 1),
  ('Audit security logging', '🛡️', 'high', 'todo', null, 2),
  ('Create release summary', '🤖', 'low', 'todo', null, 3),
  ('Refactor task assignment flow', '🤖', 'urgent', 'doing', 72, 1),
  ('Sync council transcript', '📋', 'medium', 'doing', 44, 2),
  ('Clarify KPI target for Q3', '📋', 'high', 'needsInput', null, 1),
  ('Approve policy exception', '🛡️', 'urgent', 'needsInput', null, 2),
  ('Ship dashboard metrics', '🤖', 'low', 'done', null, 1),
  ('Summarize last meetings', '🛡️', 'medium', 'done', null, 2),
  ('Rebalance task queue', '📋', 'medium', 'done', null, 3)
on conflict do nothing;
