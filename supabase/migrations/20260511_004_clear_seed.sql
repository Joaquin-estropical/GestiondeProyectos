-- ══════════════════════════════════════════════════════════
-- Limpia todos los datos de seed — corre esto en Supabase SQL Editor
-- Deja las tablas vacías y listas para tus datos reales.
-- Los miembros del equipo se mantienen (necesarios para el sistema).
-- ══════════════════════════════════════════════════════════

-- Orden importante: primero hijos, luego padres

DELETE FROM comments;
DELETE FROM subtasks;
DELETE FROM activity;
DELETE FROM template_tasks;
DELETE FROM templates;
DELETE FROM tasks;
DELETE FROM projects;
DELETE FROM areas;

-- Si también querés limpiar miembros (opcional — comentar si no):
-- DELETE FROM members;
