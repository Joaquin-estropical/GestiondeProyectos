-- ================================================================
-- MÓDULO PLANILLAS v2: Recepción y entrega de locales
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Idempotente: se puede ejecutar múltiples veces sin error
-- ================================================================

-- 1. PLANTILLAS REUTILIZABLES
create table if not exists checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  kind        text not null default 'custom'
              check (kind in ('event_delivery', 'branch_delivery', 'local_return', 'custom')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Agregar columna kind si la tabla ya existe sin ella
alter table checklist_templates
  add column if not exists kind text not null default 'custom'
  check (kind in ('event_delivery', 'branch_delivery', 'local_return', 'custom'));

-- 2. ÍTEMS DE PLANTILLA
create table if not exists template_items (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid references checklist_templates(id) on delete cascade,
  name         text not null,
  category     text not null,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

-- 3. PLANILLAS POR EVENTO / ÁREA (recepción o entrega)
create table if not exists event_checklists (
  id                   uuid primary key default gen_random_uuid(),
  event_id             text not null,
  type                 text not null check (type in ('reception', 'delivery')),
  status               text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  template_id          uuid references checklist_templates(id),
  title                text,
  assigned_to_project  text,
  assigned_to_area     text,
  completed_at         timestamptz,
  created_at           timestamptz default now()
);

-- Agregar columnas nuevas si la tabla ya existe sin ellas
alter table event_checklists add column if not exists title               text;
alter table event_checklists add column if not exists assigned_to_project text;
alter table event_checklists add column if not exists assigned_to_area    text;

-- 4. ÍTEMS DE PLANILLA
create table if not exists checklist_items (
  id             uuid primary key default gen_random_uuid(),
  checklist_id   uuid references event_checklists(id) on delete cascade,
  name           text not null,
  category       text not null,
  qty            integer,
  condition_in   text check (condition_in in ('good', 'fair', 'poor')),
  condition_out  text check (condition_out in ('good', 'fair', 'poor')),
  notes          text,
  photos         text[] default '{}',
  sort_order     integer default 0,
  created_at     timestamptz default now()
);

-- ── Índices ────────────────────────────────────────────────
create index if not exists idx_template_items_template_id on template_items(template_id);
create index if not exists idx_event_checklists_event_id  on event_checklists(event_id);
create index if not exists idx_checklist_items_checklist  on checklist_items(checklist_id);

-- ── RLS permisivo (igual que el resto de la app) ───────────
alter table checklist_templates enable row level security;
alter table template_items      enable row level security;
alter table event_checklists    enable row level security;
alter table checklist_items     enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'checklist_templates' and policyname = 'allow_all_templates') then
    create policy "allow_all_templates"  on checklist_templates for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'template_items' and policyname = 'allow_all_tmpl_items') then
    create policy "allow_all_tmpl_items" on template_items      for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'event_checklists' and policyname = 'allow_all_checklists') then
    create policy "allow_all_checklists" on event_checklists    for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'checklist_items' and policyname = 'allow_all_cl_items') then
    create policy "allow_all_cl_items"   on checklist_items     for all using (true) with check (true);
  end if;
end $$;

-- ── Storage bucket para fotos ──────────────────────────────
insert into storage.buckets (id, name, public)
  values ('event-photos', 'event-photos', true)
  on conflict (id) do nothing;

-- ── SEED: Actualizar kind de plantilla existente ───────────
update checklist_templates
set kind = 'event_delivery'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- ── SEED: Plantilla "Entrega de local (eventos)" ──────────
insert into checklist_templates (id, name, description, kind)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Plantilla general de eventos',
  'Plantilla base para eventos comerciales de mediana y gran escala. Editable.',
  'event_delivery'
) on conflict (id) do nothing;

insert into template_items (template_id, name, category, sort_order) values
  -- Mobiliario
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Sillas',                                                          'Mobiliario',        1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mesas redondas',                                                  'Mobiliario',        2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mesas rectangulares',                                             'Mobiliario',        3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mesas altas / cocteleras',                                        'Mobiliario',        4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Muebles de lounge (sofás, sillones, puffs)',                      'Mobiliario',        5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Atril / podio',                                                   'Mobiliario',        6),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Percheros',                                                       'Mobiliario',        7),
  -- Telas y textiles
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Manteles',                                                        'Telas y textiles',  1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Caminos de mesa',                                                 'Telas y textiles',  2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Servilletas de tela',                                             'Telas y textiles',  3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Lazos / cintas para sillas',                                      'Telas y textiles',  4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Fundas de silla',                                                 'Telas y textiles',  5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Telas de fondo / backdrop',                                       'Telas y textiles',  6),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Cortinas',                                                        'Telas y textiles',  7),
  -- Decoración
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Elementos decorativos de mesa (centros, candelabros, jarrones)',  'Decoración',        1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Espejos y cuadros',                                               'Decoración',        2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Estructuras decorativas (arcos, columnas, marcos)',               'Decoración',        3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Alfombras',                                                       'Decoración',        4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Plantas / vegetación decorativa',                                 'Decoración',        5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Señalética y cartelería del local',                               'Decoración',        6),
  -- Iluminación
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Iluminación general (funcionamiento)',                             'Iluminación',       1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Iluminación ambiental / decorativa',                              'Iluminación',       2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Iluminación de escena / reflectores',                             'Iluminación',       3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Extensiones y cables de poder',                                   'Iluminación',       4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Tablero eléctrico / breakers',                                    'Iluminación',       5),
  -- Audiovisual
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Sistema de sonido',                                               'Audiovisual',       1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Micrófonos',                                                      'Audiovisual',       2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Pantallas / proyector',                                           'Audiovisual',       3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Cables y conectores',                                             'Audiovisual',       4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Conectividad (WiFi / red)',                                       'Audiovisual',       5),
  -- Instalaciones
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Pisos (estado general)',                                          'Instalaciones',     1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Paredes y pintura (estado general)',                              'Instalaciones',     2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Puertas y ventanas (funcionamiento)',                             'Instalaciones',     3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Baños (limpieza y funcionamiento)',                               'Instalaciones',     4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Cocina / área de servicio',                                      'Instalaciones',     5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Climatización (A/C o calefacción)',                               'Instalaciones',     6),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Extintores y señalética de emergencia',                           'Instalaciones',     7),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Áreas exteriores / terraza',                                     'Instalaciones',     8),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Llaves y controles de acceso',                                    'Instalaciones',     9)
on conflict do nothing;
