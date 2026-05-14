-- ================================================================
-- FIX: Políticas RLS permisivas para todas las tablas
-- Ejecutar UNA VEZ en: Supabase Dashboard → SQL Editor → Run
--
-- Problema: el anon key no puede escribir porque las políticas
-- RLS bloquean los inserts. La app usa anon key en producción
-- (Vercel). Este script hace todas las políticas permisivas
-- (USING true / WITH CHECK true) igual que las tablas de planillas.
-- ================================================================

-- ── areas ─────────────────────────────────────────────────────
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'areas' AND policyname = 'allow_all_areas') THEN
    CREATE POLICY "allow_all_areas" ON areas FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── projects ──────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'allow_all_projects') THEN
    CREATE POLICY "allow_all_projects" ON projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── tasks ─────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'allow_all_tasks') THEN
    CREATE POLICY "allow_all_tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── subtasks ──────────────────────────────────────────────────
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subtasks' AND policyname = 'allow_all_subtasks') THEN
    CREATE POLICY "allow_all_subtasks" ON subtasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── comments ──────────────────────────────────────────────────
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND policyname = 'allow_all_comments') THEN
    CREATE POLICY "allow_all_comments" ON comments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── templates ─────────────────────────────────────────────────
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'templates' AND policyname = 'allow_all_templates_proj') THEN
    CREATE POLICY "allow_all_templates_proj" ON templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── template_tasks ────────────────────────────────────────────
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_tasks' AND policyname = 'allow_all_template_tasks') THEN
    CREATE POLICY "allow_all_template_tasks" ON template_tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── members / team ────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
    ALTER TABLE members ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'allow_all_members') THEN
      CREATE POLICY "allow_all_members" ON members FOR ALL USING (true) WITH CHECK (true);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team') THEN
    ALTER TABLE team ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team' AND policyname = 'allow_all_team') THEN
      CREATE POLICY "allow_all_team" ON team FOR ALL USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ── audit_log (si existe) ─────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
    ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'allow_all_audit') THEN
      CREATE POLICY "allow_all_audit" ON audit_log FOR ALL USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- ── Hacer due opcional en projects ───────────────────────────
ALTER TABLE projects ALTER COLUMN due DROP NOT NULL;

-- Verificación: lista todas las políticas creadas
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
