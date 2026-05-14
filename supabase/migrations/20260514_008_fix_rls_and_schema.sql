-- ═══════════════════════════════════════════════════════════
-- FIX COMPLETO: RLS write policies + Gantt columns + membres
-- Aplicar en Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════
-- 1. WRITE POLICIES (las que faltaban desde el inicio)
-- ══════════════════════════════════════════════════════════

-- areas
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'areas' and policyname = 'public write areas') then
    execute 'create policy "public write areas" on areas for all using (true) with check (true)';
  end if;
end $$;

-- projects
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'projects' and policyname = 'public write projects') then
    execute 'create policy "public write projects" on projects for all using (true) with check (true)';
  end if;
end $$;

-- members
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'members' and policyname = 'public write members') then
    execute 'create policy "public write members" on members for all using (true) with check (true)';
  end if;
end $$;

-- tasks (recrear con WITH CHECK si solo tiene USING)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'public write tasks') then
    execute 'create policy "public write tasks" on tasks for all using (true) with check (true)';
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- 2. COLUMNAS GANTT (idempotent)
-- ══════════════════════════════════════════════════════════

alter table tasks
  add column if not exists end_date     text,
  add column if not exists progress     integer not null default 0,
  add column if not exists is_milestone boolean not null default false,
  add column if not exists sort_order   integer not null default 0;

-- constraint de progress (idempotent)
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'tasks' and constraint_name = 'tasks_progress_check'
  ) then
    alter table tasks add constraint tasks_progress_check check (progress between 0 and 100);
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- 3. TABLA task_dependencies (idempotent)
-- ══════════════════════════════════════════════════════════

create table if not exists task_dependencies (
  id             text primary key default gen_random_uuid()::text,
  project_id     text not null references projects(id) on delete cascade,
  predecessor_id text not null references tasks(id)    on delete cascade,
  successor_id   text not null references tasks(id)    on delete cascade,
  type           text not null default 'finish_to_start'
    check (type in ('finish_to_start', 'start_to_start', 'finish_to_finish')),
  created_at     timestamptz not null default now(),
  unique(predecessor_id, successor_id)
);

alter table task_dependencies enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'task_dependencies' and policyname = 'public read task_dependencies') then
    execute 'create policy "public read task_dependencies" on task_dependencies for select using (true)';
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'task_dependencies' and policyname = 'public write task_dependencies') then
    execute 'create policy "public write task_dependencies" on task_dependencies for all using (true) with check (true)';
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- 4. FUNCIONES RPC (recrear idempotente)
-- ══════════════════════════════════════════════════════════

create or replace function increment_project_count(pid text)
returns void language plpgsql security definer as $$
begin
  update projects set count = count + 1 where id = pid;
end;
$$;

create or replace function increment_task_comments(tid text)
returns void language plpgsql security definer as $$
begin
  update tasks set comments = comments + 1 where id = tid;
end;
$$;

-- ══════════════════════════════════════════════════════════
-- 5. MIEMBROS — garantizar que todos los IDs usados en la app
--    existen en la tabla members (sin borrar ninguno)
-- ══════════════════════════════════════════════════════════

insert into members (id, name, role, short) values
  ('joa', 'Joaquin Abastoflor',   'Jefe de Proyectos',           'Joaquin A.'),
  ('fab', 'Fabio Jimenez',        'Coordinador Administrativo',  'Fabio J.'),
  ('mar', 'Marcelo Jaldin',       'Director de Finanzas',        'Marcelo J.'),
  ('and', 'Andrea Mendoza',       'Coordinadora',                'AM'),
  ('car', 'Carlos Rojas',         'Técnico',                     'CR'),
  ('sof', 'Sofía Vargas',         'Logística',                   'SV'),
  ('die', 'Diego Aguilera',       'Mantenimiento',               'DA')
on conflict (id) do update set
  name  = excluded.name,
  role  = excluded.role,
  short = excluded.short;

-- ══════════════════════════════════════════════════════════
-- 6. VERIFICACIÓN — muestra el estado actual de políticas
-- ══════════════════════════════════════════════════════════

select tablename, policyname, cmd
from pg_policies
where tablename in ('areas','projects','tasks','members','task_dependencies')
order by tablename, cmd;
