-- ═══════════════════════════════════════════════════════════
-- Operaciones Tropical — Schema v2: áreas dinámicas, plantillas,
-- subtareas y comentarios reales
-- ═══════════════════════════════════════════════════════════

-- ── Tipo de área ──────────────────────────────────────────
create type area_type as enum ('sucursal','outlet','edificio','bodega','general');

-- ── Ampliar tabla areas ───────────────────────────────────
alter table areas
  add column if not exists type area_type not null default 'general',
  add column if not exists description text,
  add column if not exists created_at timestamptz not null default now();

-- ── Plantillas ────────────────────────────────────────────
create table templates (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  area_type   area_type not null,
  description text,
  created_at  timestamptz not null default now()
);

create table template_tasks (
  id          text primary key default gen_random_uuid()::text,
  template_id text not null references templates(id) on delete cascade,
  title       text not null,
  priority    task_priority not null default 'med',
  day_offset  integer not null default 0,  -- días desde inicio del proyecto
  sort_order  integer not null default 0
);

-- ── Subtareas reales ──────────────────────────────────────
create table subtasks (
  id         text primary key default gen_random_uuid()::text,
  task_id    text not null references tasks(id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  assignee   text references members(id),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── Comentarios reales ────────────────────────────────────
create table comments (
  id         text primary key default gen_random_uuid()::text,
  task_id    text not null references tasks(id) on delete cascade,
  author     text not null references members(id),
  body       text not null,
  created_at timestamptz not null default now()
);

-- ── Actividad ─────────────────────────────────────────────
create table activity (
  id         text primary key default gen_random_uuid()::text,
  task_id    text references tasks(id) on delete set null,
  who        text not null references members(id),
  action     text not null,
  target     text not null,
  kind       text not null default 'create',
  created_at timestamptz not null default now()
);

-- ── Ampliar tasks: descripción y dates ────────────────────
alter table tasks
  add column if not exists description text,
  add column if not exists start_date  text,
  add column if not exists tags        text[] default '{}';

-- ── RLS para nuevas tablas ────────────────────────────────
alter table templates      enable row level security;
alter table template_tasks enable row level security;
alter table subtasks       enable row level security;
alter table comments       enable row level security;
alter table activity       enable row level security;

create policy "public read templates"       on templates      for select using (true);
create policy "public write templates"      on templates      for all    using (true);
create policy "public read template_tasks"  on template_tasks for select using (true);
create policy "public write template_tasks" on template_tasks for all    using (true);
create policy "public read subtasks"        on subtasks       for select using (true);
create policy "public write subtasks"       on subtasks       for all    using (true);
create policy "public read comments"        on comments       for select using (true);
create policy "public write comments"       on comments       for all    using (true);
create policy "public read activity"        on activity       for select using (true);
create policy "public write activity"       on activity       for all    using (true);

-- ── Seed: actualizar áreas con type ──────────────────────
update areas set type = 'outlet'   where id = 'outlet';
update areas set type = 'sucursal' where id = 'norte';
update areas set type = 'edificio' where id = 'corp';
update areas set type = 'bodega'   where id = 'bodega';
update areas set type = 'outlet'   where id = 'plaza';

-- ── Seed: plantillas base por tipo de área ───────────────
insert into templates (id, name, area_type, description) values
  ('tpl1', 'Apertura de Sucursal',  'sucursal', 'Checklist estándar para apertura de una nueva sucursal'),
  ('tpl2', 'Apertura de Outlet',    'outlet',   'Tareas estándar para puesta en marcha de un outlet'),
  ('tpl3', 'Auditoría de Bodega',   'bodega',   'Proceso de auditoría y reorganización de depósito');

insert into template_tasks (template_id, title, priority, day_offset, sort_order) values
  -- Apertura Sucursal
  ('tpl1', 'Gestionar habilitación municipal',         'urg',  0,  1),
  ('tpl1', 'Contratación y capacitación de personal',  'alta', 7,  2),
  ('tpl1', 'Configuración sistema POS',                'alta', 14, 3),
  ('tpl1', 'Instalación de cartelería y señalética',   'med',  21, 4),
  ('tpl1', 'Inventario inicial de stock',              'alta', 25, 5),
  ('tpl1', 'Prueba general antes de apertura',         'urg',  28, 6),
  -- Apertura Outlet
  ('tpl2', 'Definir layout de sala principal',         'alta', 0,  1),
  ('tpl2', 'Contratar personal — mínimo 8 posiciones', 'alta', 7,  2),
  ('tpl2', 'Instalar sistemas de pago',                'alta', 14, 3),
  ('tpl2', 'Campaña de comunicación apertura',         'med',  21, 4),
  ('tpl2', 'Prueba operativa completa',                'urg',  28, 5),
  -- Auditoría Bodega
  ('tpl3', 'Conteo físico completo de stock',          'urg',  0,  1),
  ('tpl3', 'Conciliar sistema vs físico',              'alta', 3,  2),
  ('tpl3', 'Reorganizar estanterías por sector',       'med',  5,  3),
  ('tpl3', 'Etiquetar SKUs nuevos',                    'med',  7,  4),
  ('tpl3', 'Informe final de diferencias',             'alta', 10, 5);
