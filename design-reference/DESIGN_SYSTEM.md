# Operaciones Tropical — Design System v0.1

Sistema de diseño para la app web de gestión operativa multi-área **Operaciones Tropical**.
Estética: dark mode ejecutivo, densidad alta tipo Linear, sin gradientes saturados ni glassmorphism.

---

## 1. Fundamentos

### 1.1 Paleta de color

| Token | Hex | Uso |
|---|---|---|
| `--bg`            | `#0A0A0B` | Fondo base de la app |
| `--surface-1`     | `#131316` | Superficie elevada (sidebar items hover, cards) |
| `--surface-2`     | `#1A1A1F` | Superficie sobre superficie (filas hover, dropdowns) |
| `--border`        | `#1F1F23` | Bordes 1px |
| `--border-hover`  | `#2A2A30` | Borde en hover/focus |
| `--text-1`        | `#E8E8EA` | Texto principal |
| `--text-2`        | `#8B8B92` | Texto secundario |
| `--text-3`        | `#5A5A60` | Texto deshabilitado / placeholder |
| `--teal`          | `#14B8A6` | Acento principal — uso moderado (máx 2-3 por pantalla) |
| `--teal-hover`    | `#0F9488` | Acento hover |
| `--teal-bg`       | `rgba(20,184,166,.12)` | Fondos sutiles de teal |
| `--red`           | `#EF4444` | Urgente / error / vencido |
| `--amber`         | `#F59E0B` | Riesgo / warning |
| `--green`         | `#22C55E` | Éxito / completado |
| `--blue`          | `#3B82F6` | Info / En curso |

### 1.2 Áreas — color único por área

| Área | Color |
|---|---|
| Outlet Centro | `#14B8A6` (teal) |
| Sucursal Norte | `#3B82F6` (azul) |
| Edificio Corporativo | `#6366F1` (índigo) |
| Bodega Sur | `#F59E0B` (ámbar) |
| Outlet Plaza | `#EC4899` (rosa) |

### 1.3 Tipografía

- **UI**: Inter — 400 / 500 / 600 / 700
- **Mono**: JetBrains Mono (fechas, IDs, tiempo, números) — 400 / 500 / 600

| Estilo | Tamaño | Peso | Notas |
|---|---|---|---|
| Display H1 | 28 | 600 | `letter-spacing: -.01em` |
| Heading | 18 | 600 | Títulos de sección |
| Subheading | 14 | 600 | Card headers |
| Body | 14 | 400 | |
| Small | 13 | 400 | |
| Micro | 11 | 500 | `uppercase`, `letter-spacing: .05em` |

### 1.4 Espaciado · Radios · Sombras

- **Spacing**: 4, 8, 12, 16, 20, 24, 32, 48
- **Radios**: 4 (botones sm), 6 (cards, inputs, botones md/lg), 8 (modales, slide-over), 999 (pills, avatars)
- **Sombras**: solo en overlays (modal, dropdown, slide-over). Sin sombras decorativas.

### 1.5 Iconografía

**Lucide Icons** exclusivamente. Cero emojis decorativos en datos.
Tamaños: 11, 12, 13, 14, 15, 16. Stroke 1.75.

Set usado: `home`, `sun`, `inbox`, `calendar`, `bar-chart-3`, `settings`, `users`, `user-plus`, `map-pin`, `store`, `building-2`, `warehouse`, `folder`, `folder-plus`, `check-square`, `list-todo`, `kanban`, `gantt-chart`, `table`, `list`, `layout-grid`, `layout-template`, `circle-check`, `circle-alert`, `triangle-alert`, `octagon-alert`, `play`, `pause`, `clock`, `flag`, `paperclip`, `at-sign`, `message-square`, `link`, `more-horizontal`, `plus`, `arrow-up`, `arrow-right`, `arrow-down-wide-narrow`, `chevron-left`, `chevron-right`, `chevron-down`, `x`, `search`, `search-x`, `filter`, `download`, `sparkles`, `lightbulb`, `target`, `bell`, `refresh-cw`, `file-bar-chart`, `globe`, `panel-left-open`, `panel-left-close`, `percent`, `line-chart`, `gauge`, `shield-check`, `calendar-x-2`.

---

## 2. Componentes

### 2.1 Botones
4 variantes × 3 tamaños + icon-only.

- **primary** — `--teal` background, texto `#0A0A0B`. Solo CTAs principales.
- **secondary** — borde `--border`, texto `--text-1`.
- **ghost** — sin fondo. Acciones terciarias.
- **destructive** — `--red`. Confirmaciones destructivas.

Tamaños: `sm` (28px), `md` (32px), `lg` (40px).

### 2.2 Inputs
- Borde `--border`, focus → `--teal` con halo `rgba(20,184,166,.15)`.
- Icono opcional a la izquierda (12-14px).
- Disabled: opacity .5, cursor not-allowed.

### 2.3 Pills / Badges
- **status** — pill con dot a la izquierda. Variantes por estado.
- **priority** — pill con icono `flag` + color por prioridad (urg=rojo, alta=ámbar, med=azul, baja=gris).
- **area** — pill con icono del área + color único.

