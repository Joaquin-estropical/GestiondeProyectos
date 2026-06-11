-- ═══════════════════════════════════════════════════════════
-- FASE 15: Proyecto "Generales" en cada sub-área de Edificio
-- Aplicar en Supabase Dashboard → SQL Editor → Run
-- Idempotente: seguro re-ejecutar.
-- ═══════════════════════════════════════════════════════════

-- ── 1. Crear un proyecto "Generales" por cada sub-área de áreas tipo edificio
--      que aún no tenga uno ────────────────────────────────────────────────
insert into projects (id, name, area, subarea, due, progress, count)
select
  'p-generales-' || sa.id as id,
  'Generales'             as name,
  sa.area                 as area,
  sa.id                   as subarea,
  '2099-12-31'            as due,
  0                       as progress,
  0                       as count
from subareas sa
join areas a on a.id = sa.area and a.type = 'edificio'
where not exists (
  select 1 from projects p
  where p.subarea = sa.id and p.name = 'Generales'
);

-- ── 2. Verificación ───────────────────────────────────────────────────────
select
  (select count(*) from subareas sa join areas a on a.id = sa.area and a.type = 'edificio') as total_subareas_edificio,
  (select count(*) from projects p
     join subareas sa on sa.id = p.subarea
     join areas a on a.id = sa.area and a.type = 'edificio'
   where p.name = 'Generales')                                                              as proyectos_generales;
