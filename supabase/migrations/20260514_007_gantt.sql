-- ═══════════════════════════════════════════════════════════
-- Gantt profesional — columnas adicionales en tasks +
-- tabla task_dependencies
-- ═══════════════════════════════════════════════════════════

-- ── Extender tasks ────────────────────────────────────────
alter table tasks
  add column if not exists end_date    text,
  add column if not exists progress    integer not null default 0
    check (progress between 0 and 100),
  add column if not exists is_milestone boolean not null default false,
  add column if not exists sort_order   integer not null default 0;

-- ── Dependencias entre tareas ─────────────────────────────
create table if not exists task_dependencies (
  id             text primary key default gen_random_uuid()::text,
  project_id     text not null references projects(id) on delete cascade,
  predecessor_id text not null references tasks(id) on delete cascade,
  successor_id   text not null references tasks(id) on delete cascade,
  type           text not null default 'finish_to_start'
    check (type in ('finish_to_start', 'start_to_start', 'finish_to_finish')),
  created_at     timestamptz not null default now(),
  unique(predecessor_id, successor_id)
);

-- ── RLS ───────────────────────────────────────────────────
alter table task_dependencies enable row level security;

create policy "public read task_dependencies"  on task_dependencies for select using (true);
create policy "public write task_dependencies" on task_dependencies for all    using (true);
