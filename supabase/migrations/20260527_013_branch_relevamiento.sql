-- ══════════════════════════════════════════════════════════
-- Migración 013: Checklist de Relevamiento de Sucursales
-- ══════════════════════════════════════════════════════════
-- Formulario maestro (checklist_templates + template_items) para el
-- relevamiento general de sucursales: 37 ítems en 4 categorías, con
-- 4 estados por ítem (Óptimo / Regular / Requiere mantenimiento / No aplica).
-- Se rellena dentro de un proyecto (project_forms / project_form_items) y se
-- imprime con diseño estilo planilla. Separado del módulo Planillas (entrega/recepción).

-- ── 1. Columna de estado de relevamiento en los ítems de run
--    (el status ok/fail/pending se conserva para formularios genéricos)
alter table project_form_items
  add column if not exists condition text
  check (condition in ('optimo','regular','mantenimiento','na'));

-- ── 2. Formulario maestro
insert into checklist_templates (id, name, description, kind) values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'Checklist de Relevamiento de Sucursales',
  'Modelo general de relevamiento de sucursales. Revisar cada ítem, marcar una sola condición por fila y registrar observaciones claras cuando exista algún hallazgo. Adaptable por sucursal.',
  'custom'
) on conflict (id) do nothing;

-- ── 3. Ítems (37) en sus 4 categorías
insert into template_items (template_id, name, category, sort_order) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Jalavista',              'ESTRUCTURAL / INFRAESTRUCTURA',     1),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Persiana metálica',      'ESTRUCTURAL / INFRAESTRUCTURA',     2),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Cerramientos',           'ESTRUCTURAL / INFRAESTRUCTURA',     3),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Muros drywall',          'ESTRUCTURAL / INFRAESTRUCTURA',     4),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Cielo falso',            'ESTRUCTURAL / INFRAESTRUCTURA',     5),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Pisos y zócalos',        'ESTRUCTURAL / INFRAESTRUCTURA',     6),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Pintura',                'ESTRUCTURAL / INFRAESTRUCTURA',     7),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Vidrios y puertas',      'ESTRUCTURAL / INFRAESTRUCTURA',     8),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Estructura TV',          'ESTRUCTURAL / INFRAESTRUCTURA',     9),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Alucobond',              'ESTRUCTURAL / INFRAESTRUCTURA',    10),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Estructuras metálicas',  'ESTRUCTURAL / INFRAESTRUCTURA',    11),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Muebles de apoyo',       'MOBILIARIO Y EQUIPAMIENTO FÍSICO', 12),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Escritorios',            'MOBILIARIO Y EQUIPAMIENTO FÍSICO', 13),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Soporte de monitor',     'MOBILIARIO Y EQUIPAMIENTO FÍSICO', 14),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Sillas',                 'MOBILIARIO Y EQUIPAMIENTO FÍSICO', 15),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Poltronas / Cochas',     'MOBILIARIO Y EQUIPAMIENTO FÍSICO', 16),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Caja fuerte',            'MOBILIARIO Y EQUIPAMIENTO FÍSICO', 17),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Área de caja',           'MOBILIARIO Y EQUIPAMIENTO FÍSICO', 18),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Monitores',              'TECNOLOGÍA / ELECTRÓNICOS',        19),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Tótem',                  'TECNOLOGÍA / ELECTRÓNICOS',        20),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Pantalla de llamado',    'TECNOLOGÍA / ELECTRÓNICOS',        21),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Mac / Mini PC',          'TECNOLOGÍA / ELECTRÓNICOS',        22),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Mouse',                  'TECNOLOGÍA / ELECTRÓNICOS',        23),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Impresora',              'TECNOLOGÍA / ELECTRÓNICOS',        24),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Computadoras',           'TECNOLOGÍA / ELECTRÓNICOS',        25),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Parlantes',              'TECNOLOGÍA / ELECTRÓNICOS',        26),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Frigobar',               'TECNOLOGÍA / ELECTRÓNICOS',        27),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'TVs',                    'TECNOLOGÍA / ELECTRÓNICOS',        28),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Tablet',                 'TECNOLOGÍA / ELECTRÓNICOS',        29),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Cámara de seguridad',    'SISTEMAS E INSTALACIONES',         30),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Equipos de sistemas',    'SISTEMAS E INSTALACIONES',         31),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Dispensador de agua',    'SISTEMAS E INSTALACIONES',         32),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Extintores',             'SISTEMAS E INSTALACIONES',         33),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Aire acondicionado',     'SISTEMAS E INSTALACIONES',         34),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Letreros',               'SISTEMAS E INSTALACIONES',         35),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Instalación eléctrica',  'SISTEMAS E INSTALACIONES',         36),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Iluminación',            'SISTEMAS E INSTALACIONES',         37)
on conflict do nothing;

-- ── 4. Verificación
select count(*) as items_relevamiento
from template_items
where template_id = 'bbbbbbbb-0000-0000-0000-000000000001';