### 2.4 Avatars
- Circulares, iniciales (1-2 letras).
- Color de fondo generado determinísticamente desde el nombre (8 colores en paleta).
- Tamaños usados: 20 / 22 / 24 / 26 / 28 / 32.
- `AvatarStack` con offset -8px y borde 2px del fondo.

### 2.5 Cards
- Background `--surface-1`, borde `--border`, radio 6px.
- Header opcional (44px) con título 14/600.
- Variantes: kpi (con label micro + valor 28/600 + sub), card-pad (16px padding).

### 2.6 Tabla densa
- Fila 36-40px. Borde inferior `--border`.
- Hover: fondo `--surface-2`.
- Encabezado: micro labels.
- Agrupación por estado con header de grupo (dot + label + count).

### 2.7 Overlays
- **Tooltip** — `--surface-2` con borde, 12px font, 6px padding, delay 200ms.
- **Dropdown** — radio 6, sombra `0 4px 12px rgba(0,0,0,.4)`.
- **Modal** — centrado, radio 8, max-width 480px (confirmaciones).
- **Slide-over** — derecha, 520-600px, transition 240ms ease-out. Backdrop `rgba(0,0,0,.5)`.

### 2.8 Command palette (⌘K)
- Modal centrado max-width 640px.
- Search arriba con icono + atajo ESC.
- Lista agrupada por sección (Ir a, Crear, Tareas, IA…).
- Selección con teclado: ↑↓ navega, ↵ ejecuta, ESC cierra.
- Footer con leyenda de atajos.

### 2.9 Skeleton loaders
- Animación shimmer sutil (`--surface-1` → `--surface-2` → `--surface-1`).
- Usados para tablas, cards y AI streaming.

### 2.10 Empty states
- Centrado, max-width 360px.
- Ícono Lucide en círculo de 56px, `--surface-1`.
- Título 15/600, descripción 13 en `--text-2`, CTA debajo.

---

## 3. Shell global

### 3.1 Sidebar
- 240px (colapsable a 56px).
- Fondo `--bg`, borde derecho `--border`.
- Secciones: WORKSPACE → ÁREAS (expandibles con árbol de proyectos) → SISTEMA.
- Item activo: fondo `--surface-1` + barra teal 2px izquierda + texto `--text-1`.
- Avatar de usuario + settings al pie.

### 3.2 Topbar
- 56px, borde inferior `--border`.
- Breadcrumb a la izquierda.
- Search global con ⌘K visible (clickable → abre command palette).
- Botón "Asistente IA" + stack de avatares + CTA primary "+ Nuevo".

---

## 4. Reglas duras (Do / Don't)

**Do**
- Usar teal solo en CTAs activos, links activos del sidebar, y elementos seleccionados (máx 2-3 por pantalla).
- Densidad alta tipo Linear (40px filas, 16-24px padding).
- Mono para fechas, IDs, tiempo y números.
- Iconos Lucide a 12-14px.

**Don't**
- ❌ Emojis decorativos en nombres de tareas.
- ❌ Gradientes morados/rosados saturados.
- ❌ Glassmorphism (backdrop-filter exagerado).
- ❌ Iconos Material / Font Awesome.
- ❌ Lorem ipsum.
- ❌ Más de 3 elementos teal por pantalla.

---

## 5. Pantallas entregadas (14)

1. Dashboard / Inicio
2. Vista de Proyecto — Lista
3. Vista de Proyecto — Kanban
4. Vista de Proyecto — Gantt
5. Calendario global
6. Mi día
7. Vista de Área
8. Detalle de tarea (slide-over)
9. Asistente IA
10. Reportes
11. Settings — Áreas y miembros
12. Command Palette (⌘K)
13. Empty states (galería)
14. Landing page pública

Navegación: sidebar + topbar persistentes en las 13 pantallas internas. Landing accesible desde el icono `globe` del topbar.

---

## 6. Datos mock (fijos)

- **Equipo**: Joaquín Rivera, Andrea Mendoza, Carlos Rojas, Sofía Vargas, Diego Aguilera.
- **Áreas**: Outlet Centro (teal), Sucursal Norte (azul), Edificio Corporativo (índigo), Bodega Sur (ámbar), Outlet Plaza (rosa).
- **Hoy**: 10 marzo 2026.
- **Tareas**: 16 en español, fechas variadas (algunas vencidas, hoy, esta semana, próximo mes).

---

## 7. Handoff a Claude Code

- Stack: React 18 + CSS variables nativas (sin Tailwind, sin styled-components).
- Tokens en `:root` de `styles.css`.
- Componentes standalone en `shell.jsx` (`Ico`, `Avatar`, `StatusPill`, `PriorityPill`, `AreaPill`, `PageHead`, `Donut`, `Spark`).
- Datos mock en `data.js` (reemplazar por API real).
- Atajo ⌘K cableado a `CmdK` overlay.
- Para producción: migrar a TypeScript + tree-shaken Lucide + tokens en design-tokens.json.
