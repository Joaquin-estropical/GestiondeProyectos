# GestiondeProyectos — CLAUDE.md

## Qué es este proyecto

**Tropical Tower Operations** es una plataforma de gestión de proyectos y operaciones diseñada
específicamente para el equipo de Tropical Tower / ES Tropical. No es un producto genérico —
es una herramienta interna ejecutiva que centraliza la visibilidad operativa de toda la
organización: tareas, proyectos, áreas, plantillas de entrega, formularios de sucursales y
reportes de avance.

El producto está pensado para ser **premium y ejecutivo**: interfaz limpia, visibilidad total
de un vistazo, mínima fricción para registrar o consultar estado. Cada decisión de UX debe
priorizar claridad y velocidad de lectura sobre densidad de funciones.

---

## Para quiénes

| Usuario | Rol en la app | Acceso |
|---|---|---|
| **Joaquin Abastoflor** | Jefe de Proyectos / Admin | Total — ve todo, configura usuarios y clave maestra |
| **Fabio Jimenez** | Coordinador Administrativo | Limitado por área (configurable) |
| **Marcelo Jaldin** | Director de Finanzas | Limitado por área (configurable) |
| **Raquel Cabrera** | Auditora | Limitado por área (configurable) |

Solo Joaquin (`is_admin: true`) puede gestionar usuarios, configurar áreas y cambiar la clave maestra. Los demás ven únicamente las áreas a las que tienen acceso asignado en Configuración.

---

## Stack técnico

- **React 18 + TypeScript + Vite** — frontend SPA
- **Zustand** (`useAppStore`) — estado global; único source of truth en runtime
- **Supabase** — base de datos PostgreSQL + realtime sync
- **localStorage** — autenticación y permisos (sin Supabase Auth)
- **React Router v6** — navegación SPA
- **Lucide React** — iconografía consistente en toda la UI

---

## Módulos de la aplicación

| Ruta | Módulo | Descripción |
|---|---|---|
| `/` | Dashboard | Vista global de tareas con filtros por área, persona, estado y prioridad |
| `/mi-dia` | Mi día | Tareas del usuario actual agrupadas por urgencia |
| `/calendario` | Calendario global | Todas las tareas en vista mensual |
| `/area/:id` | Área | Proyectos y tareas de un área específica, con vista lista/kanban/Gantt |
| `/proyecto/:id` | Proyecto | Detalle de proyecto: tareas, Gantt, formularios |
| `/tareas` | Lista de tareas | Vista global de todas las tareas |
| `/planillas` | Plantillas | Checklists de entrega/recepción de locales asignados a proyectos |
| `/planillas/plantillas` | Formularios maestros | Templates de ítems reutilizables (Editar/Duplicar/Eliminar) |
| `/formularios` | Formularios | Formularios generales (tab Generales) y por sucursal (tab Sucursales) |
| `/reportes` | Reportes | Gráficos de avance por área, estado y persona |
| `/asistente-ia` | Asistente IA | Bandeja de alertas y resúmenes generados por IA |
| `/configuracion` | Configuración | Áreas, usuarios, mi cuenta, clave maestra |

---

## Autenticación (100% localStorage, sin Supabase Auth)

- `getLocalUsers()` en `src/lib/auth.ts` — fuente única de verdad para los 4 usuarios
- Las contraseñas se guardan como overrides en `ot_local_passwords` (Record<userId, password>)
- La sesión se guarda en `ot_session_user_id`
- `verifyMasterKey(input)` compara contra `getMasterKey() ?? DEFAULT_MASTER_KEY`
- `DEFAULT_MASTER_KEY = '7ropical2026!'`
- Flujo "olvidé contraseña": el usuario ingresa la clave maestra → entra directo → cambia su contraseña desde Configuración → Mi cuenta

**NUNCA embeber el service role key de Supabase en código frontend.** Solo para operaciones de terminal puntuales.

---

## Miembros y datos

- `fetchMembers()` en `src/lib/db.ts` — combina miembros de Supabase + usuarios locales
- Shape: `{ id: string, name: string, role: string, short: string }`
- El `id` de miembro local coincide con `memberId` del `AppUser` (ej. `'joa'`, `'fab'`, `'raq'`)
- Raquel Cabrera existe en Supabase (`id: 'raq'`) y en `LOCAL_USERS` — la lógica de merge evita duplicados

---

## Tipos de área

`sucursal | outlet | edificio | bodega | general | otros`

Los edificios tienen sub-áreas. Las sucursales son el caso más común (tienen formularios de relevamiento propios).

---

## Criterios de producto (no negociables)

1. **Visibilidad ejecutiva primero** — cualquier pantalla debe permitir entender el estado en menos de 3 segundos sin leer texto pequeño.
2. **Diseño premium** — sin bordes gruesos, sin colores chillones. Paleta controlada con variables CSS (`--teal`, `--surface-1/2`, `--text-1/2/3`, `--border`). Nunca hardcodear colores en línea salvo los colores de área/proyecto que vienen de la DB.
3. **Responsive real** — funciona en mobile (bottom nav), tablet y desktop (sidebar). No se puede romper un breakpoint al arreglar otro.
4. **Sin fricción de datos** — los dropdowns de Responsable, Área, Proyecto siempre deben venir de Zustand store (que lee de Supabase), nunca de arrays hardcodeados locales.
5. **Estado persistente** — cambiar de vista (lista ↔ kanban ↔ Gantt), cambiar de tab, o navegar hacia atrás no debe resetear filtros ni estado de la pantalla anterior.

---

## Reglas de desarrollo

- Antes de cualquier query SQL, verificar que las columnas existen (`information_schema.columns`)
- Después de cualquier cambio en Supabase, confirmar que la UI lee de esa fuente (no de mocks)
- Antes de dar una feature por completa: revisar que los botones llamen al handler correcto y que el estado no se resetee al navegar
- Los componentes que muestran datos en vivo deben leer del store de Zustand (`useAppStore`), no de constantes locales

---

## Custom Skills

- `/audit` — auditoría completa de código + Supabase: cruza componentes vs schema, detecta mocks hardcodeados, reconcilia contra docs de referencia, genera SQL idempotente. Usar antes de cualquier migración de datos o cuando la UI no refleja el estado real de la DB.
