-- ═══════════════════════════════════════════════════════════
-- SCRIPT: Crear usuarios iniciales en Supabase Auth
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ⚠️  SOLO UNA VEZ — idempotente con DO .. IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════

-- Contraseña temporal para todos: Tropical2024!
-- Cada usuario debe cambiarla después del primer login.

DO $$
DECLARE
  uid_joa uuid;
  uid_fab uuid;
  uid_mar uuid;
BEGIN

  -- ── Joaquin Abastoflor ─────────────────────────────────
  SELECT id INTO uid_joa FROM auth.users WHERE email = 'joaquin@tropical.bo';
  IF uid_joa IS NULL THEN
    uid_joa := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role, aud
    ) VALUES (
      uid_joa,
      '00000000-0000-0000-0000-000000000000',
      'joaquin@tropical.bo',
      crypt('Tropical2024!', gen_salt('bf')),
      now(), now(), now(),
      'authenticated', 'authenticated'
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), uid_joa,
      jsonb_build_object('sub', uid_joa::text, 'email', 'joaquin@tropical.bo'),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO app_users (id, name, role, short, email, is_admin)
  VALUES (uid_joa, 'Joaquin Abastoflor', 'Jefe de Proyectos', 'Joaquin A.', 'joaquin@tropical.bo', true)
  ON CONFLICT (id) DO UPDATE SET name = excluded.name, role = excluded.role, short = excluded.short, is_admin = excluded.is_admin;

  -- ── Fabio Jimenez ──────────────────────────────────────
  SELECT id INTO uid_fab FROM auth.users WHERE email = 'fabio@tropical.bo';
  IF uid_fab IS NULL THEN
    uid_fab := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role, aud
    ) VALUES (
      uid_fab,
      '00000000-0000-0000-0000-000000000000',
      'fabio@tropical.bo',
      crypt('Tropical2024!', gen_salt('bf')),
      now(), now(), now(),
      'authenticated', 'authenticated'
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), uid_fab,
      jsonb_build_object('sub', uid_fab::text, 'email', 'fabio@tropical.bo'),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO app_users (id, name, role, short, email, is_admin)
  VALUES (uid_fab, 'Fabio Jimenez', 'Coordinador Administrativo', 'Fabio J.', 'fabio@tropical.bo', false)
  ON CONFLICT (id) DO UPDATE SET name = excluded.name, role = excluded.role, short = excluded.short;

  -- ── Marcelo Jaldin ─────────────────────────────────────
  SELECT id INTO uid_mar FROM auth.users WHERE email = 'marcelo@tropical.bo';
  IF uid_mar IS NULL THEN
    uid_mar := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role, aud
    ) VALUES (
      uid_mar,
      '00000000-0000-0000-0000-000000000000',
      'marcelo@tropical.bo',
      crypt('Tropical2024!', gen_salt('bf')),
      now(), now(), now(),
      'authenticated', 'authenticated'
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), uid_mar,
      jsonb_build_object('sub', uid_mar::text, 'email', 'marcelo@tropical.bo'),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO app_users (id, name, role, short, email, is_admin)
  VALUES (uid_mar, 'Marcelo Jaldin', 'Director de Finanzas', 'Marcelo J.', 'marcelo@tropical.bo', false)
  ON CONFLICT (id) DO UPDATE SET name = excluded.name, role = excluded.role, short = excluded.short;

END $$;

-- Verificación
SELECT email, created_at FROM auth.users WHERE email IN ('joaquin@tropical.bo','fabio@tropical.bo','marcelo@tropical.bo');
SELECT name, email, role, is_admin FROM app_users ORDER BY name;
