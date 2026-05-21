-- ═══════════════════════════════════════════════════════════
-- FASE 10: Sub-áreas (Area → Subarea → Project → Task)
-- Aplicar en Supabase Dashboard → SQL Editor → Run
-- Idempotente: seguro re-ejecutar.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Enum subarea_type ──────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'subarea_type') then
    create type subarea_type as enum ('general','comercial','tecnico','otros');
  end if;
end $$;

-- ── 2. Tabla subareas ─────────────────────────────────────
create table if not exists subareas (
  id          text primary key,
  name        text not null,
  area        text not null references areas(id) on delete cascade,
  color       text not null,
  icon        text not null,
  slug        text not null unique,
  type        subarea_type not null default 'general',
  description text,
  created_at  timestamptz not null default now()
);

alter table subareas enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'subareas' and policyname = 'public read subareas') then
    execute 'create policy "public read subareas" on subareas for select using (true)';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'subareas' and policyname = 'public write subareas') then
    execute 'create policy "public write subareas" on subareas for all using (true) with check (true)';
  end if;
end $$;

-- ── 3. Columna projects.subarea (nullable inicialmente) ───
alter table projects add column if not exists subarea text references subareas(id);

-- ── 4. Backfill: una sub-área "Generales" por cada área existente ─
insert into subareas (id, name, area, color, icon, slug, type, description)
select
  'sub-' || a.id || '-generales' as id,
  'Generales'                    as name,
  a.id                           as area,
  a.color                        as color,
  'Layers'                       as icon,
  'sub-' || a.id || '-generales' as slug,
  'general'::subarea_type        as type,
  'Sub-área general autogenerada' as description
from areas a
on conflict (id) do nothing;

-- ── 5. Asignar todos los proyectos existentes a la sub-área "Generales" de su área
update projects p
   set subarea = 'sub-' || p.area || '-generales'
 where p.subarea is null;

-- ── 6. Hacer la columna NOT NULL después del backfill ────
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'projects' and column_name = 'subarea' and is_nullable = 'YES'
  ) then
    -- Verificar primero que no haya nulos
    if not exists (select 1 from projects where subarea is null) then
      execute 'alter table projects alter column subarea set not null';
    end if;
  end if;
end $$;

-- ── 7. Habilitar realtime para subareas ──────────────────
do $$ begin
  begin
    alter publication supabase_realtime add table subareas;
  exception when others then null; end;
end $$;

-- ── 8. Verificación ──────────────────────────────────────
select
  (select count(*) from subareas)                            as total_subareas,
  (select count(*) from projects where subarea is not null)  as projects_with_subarea,
  (select count(*) from projects where subarea is null)      as projects_without_subarea;
