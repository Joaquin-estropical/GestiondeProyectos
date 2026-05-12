-- Actualizar miembros con nombres y roles reales
-- Ejecutar en Supabase SQL Editor

-- Eliminar miembros anteriores de prueba
delete from members where id in ('and', 'car', 'sof', 'die');

-- Actualizar Joaquin (ya existe con id 'joa')
update members set
  name  = 'Joaquin Abastoflor',
  role  = 'Jefe de Proyectos',
  short = 'Joaquin A.'
where id = 'joa';

-- Insertar si no existe
insert into members (id, name, role, short)
values ('joa', 'Joaquin Abastoflor', 'Jefe de Proyectos', 'Joaquin A.')
on conflict (id) do update set
  name  = excluded.name,
  role  = excluded.role,
  short = excluded.short;

-- Insertar Fabio
insert into members (id, name, role, short)
values ('fab', 'Fabio Jimenez', 'Coordinador Administrativo', 'Fabio J.')
on conflict (id) do update set
  name  = excluded.name,
  role  = excluded.role,
  short = excluded.short;

-- Insertar Marcelo
insert into members (id, name, role, short)
values ('mar', 'Marcelo Jaldin', 'Director de Finanzas', 'Marcelo J.')
on conflict (id) do update set
  name  = excluded.name,
  role  = excluded.role,
  short = excluded.short;
