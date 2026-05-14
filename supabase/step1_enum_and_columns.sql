-- ══════════════════════════════════════════════════════
-- PASO 1A — Pegar y ejecutar SOLO esta línea primero:
-- ══════════════════════════════════════════════════════
ALTER TYPE area_type ADD VALUE IF NOT EXISTS 'otros';


-- ══════════════════════════════════════════════════════
-- PASO 1B — Luego limpiar y ejecutar SOLO estas dos:
-- ══════════════════════════════════════════════════════
-- ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS phase_name    text;
-- ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 1;
