-- ═══════════════════════════════════════════════════════════
-- Operaciones Tropical — Seed (datos mock)
-- ═══════════════════════════════════════════════════════════

-- ── Areas ─────────────────────────────────────────────────
insert into areas (id, name, color, icon, slug) values
  ('outlet',  'Outlet Centro',         '#14B8A6', 'store',      'outlet-centro'),
  ('norte',   'Sucursal Norte',        '#3B82F6', 'map-pin',    'sucursal-norte'),
  ('corp',    'Edificio Corporativo',  '#6366F1', 'building-2', 'edificio-corp'),
  ('bodega',  'Bodega Sur',            '#F59E0B', 'warehouse',  'bodega-sur'),
  ('plaza',   'Outlet Plaza',          '#EC4899', 'store',      'outlet-plaza');

-- ── Members ───────────────────────────────────────────────
insert into members (id, name, role, short) values
  ('joa', 'Joaquín Rivera',  'Admin · Operaciones', 'JR'),
  ('and', 'Andrea Mendoza',  'Coordinadora',        'AM'),
  ('car', 'Carlos Rojas',    'Técnico',             'CR'),
  ('sof', 'Sofía Vargas',    'Logística',           'SV'),
  ('die', 'Diego Aguilera',  'Mantenimiento',       'DA');

-- ── Projects ──────────────────────────────────────────────
insert into projects (id, name, area, due, progress, count) values
  ('p1', 'Renovación iluminación LED',     'outlet',  '2026-03-28', 35, 6),
  ('p2', 'Auditoría de inventario Q1',     'outlet',  '2026-03-15', 60, 4),
  ('p3', 'Migración sistema POS',          'norte',   '2026-03-14', 20, 5),
  ('p4', 'Capacitación equipo ventas',     'norte',   '2026-04-01', 50, 3),
  ('p5', 'Reforma oficinas piso 3',        'corp',    '2026-04-15', 10, 4),
  ('p6', 'Actualización red interna',      'corp',    '2026-03-30', 75, 3),
  ('p7', 'Reorganización depósito',        'bodega',  '2026-03-20', 45, 5),
  ('p8', 'Apertura Outlet Plaza',          'plaza',   '2026-05-01',  5, 4);

-- ── Tasks ─────────────────────────────────────────────────
insert into tasks (id, code, title, project, area, assignee, due, priority, status, time, comments, subtasks_done, subtasks_total) values
  ('t1',  'OT-001', 'Cotizar proveedores LED techo zona ventas',         'p1', 'outlet', 'and', '2026-03-10', 'alta', 'curso',  '2h 30m', 3, 2, 4),
  ('t2',  'OT-002', 'Revisar permisos obra mayor municipalidad',         'p1', 'outlet', 'joa', '2026-03-05', 'urg',  'block',  '1h 00m', 1, 0, 2),
  ('t3',  'OT-003', 'Conciliar inventario físico con sistema',           'p2', 'outlet', 'sof', '2026-03-12', 'med',  'pend',   '0h',     0, 0, 3),
  ('t4',  'OT-004', 'Informe de faltantes Q1 para gerencia',             'p2', 'outlet', 'and', '2026-03-15', 'alta', 'pend',   '0h',     0, 0, 2),
  ('t5',  'OT-005', 'Migración POS sucursal norte — fase 1',             'p3', 'norte',  'car', '2026-03-14', 'urg',  'curso',  '5h 15m', 2, 1, 3),
  ('t6',  'OT-006', 'Capacitación cajeros nuevo sistema',                'p3', 'norte',  'joa', '2026-03-18', 'med',  'pend',   '0h',     0, 0, 2),
  ('t7',  'OT-007', 'Módulo de ventas — testing en producción',          'p3', 'norte',  'car', '2026-03-20', 'alta', 'rev',    '3h 45m', 4, 2, 3),
  ('t8',  'OT-008', 'Taller atención al cliente — turno mañana',         'p4', 'norte',  'sof', '2026-03-25', 'baja', 'pend',   '0h',     0, 0, 1),
  ('t9',  'OT-009', 'Planos aprobados reforma oficinas piso 3',          'p5', 'corp',   'joa', '2026-03-08', 'alta', 'done',   '4h 00m', 2, 3, 3),
  ('t10', 'OT-010', 'Presupuesto mobiliario nuevas oficinas',            'p5', 'corp',   'and', '2026-03-22', 'med',  'pend',   '0h',     1, 0, 2),
  ('t11', 'OT-011', 'Actualizar switches piso 1 y 2',                    'p6', 'corp',   'car', '2026-03-18', 'alta', 'curso',  '6h 30m', 0, 1, 2),
  ('t12', 'OT-012', 'Documentar topología red nueva',                    'p6', 'corp',   'die', '2026-03-30', 'baja', 'pend',   '0h',     0, 0, 1),
  ('t13', 'OT-013', 'Reorganizar estanterías sector A y B',              'p7', 'bodega', 'die', '2026-03-12', 'med',  'curso',  '3h 00m', 1, 2, 4),
  ('t14', 'OT-014', 'Etiquetar SKUs nuevos ingreso marzo',               'p7', 'bodega', 'sof', '2026-03-15', 'med',  'pend',   '0h',     0, 0, 2),
  ('t15', 'OT-015', 'Control de stock mínimo bebidas',                   'p7', 'bodega', 'die', '2026-03-08', 'alta', 'done',   '1h 30m', 0, 2, 2),
  ('t16', 'OT-016', 'Definir layout sala principal Outlet Plaza',        'p8', 'plaza',  'joa', '2026-04-01', 'alta', 'pend',   '0h',     2, 0, 3),
  ('t17', 'OT-017', 'Contratar personal apertura — 8 posiciones',        'p8', 'plaza',  'and', '2026-04-15', 'med',  'pend',   '0h',     0, 0, 2),
  ('t18', 'OT-018', 'Instalar cartelería y señalética exterior',         'p8', 'plaza',  'die', '2026-04-20', 'baja', 'pend',   '0h',     0, 0, 1);
