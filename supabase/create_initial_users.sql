-- ═══════════════════════════════════════════════════════════
-- SCRIPT: Crear usuarios iniciales en Supabase Auth
-- EJECUTAR EN: Supabase Dashboard → SQL Editor
-- ⚠️  SOLO UNA VEZ — idempotente con ON CONFLICT
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
  SELECT id INTO uid_joa FROM auth.users WHERE email = 'jabastoflor@tropicaltower.com.bo';
  IF uid_joa IS NULL THEN
    uid_joa := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role, aud
    ) VALUES (
      uid_joa,
      '00000000-0000-0000-0000-000000000000',
      'jabastoflor@tropicaltower.com.bo',
      crypt('Tropical2024!', gen_salt('bf')),
      now(), now(), now(),
      'authenticated', 'authenticated'
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), uid_joa,
      jsonb_build_object('sub', uid_joa::text, 'email', 'jabastoflor@tropicaltower.com.bo'),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO app_users (id, name, role, short, email, is_admin)
  VALUES (uid_joa, 'Joaquin Abastoflor', 'Jefe de Proyectos', 'Joaquin A.', 'jabastoflor@tropicaltower.com.bo', true)
  ON CONFLICT (id) DO UPDATE SET
    name     = excluded.name,
    role     = excluded.role,
    short    = excluded.short,
    email    = excluded.email,
    is_admin = excluded.is_admin;

  -- ── Fabio Jimenez ──────────────────────────────────────
  SELECT id INTO uid_fab FROM auth.users WHERE email = 'fjimenez@tropicaltower.com.bo';
  IF uid_fab IS NULL THEN
    uid_fab := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role, aud
    ) VALUES (
      uid_fab,
      '00000000-0000-0000-0000-000000000000',
      'fjimenez@tropicaltower.com.bo',
      crypt('Tropical2024!', gen_salt('bf')),
      now(), now(), now(),
      'authenticated', 'authenticated'
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), uid_fab,
      jsonb_build_object('sub', uid_fab::text, 'email', 'fjimenez@tropicaltower.com.bo'),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO app_users (id, name, role, short, email, is_admin)
  VALUES (uid_fab, 'Fabio Jimenez', 'Coordinador Administrativo', 'Fabio J.', 'fjimenez@tropicaltower.com.bo', false)
  ON CONFLICT (id) DO UPDATE SET
    name  = excluded.name,
    role  = excluded.role,
    short = excluded.short,
    email = excluded.email;

  -- ── Marcelo Jaldin ─────────────────────────────────────
  SELECT id INTO uid_mar FROM auth.users WHERE email = 'mrjaldin@estropical.com';
  IF uid_mar IS NULL THEN
    uid_mar := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, role, aud
    ) VALUES (
      uid_mar,
      '00000000-0000-0000-0000-000000000000',
      'mrjaldin@estropical.com',
      crypt('Tropical2024!', gen_salt('bf')),
      now(), now(), now(),
      'authenticated', 'authenticated'
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), uid_mar,
      jsonb_build_object('sub', uid_mar::text, 'email', 'mrjaldin@estropical.com'),
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO app_users (id, name, role, short, email, is_admin)
  VALUES (uid_mar, 'Marcelo Jaldin', 'Director de Finanzas', 'Marcelo J.', 'mrjaldin@estropical.com', false)
  ON CONFLICT (id) DO UPDATE SET
    name  = excluded.name,
    role  = excluded.role,
    short = excluded.short,
    email = excluded.email;

END $$;

-- Verificación
SELECT au.email, ap.name, ap.role, ap.is_admin
FROM auth.users au
JOIN app_users ap ON ap.id = au.id
WHERE au.email IN (
  'jabastoflor@tropicaltower.com.bo',
  'fjimenez@tropicaltower.com.bo',
  'mrjaldin@estropical.com'
);
