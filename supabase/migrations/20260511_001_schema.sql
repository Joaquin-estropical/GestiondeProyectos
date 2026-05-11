-- ═══════════════════════════════════════════════════════════
-- Operaciones Tropical — Schema
-- ═══════════════════════════════════════════════════════════

-- ── Tipos enumerados ──────────────────────────────────────
create type task_status   as enum ('pend','curso','rev','block','done');
create type task_priority as enum ('urg','alta','med','baja');

-- ── Areas ─────────────────────────────────────────────────
create table areas (
  id      text primary key,
  name    text not null,
  color   text not null,
  icon    text not null,
  slug    text not null unique
);

-- ── Members ───────────────────────────────────────────────
create table members (
  id    text primary key,
  name  text not null,
  role  text not null,
  short text not null
);

-- ── Projects ──────────────────────────────────────────────
create table projects (
  id       text primary key,
  name     text not null,
  area     text not null references areas(id),
  due      text not null,
  progress integer not null default 0,
  count    integer not null default 0
);

-- ── Tasks ─────────────────────────────────────────────────
create table tasks (
  id             text primary key,
  code           text not null unique,
  title          text not null,
  project        text not null references projects(id),
  area           text not null references areas(id),
  assignee       text not null references members(id),
  due            text not null,
  priority       task_priority not null default 'med',
  status         task_status   not null default 'pend',
  time           text not null default '0h',
  comments       integer not null default 0,
  subtasks_done  integer not null default 0,
  subtasks_total integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ── Row Level Security (lectura pública por ahora) ────────
alter table areas    enable row level security;
alter table members  enable row level security;
alter table projects enable row level security;
alter table tasks    enable row level security;

create policy "public read areas"    on areas    for select using (true);
create policy "public read members"  on members  for select using (true);
create policy "public read projects" on projects for select using (true);
create policy "public read tasks"    on tasks    for select using (true);

create policy "public write tasks"   on tasks    for all    using (true);
