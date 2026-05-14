import type { Area, Member, Project, Task, ActivityItem, InboxItem } from '@/types'

export const TODAY = new Date().toISOString().slice(0, 10)

export const AREAS: Area[] = [
  { id: 'outlet', name: 'Outlet Centro',        color: '#14B8A6', icon: 'store',     slug: 'outlet-centro',  type: 'outlet',   description: null },
  { id: 'norte',  name: 'Sucursal Norte',       color: '#3B82F6', icon: 'map-pin',   slug: 'sucursal-norte', type: 'sucursal', description: null },
  { id: 'corp',   name: 'Edificio Corporativo', color: '#6366F1', icon: 'building-2',slug: 'corporativo',    type: 'edificio', description: null },
  { id: 'bodega', name: 'Bodega Sur',           color: '#F59E0B', icon: 'warehouse', slug: 'bodega-sur',     type: 'bodega',   description: null },
  { id: 'plaza',  name: 'Outlet Plaza',         color: '#EC4899', icon: 'store',     slug: 'outlet-plaza',   type: 'outlet',   description: null },
]

export const TEAM: Member[] = [
  { id: 'joa', name: 'Joaquin Abastoflor', role: 'Jefe de Proyectos',          short: 'Joaquin A.' },
  { id: 'fab', name: 'Fabio Jimenez',      role: 'Coordinador Administrativo', short: 'Fabio J.'   },
  { id: 'mar', name: 'Marcelo Jaldin',     role: 'Director de Finanzas',        short: 'Marcelo J.' },
]

export const PROJECTS: Project[] = [
  { id: 'p1', name: 'Remodelación local',   area: 'outlet',  due: '2026-03-28', progress: 67, count: 12 },
  { id: 'p2', name: 'Inventario Q2',        area: 'outlet',  due: '2026-04-15', progress: 28, count: 9  },
  { id: 'p3', name: 'Apertura zona este',   area: 'norte',   due: '2026-05-20', progress: 41, count: 14 },
  { id: 'p4', name: 'Auditoría seguridad',  area: 'corp',    due: '2026-03-30', progress: 80, count: 6  },
  { id: 'p5', name: 'Migración POS',        area: 'corp',    due: '2026-04-10', progress: 22, count: 11 },
  { id: 'p6', name: 'Inventario Q2 Sur',    area: 'bodega',  due: '2026-04-15', progress: 43, count: 7  },
  { id: 'p7', name: 'Capacitación turnos',  area: 'bodega',  due: '2026-03-22', progress: 60, count: 5  },
  { id: 'p8', name: 'Apertura Plaza',       area: 'plaza',   due: '2026-06-01', progress: 12, count: 8  },
]

const T = (o: Omit<Task, 'description' | 'start_date' | 'tags' | 'helper'>): Task =>
  ({ ...o, description: null, start_date: null, helper: null, tags: [] })

