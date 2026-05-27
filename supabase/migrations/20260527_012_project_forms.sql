-- ══════════════════════════════════════════════════════════
-- Migración 012: project_forms (formularios OK/X dentro de proyectos)
-- ══════════════════════════════════════════════════════════
-- Pestaña "Formularios" del ProjectPage. Reusa checklist_templates como
-- catálogo opcional de formularios maestros pero los runs viven en su
-- propia tabla, separados del sistema de Planillas (recepción/entrega).

-- ── 1. project_forms (un form en curso o completado dentro de un proyecto)
create table if not exists project_forms (
  id           text primary key default gen_random_uuid()::text,
  project_id   text not null references projects(id) on delete cascade,
  template_id  uuid references checklist_templates(id) on delete set null,
  title        text not null,
  status       text not null check (status in ('in_progress','completed')) default 'in_progress',
  created_by   text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists project_forms_project_idx on project_forms(project_id);

-- ── 2. project_form_items (cada ítem del checklist)
create table if not exists project_form_items (
  id          text primary key default gen_random_uuid()::text,
  form_id     text not null references project_forms(id) on delete cascade,
  title       text not null,
  category    text,
  status      text not null check (status in ('pending','ok','fail')) default 'pending',
  observation text,
  task_id     text references tasks(id) on delete set null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists project_form_items_form_idx on project_form_items(form_id);

-- ── 3. RLS permisiva (consistente con el resto del schema)
alter table project_forms      enable row level security;
alter table project_form_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'project_forms' and policyname = 'project_forms all') then
    execute 'create policy "project_forms all" on project_forms for all using (true) with check (true)';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'project_form_items' and policyname = 'project_form_items all') then
    execute 'create policy "project_form_items all" on project_form_items for all using (true) with check (true)';
  end if;
end $$;

-- ── 4. Realtime
do $$ begin
  begin
    alter publication supabase_realtime add table project_forms;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table project_form_items;
  exception when others then null; end;
end $$;

-- ── 5. Verificación
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('project_forms','project_form_items');
