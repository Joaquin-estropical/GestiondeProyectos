-- ══════════════════════════════════════════════════════════
-- Template phases & task duration
-- Corre esto en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- Agrega columna de fase (milestone/sección) a cada tarea de plantilla
alter table template_tasks
  add column if not exists phase_name    text,          -- ej: "Área Legal", "Diseño", null = sin fase
  add column if not exists duration_days integer not null default 1;  -- duración en días de la tarea