export const TASKS: Task[] = [
  T({ id: 't1',  code: 'OT-1847', title: 'Cotizar proveedores de iluminación LED',        project: 'p1', area: 'outlet', assignee: 'and', due: '2026-03-12', priority: 'alta', status: 'curso',  time: '02:14', comments: 4, subtasks: { done: 2, total: 5 } }),
  T({ id: 't2',  code: 'OT-1848', title: 'Revisar permisos municipales obra mayor',       project: 'p1', area: 'outlet', assignee: 'car', due: '2026-03-15', priority: 'alta', status: 'pend',   time: '00:00', comments: 1, subtasks: { done: 0, total: 3 } }),
  T({ id: 't3',  code: 'OT-1849', title: 'Coordinar visita arquitecto martes',            project: 'p1', area: 'outlet', assignee: 'joa', due: '2026-03-08', priority: 'urg',  status: 'curso',  time: '01:32', comments: 7, subtasks: { done: 1, total: 2 } }),
  T({ id: 't4',  code: 'OT-1850', title: 'Aprobar paleta de colores zona ventas',         project: 'p1', area: 'outlet', assignee: 'sof', due: '2026-03-18', priority: 'med',  status: 'pend',   time: '00:00', comments: 2, subtasks: { done: 0, total: 0 } }),
  T({ id: 't5',  code: 'OT-1851', title: 'Negociar contrato pintura interiores',          project: 'p1', area: 'outlet', assignee: 'and', due: '2026-03-20', priority: 'med',  status: 'rev',    time: '03:21', comments: 5, subtasks: { done: 3, total: 4 } }),
  T({ id: 't6',  code: 'OT-1852', title: 'Solicitar planos eléctricos al ingeniero',      project: 'p1', area: 'outlet', assignee: 'car', due: '2026-03-25', priority: 'alta', status: 'block',  time: '00:45', comments: 3, subtasks: { done: 0, total: 2 } }),
  T({ id: 't7',  code: 'OT-1853', title: 'Instalar nuevo sistema de seguridad',           project: 'p1', area: 'outlet', assignee: 'car', due: '2026-02-28', priority: 'med',  status: 'done',   time: '06:12', comments: 8, subtasks: { done: 5, total: 5 } }),
  T({ id: 't8',  code: 'OT-1854', title: 'Capacitar personal nuevo turno tarde',          project: 'p7', area: 'bodega', assignee: 'and', due: '2026-03-05', priority: 'baja', status: 'done',   time: '04:12', comments: 2, subtasks: { done: 4, total: 4 } }),
  T({ id: 't9',  code: 'OT-1855', title: 'Conciliar inventario físico vs sistema',        project: 'p2', area: 'outlet', assignee: 'die', due: '2026-03-12', priority: 'alta', status: 'curso',  time: '01:48', comments: 3, subtasks: { done: 1, total: 6 } }),
  T({ id: 't10', code: 'OT-1856', title: 'Auditoría protocolos seguridad bodega',         project: 'p4', area: 'corp',   assignee: 'car', due: '2026-03-30', priority: 'alta', status: 'curso',  time: '00:35', comments: 1, subtasks: { done: 0, total: 4 } }),
  T({ id: 't11', code: 'OT-1857', title: 'Migración datos POS sucursal norte',            project: 'p5', area: 'corp',   assignee: 'die', due: '2026-04-10', priority: 'urg',  status: 'curso',  time: '04:58', comments: 6, subtasks: { done: 2, total: 8 } }),
  T({ id: 't12', code: 'OT-1858', title: 'Revisar layout góndolas zona este',             project: 'p3', area: 'norte',  assignee: 'sof', due: '2026-03-14', priority: 'med',  status: 'rev',    time: '02:02', comments: 4, subtasks: { done: 2, total: 3 } }),
  T({ id: 't13', code: 'OT-1859', title: 'Coordinar entrega mobiliario marca',            project: 'p3', area: 'norte',  assignee: 'and', due: '2026-03-09', priority: 'alta', status: 'pend',   time: '00:00', comments: 2, subtasks: { done: 0, total: 0 } }),
  T({ id: 't14', code: 'OT-1860', title: 'Definir KPIs apertura sucursal',               project: 'p3', area: 'norte',  assignee: 'joa', due: '2026-03-10', priority: 'med',  status: 'curso',  time: '00:52', comments: 1, subtasks: { done: 0, total: 0 } }),
  T({ id: 't15', code: 'OT-1861', title: 'Cotizar señalética interior y exterior',        project: 'p3', area: 'norte',  assignee: 'sof', due: '2026-03-18', priority: 'med',  status: 'pend',   time: '00:00', comments: 0, subtasks: { done: 0, total: 0 } }),
  T({ id: 't16', code: 'OT-1862', title: 'Revisar inventario sistema POS',               project: 'p6', area: 'bodega', assignee: 'die', due: '2026-03-11', priority: 'alta', status: 'curso',  time: '02:31', comments: 3, subtasks: { done: 1, total: 4 } }),
  T({ id: 't17', code: 'OT-1863', title: 'Backup completo base de datos POS',            project: 'p5', area: 'corp',   assignee: 'die', due: '2026-03-10', priority: 'urg',  status: 'rev',    time: '01:14', comments: 2, subtasks: { done: 1, total: 1 } }),
  T({ id: 't18', code: 'OT-1864', title: 'Validar plan emergencia bodega',               project: 'p4', area: 'corp',   assignee: 'car', due: '2026-03-16', priority: 'med',  status: 'pend',   time: '00:00', comments: 1, subtasks: { done: 0, total: 0 } }),
]

