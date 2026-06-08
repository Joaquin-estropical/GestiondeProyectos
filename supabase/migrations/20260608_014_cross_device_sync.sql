-- ══════════════════════════════════════════════════════════════════════════════
-- Migración 014: Cross-device sync — contraseñas y clave maestra
-- ══════════════════════════════════════════════════════════════════════════════

-- user_settings: password override por usuario
-- Sin FK a app_users porque esos UUIDs no están en auth.users (no usamos Supabase Auth)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    uuid PRIMARY KEY,
  password   text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings open" ON user_settings;
CREATE POLICY "user_settings open" ON user_settings
  FOR ALL USING (true) WITH CHECK (true);

-- app_settings: configuración global clave/valor (actualmente: master_key)
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings open" ON app_settings;
CREATE POLICY "app_settings open" ON app_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Verificación
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_settings', 'app_settings')
ORDER BY table_name;
