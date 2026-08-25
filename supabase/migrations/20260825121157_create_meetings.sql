create extension if not exists pgcrypto;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  type text default 'meeting',
  title text not null,
  date timestamptz not null,
  duration_minutes integer not null default 0,
  duration_display text,
  attendees jsonb not null default '[]'::jsonb,
  summary text default '',
  action_items jsonb not null default '[]'::jsonb,
  ai_insights text default '',
  meeting_type text not null,
  sentiment text default 'neutral',
  has_external_participants boolean not null default false,
  external_domains jsonb not null default '[]'::jsonb,
  fathom_url text,
  share_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meetings_date_idx on public.meetings (date desc);
create index if not exists meetings_meeting_type_idx on public.meetings (meeting_type);
create index if not exists meetings_external_idx on public.meetings (has_external_participants);