export const ACTIVITY: ActivityItem[] = [
  { who: 'joa', action: 'creó',                          target: 'Primera tarea del sistema',    when: 'hace 12 min', kind: 'create'  },
  { who: 'fab', action: 'actualizó el estado en',        target: 'Revisión de inventario Q2',    when: 'hace 38 min', kind: 'comment' },
  { who: 'mar', action: 'cambió estado a Bloqueado en',  target: 'Auditoría de presupuesto',     when: 'hace 1 h',    kind: 'block'   },
  { who: 'joa', action: 'completó',                      target: 'Reunión de kick-off',          when: 'hace 2 h',    kind: 'done'    },
  { who: 'fab', action: 'creó',                          target: 'Plan de expansión Outlets',    when: 'hace 3 h',    kind: 'create'  },
  { who: 'mar', action: 'movió a En revisión',           target: 'Informe mensual de finanzas',  when: 'hace 4 h',    kind: 'move'    },
]

export const INBOX_ITEMS: InboxItem[] = [
  { id: 1, kind: 'block',   read: false, title: 'Bloqueo detectado · Migración POS sucursal norte', body: 'Tarea sin avance hace 48h. Asignada a Carlos R. Recomiendo escalar a Diego A. o reasignar a Andrea M. (con capacidad).', when: 'hace 12 min', target: 't8'  },
  { id: 2, kind: 'risk',    read: false, title: '2 tareas vencidas en Outlet Centro',               body: 'Cotizar proveedores LED y Revisar permisos obra mayor pasaron su fecha límite ayer. Sugiero replanificar a +3 días.',   when: 'hace 38 min', target: 't1'  },
  { id: 3, kind: 'summary', read: false, title: 'Resumen diario · 10 mar 2026',                    body: '18 tareas abiertas. 2 vencidas, 3 en riesgo, 24 completadas la semana pasada (+15%). Bodega Sur bajó ritmo de cierre.', when: 'hoy 08:00',   target: null  },
  { id: 4, kind: 'load',    read: true,  title: 'Sobrecarga de Carlos R.',                          body: '7 tareas abiertas, 2 bloqueadas. Andrea M. tiene 5 y va al día. Mover auditoría de protocolos.',                       when: 'ayer 17:42',  target: null  },
  { id: 5, kind: 'win',     read: true,  title: 'Hito alcanzado · Remodelación 67%',               body: 'El proyecto pasó la marca de 2/3. Próximo hito crítico: aprobación municipal (mar 15).',                               when: 'ayer 14:10',  target: null  },
  { id: 6, kind: 'report',  read: true,  title: 'Reporte semanal listo',                           body: 'Semana 10 · carga, % completado por área, evolución. Listo para enviar a dirección.',                                  when: 'lun 09:00',   target: null  },
]

// ── Helpers ──
export const MONTHS_ES    = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
export const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export const DAYS_ES      = ['lun','mar','mié','jue','vie','sáb','dom']

export const STATUS_LABELS: Record<string, string> = {
  curso: 'En curso',
  pend:  'Sin iniciar',
  rev:   'En revisión',
  block: 'Bloqueado',
  done:  'Completado',
}
export const STATUS_ORDER = ['curso', 'pend', 'rev', 'block', 'done'] as const
export const PRIORITY_LABELS: Record<string, string> = {
  urg: 'Urgente', alta: 'Alta', med: 'Media', baja: 'Baja',
}

export function getArea(id: string) { return AREAS.find(a => a.id === id) }
export function getMember(id: string) { return TEAM.find(m => m.id === id) }
export function getProject(id: string) { return PROJECTS.find(p => p.id === id) }

export function avatarColor(name: string): string {
  const palette = ['#14B8A6','#3B82F6','#6366F1','#F59E0B','#EC4899','#22C55E','#A78BFA','#F97316']
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h * 31 + name.charCodeAt(i)) >>> 0)
  return palette[h % palette.length]
}

export function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
}

export function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T12:00:00')
  const year = d.getFullYear()
  const thisYear = new Date().getFullYear()
  return d.getDate() + ' ' + MONTHS_ES[d.getMonth()] + (year !== thisYear ? ' ' + year : '')
}

export function daysFromToday(iso: string): number {
  const a = new Date(TODAY + 'T00:00:00')
  const b = new Date(iso + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function dueColor(iso: string): string {
  const d = daysFromToday(iso)
  if (d < 0) return 'var(--red)'
  if (d <= 1) return 'var(--amber)'
  return 'var(--text-2)'
}
