-- ================================================================
-- MÓDULO PLANILLAS: Recepción y entrega de locales
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. PLANTILLAS REUTILIZABLES
create table if not exists checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. ÍTEMS DE PLANTILLA
create table if not exists template_items (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid references checklist_templates(id) on delete cascade,
  name         text not null,
  category     text,
  default_qty  integer default 1,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

-- 3. PLANILLAS POR EVENTO (recepción o entrega)
create table if not exists event_checklists (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null,   -- ID libre (proyecto u otro identificador)
  type         text not null check (type in ('reception', 'delivery')),
  status       text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  template_id  uuid references checklist_templates(id),
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- 4. ÍTEMS DE PLANILLA (el corazón del sistema)
create table if not exists checklist_items (
  id             uuid primary key default gen_random_uuid(),
  checklist_id   uuid references event_checklists(id) on delete cascade,
  name           text not null,
  category       text,
  qty            integer default 1,
  condition_in   text check (condition_in in ('good', 'fair', 'poor')),
  condition_out  text check (condition_out in ('good', 'fair', 'poor')),
  notes          text,
  photos         text[] default '{}',
  sort_order     integer default 0,
  created_at     timestamptz default now()
);

-- ── Índices para consultas frecuentes ──────────────────────
create index if not exists idx_template_items_template_id
  on template_items(template_id);

create index if not exists idx_event_checklists_event_id
  on event_checklists(event_id);

create index if not exists idx_checklist_items_checklist_id
  on checklist_items(checklist_id);

-- ── RLS: habilitar pero permitir todo (igual que el resto de la app) ──
alter table checklist_templates enable row level security;
alter table template_items      enable row level security;
alter table event_checklists    enable row level security;
alter table checklist_items     enable row level security;

-- Políticas permisivas (la app usa service_role para writes, anon para reads)
create policy "allow_all_templates"   on checklist_templates for all using (true) with check (true);
create policy "allow_all_tmpl_items"  on template_items      for all using (true) with check (true);
create policy "allow_all_checklists"  on event_checklists    for all using (true) with check (true);
create policy "allow_all_cl_items"    on checklist_items     for all using (true) with check (true);

-- ── Storage bucket para fotos ──────────────────────────────
-- Ejecutar esto por separado si el bucket no existe todavía:
-- insert into storage.buckets (id, name, public)
--   values ('event-photos', 'event-photos', true)
--   on conflict (id) do nothing;

-- ── Datos de ejemplo para empezar (opcional) ──────────────
-- Plantilla "Salón Principal"
insert into checklist_templates (id, name, category)
values (
  '00000000-0000-0000-0000-000000000001',
  'Salón Principal',
  'General'
) on conflict (id) do nothing;

insert into template_items (template_id, name, category, default_qty, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'Silla Chiavari', 'Mobiliario', 50, 1),
  ('00000000-0000-0000-0000-000000000001', 'Mesa redonda 1.8m', 'Mobiliario', 8, 2),
  ('00000000-0000-0000-0000-000000000001', 'Mantel blanco', 'Telas', 8, 3),
  ('00000000-0000-0000-0000-000000000001', 'Camino de mesa', 'Telas', 8, 4),
  ('00000000-0000-0000-0000-000000000001', 'Micrófono inalámbrico', 'Audiovisual', 2, 5),
  ('00000000-0000-0000-0000-000000000001', 'Proyector', 'Audiovisual', 1, 6),
  ('00000000-0000-0000-0000-000000000001', 'Pantalla de proyección', 'Audiovisual', 1, 7),
  ('00000000-0000-0000-0000-000000000001', 'Foco LED cenital', 'Iluminación', 12, 8),
  ('00000000-0000-0000-0000-000000000001', 'Riel de iluminación', 'Iluminación', 3, 9),
  ('00000000-0000-0000-0000-000000000001', 'Baño damas', 'Instalaciones', 1, 10),
  ('00000000-0000-0000-0000-000000000001', 'Baño caballeros', 'Instalaciones', 1, 11),
  ('00000000-0000-0000-0000-000000000001', 'Cocina / Office', 'Instalaciones', 1, 12)
on conflict do nothing;
