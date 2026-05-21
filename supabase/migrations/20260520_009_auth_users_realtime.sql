-- ═══════════════════════════════════════════════════════════
-- FASE 1: Supabase Auth real + permisos por usuario + realtime
-- Aplicar en Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════
-- 1. TABLA app_users (perfil público, ligado a auth.users)
-- ══════════════════════════════════════════════════════════

create table if not exists app_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null default 'Miembro',
  short      text not null default '',
  email      text not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app_users enable row level security;

-- Todos pueden ver perfiles (para asignaciones, avatares)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_users' and policyname = 'app_users select all') then
    execute 'create policy "app_users select all" on app_users for select using (true)';
  end if;
end $$;

-- Cada usuario puede editar su propio perfil; admins pueden editar cualquiera
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_users' and policyname = 'app_users update own') then
    execute $pol$
      create policy "app_users update own" on app_users for update
      using (
        auth.uid() = id
        or exists (select 1 from app_users au where au.id = auth.uid() and au.is_admin = true)
      )
    $pol$;
  end if;
end $$;

-- Solo admins pueden insertar/eliminar usuarios
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'app_users' and policyname = 'app_users admin write') then
    execute $pol$
      create policy "app_users admin write" on app_users for insert
      with check (
        exists (select 1 from app_users au where au.id = auth.uid() and au.is_admin = true)
      )
    $pol$;
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- 2. TABLA user_area_access (qué áreas puede ver cada usuario)
-- ══════════════════════════════════════════════════════════

create table if not exists user_area_access (
  id      bigserial primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  area_id text not null references areas(id) on delete cascade,
  unique(user_id, area_id)
);

alter table user_area_access enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_area_access' and policyname = 'user_area_access select') then
    execute 'create policy "user_area_access select" on user_area_access for select using (true)';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_area_access' and policyname = 'user_area_access admin write') then
    execute $pol$
      create policy "user_area_access admin write" on user_area_access for all
      using (
        exists (select 1 from app_users au where au.id = auth.uid() and au.is_admin = true)
      )
      with check (
        exists (select 1 from app_users au where au.id = auth.uid() and au.is_admin = true)
      )
    $pol$;
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- 3. TABLA user_project_access (override por proyecto)
-- ══════════════════════════════════════════════════════════

create table if not exists user_project_access (
  id         bigserial primary key,
  user_id    uuid not null references app_users(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  unique(user_id, project_id)
);

alter table user_project_access enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_project_access' and policyname = 'user_project_access select') then
    execute 'create policy "user_project_access select" on user_project_access for select using (true)';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_project_access' and policyname = 'user_project_access admin write') then
    execute $pol$
      create policy "user_project_access admin write" on user_project_access for all
      using (
        exists (select 1 from app_users au where au.id = auth.uid() and au.is_admin = true)
      )
      with check (
        exists (select 1 from app_users au where au.id = auth.uid() and au.is_admin = true)
      )
    $pol$;
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- 4. TABLA task_events (historial de cambios en tareas)
-- ══════════════════════════════════════════════════════════

create table if not exists task_events (
  id         text primary key default gen_random_uuid()::text,
  task_id    text not null references tasks(id) on delete cascade,
  user_id    text not null,
  event_type text not null check (event_type in ('overdue_flagged','date_changed','status_changed','comment','reschedule')),
  old_value  jsonb,
  new_value  jsonb,
  reason     text,
  created_at timestamptz not null default now()
);

alter table task_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'task_events' and policyname = 'task_events select') then
    execute 'create policy "task_events select" on task_events for select using (true)';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'task_events' and policyname = 'task_events insert') then
    execute 'create policy "task_events insert" on task_events for insert with check (true)';
  end if;
end $$;

-- ══════════════════════════════════════════════════════════
-- 5. COLUMNA phase en tasks (para agrupación en Gantt)
-- ══════════════════════════════════════════════════════════

alter table tasks add column if not exists phase text;

-- ══════════════════════════════════════════════════════════
-- 6. HABILITAR REALTIME en las tablas clave
-- ══════════════════════════════════════════════════════════

-- Supabase requiere agregar tablas a la publicación realtime
do $$ begin
  begin
    alter publication supabase_realtime add table tasks;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table projects;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table areas;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table subtasks;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table comments;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table task_dependencies;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table task_events;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table event_checklists;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table checklist_items;
  exception when others then null; end;
end $$;

-- ══════════════════════════════════════════════════════════
-- 7. FUNCIÓN auxiliar: saber si el usuario actual es admin
-- ══════════════════════════════════════════════════════════

create or replace function is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (select is_admin from app_users where id = auth.uid()),
    false
  )
$$;

-- ══════════════════════════════════════════════════════════
-- 8. VERIFICACIÓN
-- ══════════════════════════════════════════════════════════

select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('app_users','user_area_access','user_project_access','task_events')
order by table_name;
