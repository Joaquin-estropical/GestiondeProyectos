-- ================================================================
-- MÓDULO PLANILLAS — migración completa
-- Ejecutar en Supabase Dashboard → SQL Editor
--
-- IMPORTANTE: El ALTER TYPE debe ejecutarse SOLO, en un paso
-- separado, antes del resto. PostgreSQL no permite ADD VALUE
-- dentro de una transacción.
--
-- PASO 1: Pegar y ejecutar SOLO estas 3 líneas:
-- ================================================================
ALTER TYPE area_type ADD VALUE IF NOT EXISTS 'otros';
ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS phase_name    text;
ALTER TABLE template_tasks ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 1;

-- ================================================================
-- PASO 2: Limpiar el editor, pegar TODO lo de abajo y ejecutar.
-- ================================================================

CREATE TABLE IF NOT EXISTS checklist_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  kind        text NOT NULL DEFAULT 'custom'
              CHECK (kind IN ('event_delivery', 'branch_delivery', 'local_return', 'custom')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid REFERENCES checklist_templates(id) ON DELETE CASCADE,
  name         text NOT NULL,
  category     text NOT NULL,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_checklists (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             text NOT NULL,
  type                 text NOT NULL CHECK (type IN ('reception', 'delivery')),
  status               text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  template_id          uuid REFERENCES checklist_templates(id),
  title                text,
  assigned_to_project  text,
  assigned_to_area     text,
  completed_at         timestamptz,
  created_at           timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id   uuid REFERENCES event_checklists(id) ON DELETE CASCADE,
  name           text NOT NULL,
  category       text NOT NULL,
  qty            integer,
  condition_in   text CHECK (condition_in IN ('good', 'fair', 'poor')),
  condition_out  text CHECK (condition_out IN ('good', 'fair', 'poor')),
  notes          text,
  photos         text[] DEFAULT '{}',
  sort_order     integer DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_items_template_id ON template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_event_checklists_event_id  ON event_checklists(event_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist  ON checklist_items(checklist_id);

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checklists    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checklist_templates' AND policyname = 'allow_all_templates') THEN
    CREATE POLICY "allow_all_templates"  ON checklist_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'template_items' AND policyname = 'allow_all_tmpl_items') THEN
    CREATE POLICY "allow_all_tmpl_items" ON template_items      FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_checklists' AND policyname = 'allow_all_checklists') THEN
    CREATE POLICY "allow_all_checklists" ON event_checklists    FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checklist_items' AND policyname = 'allow_all_cl_items') THEN
    CREATE POLICY "allow_all_cl_items"   ON checklist_items     FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('event-photos', 'event-photos', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO checklist_templates (id, name, description, kind) VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Plantilla general de eventos',
  'Plantilla base para eventos comerciales. Editable.',
  'event_delivery'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO template_items (template_id, name, category, sort_order) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Sillas',                                                         'Mobiliario',       1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mesas redondas',                                                 'Mobiliario',       2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mesas rectangulares',                                            'Mobiliario',       3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Mesas altas / cocteleras',                                       'Mobiliario',       4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Muebles de lounge (sofás, sillones, puffs)',                     'Mobiliario',       5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Atril / podio',                                                  'Mobiliario',       6),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Percheros',                                                      'Mobiliario',       7),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Manteles',                                                       'Telas y textiles', 1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Caminos de mesa',                                                'Telas y textiles', 2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Servilletas de tela',                                            'Telas y textiles', 3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Lazos / cintas para sillas',                                     'Telas y textiles', 4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Fundas de silla',                                                'Telas y textiles', 5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Telas de fondo / backdrop',                                      'Telas y textiles', 6),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Cortinas',                                                       'Telas y textiles', 7),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Elementos decorativos de mesa (centros, candelabros, jarrones)', 'Decoración',       1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Espejos y cuadros',                                              'Decoración',       2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Estructuras decorativas (arcos, columnas, marcos)',              'Decoración',       3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Alfombras',                                                      'Decoración',       4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Plantas / vegetación decorativa',                                'Decoración',       5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Señalética y cartelería del local',                              'Decoración',       6),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Iluminación general (funcionamiento)',                            'Iluminación',      1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Iluminación ambiental / decorativa',                             'Iluminación',      2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Iluminación de escena / reflectores',                            'Iluminación',      3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Extensiones y cables de poder',                                  'Iluminación',      4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Tablero eléctrico / breakers',                                   'Iluminación',      5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Sistema de sonido',                                              'Audiovisual',      1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Micrófonos',                                                     'Audiovisual',      2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Pantallas / proyector',                                          'Audiovisual',      3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Cables y conectores',                                            'Audiovisual',      4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Conectividad (WiFi / red)',                                      'Audiovisual',      5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Pisos (estado general)',                                         'Instalaciones',    1),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Paredes y pintura (estado general)',                             'Instalaciones',    2),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Puertas y ventanas (funcionamiento)',                            'Instalaciones',    3),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Baños (limpieza y funcionamiento)',                              'Instalaciones',    4),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Cocina / área de servicio',                                     'Instalaciones',    5),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Climatización (A/C o calefacción)',                              'Instalaciones',    6),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Extintores y señalética de emergencia',                          'Instalaciones',    7),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Áreas exteriores / terraza',                                    'Instalaciones',    8),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Llaves y controles de acceso',                                   'Instalaciones',    9)
ON CONFLICT DO NOTHING;
