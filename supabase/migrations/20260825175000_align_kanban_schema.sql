create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.board_columns (name, color, position)
values
  ('To Do', '#ef4444', 1),
  ('Doing', '#f59e0b', 2),
  ('Needs Input', '#8b5cf6', 3),
  ('Done', '#10b981', 4),
  ('Canceled', '#6b7280', 5)
on conflict (name) do nothing;

alter table public.tasks
  add column if not exists board_column_id uuid references public.board_columns(id) on delete set null,
  add column if not exists due_date date,
  add column if not exists position integer,
  add column if not exists created_by_bujji boolean not null default false;

update public.tasks t
set board_column_id = bc.id
from public.board_columns bc
where t.board_column_id is null
  and (
    (t.status = 'todo' and bc.name = 'To Do') or
    (t.status = 'doing' and bc.name = 'Doing') or
    (t.status = 'needsInput' and bc.name = 'Needs Input') or
    (t.status = 'done' and bc.name = 'Done') or
    (t.status = 'canceled' and bc.name = 'Canceled')
  );

update public.tasks
set position = sort_order
where position is null;

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.subtasks (id, task_id, title, completed, created_at)
select id, task_id, title, completed, created_at
from public.task_subtasks
on conflict (id) do nothing;

create table if not exists public.task_assignees_v2 (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (task_id, display_name)
);

insert into public.task_assignees_v2 (task_id, display_name, created_at)
select task_id, name, created_at
from public.task_assignees
on conflict (task_id, display_name) do nothing;

alter table public.board_columns enable row level security;
alter table public.subtasks enable row level security;
alter table public.task_assignees_v2 enable row level security;

drop policy if exists "anon can select board_columns" on public.board_columns;
create policy "anon can select board_columns"
  on public.board_columns
  for select
  to anon
  using (true);

drop policy if exists "anon can select subtasks" on public.subtasks;
create policy "anon can select subtasks"
  on public.subtasks
  for select
  to anon
  using (true);

drop policy if exists "anon can select task_assignees_v2" on public.task_assignees_v2;
create policy "anon can select task_assignees_v2"
  on public.task_assignees_v2
  for select
  to anon
  using (true);
