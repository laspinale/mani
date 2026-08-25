create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (task_id, name)
);

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.task_questions (
  id uuid primary key default gen_random_uuid(),
  related_task_id uuid references public.tasks(id) on delete set null,
  question_type text not null default 'question',
  priority text not null default 'Medium',
  question text not null,
  agent_name text,
  agent_emoji text,
  created_at timestamptz not null default now()
);
