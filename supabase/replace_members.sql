-- ═══════════════════════════════════════════════════════════
-- SCRIPT: Reemplazar tabla members con lista oficial
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ⚠️  Idempotente — seguro de correr múltiples veces
-- ═══════════════════════════════════════════════════════════

-- 1. Mapear tasks con assignee no reconocido → Joaquin (fallback)
UPDATE tasks
SET assignee = 'joa'
WHERE assignee IS NOT NULL
  AND assignee NOT IN ('joa','fab','mar','comercial','legal','marketing','finanzas','cesar','rodrigo');

-- 2. Limpiar helpers no reconocidos
UPDATE tasks
SET helper = NULL
WHERE helper IS NOT NULL
  AND helper NOT IN ('joa','fab','mar','comercial','legal','marketing','finanzas','cesar','rodrigo');

-- 3. Hacer lo mismo en projects si tiene campo assignee
UPDATE projects
SET assignee = 'joa'
WHERE assignee IS NOT NULL
  AND assignee NOT IN ('joa','fab','mar','comercial','legal','marketing','finanzas','cesar','rodrigo');

-- 4. Borrar todos los members actuales y reinsertar lista oficial
DELETE FROM members;

INSERT INTO members (id, name, short, role) VALUES
  ('joa',        'Joaquin Abastoflor', 'Joaquin A.', 'Jefe de Proyectos'),
  ('fab',        'Fabio Jimenez',      'Fabio J.',   'Coordinador Administrativo'),
  ('mar',        'Marcelo Jaldin',     'Marcelo J.', 'Director de Finanzas'),
  ('comercial',  'Comercial',          'Comercial',  'Equipo'),
  ('legal',      'Legal',              'Legal',      'Equipo'),
  ('marketing',  'Marketing',          'Marketing',  'Equipo'),
  ('finanzas',   'Finanzas',           'Finanzas',   'Equipo'),
  ('cesar',      'Cesar Moron',        'Cesar M.',   'Miembro'),
  ('rodrigo',    'Rodrigo de Avila',   'Rodrigo A.', 'Miembro')
ON CONFLICT (id) DO UPDATE SET
  name  = excluded.name,
  short = excluded.short,
  role  = excluded.role;

-- 5. Verificación
SELECT id, name, short, role FROM members ORDER BY
  CASE id
    WHEN 'joa' THEN 1
    WHEN 'fab' THEN 2
    WHEN 'mar' THEN 3
    ELSE 4
  END, name;
