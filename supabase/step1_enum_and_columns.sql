-- ================================================================
-- PASO 1 de 2 — Ejecutar PRIMERO, solo este bloque
-- Agrega 'otros' al enum y columnas faltantes en template_tasks
-- ================================================================

-- Agregar 'otros' al enum area_type
-- NOTA: ADD VALUE no puede correr dentro de una transacción,
-- por eso va en un script separado.
ALTER TYPE public.area_type ADD VALUE IF NOT EXISTS 'otros';

-- Columnas faltantes en template_tasks (el código las usa pero nunca se crearon)
ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS phase_name    text;
ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 1;
