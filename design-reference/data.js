// ════════════ Mock data · Operaciones Tropical ════════════

window.AREAS = [
  { id: 'outlet',  name: 'Outlet Centro',        color: '#14B8A6', icon: 'store',       slug: 'outlet-centro' },
  { id: 'norte',   name: 'Sucursal Norte',       color: '#3B82F6', icon: 'store',       slug: 'sucursal-norte' },
  { id: 'corp',    name: 'Edificio Corporativo', color: '#6366F1', icon: 'building-2',  slug: 'corporativo' },
  { id: 'bodega',  name: 'Bodega Sur',           color: '#F59E0B', icon: 'warehouse',   slug: 'bodega-sur' },
  { id: 'plaza',   name: 'Outlet Plaza',         color: '#EC4899', icon: 'store',       slug: 'outlet-plaza' },
];

window.TEAM = [
  { id: 'joa', name: 'Joaquín Rivera',  role: 'Director ops',    short: 'Joaquín R.' },
  { id: 'and', name: 'Andrea Mendoza',  role: 'Ops manager',     short: 'Andrea M.' },
  { id: 'car', name: 'Carlos Rojas',    role: 'Maintenance',     short: 'Carlos R.' },
  { id: 'sof', name: 'Sofía Vargas',    role: 'Visual merch',    short: 'Sofía V.' },
  { id: 'die', name: 'Diego Soto',      role: 'Inventory lead',  short: 'Diego S.' },
];

window.PROJECTS = [
  { id: 'p1', name: 'Remodelación local',   area: 'outlet',  due: '2026-03-28', progress: 67, count: 12 },
  { id: 'p2', name: 'Inventario Q2',        area: 'outlet',  due: '2026-04-15', progress: 28, count: 9  },
  { id: 'p3', name: 'Apertura zona este',   area: 'norte',   due: '2026-05-20', progress: 41, count: 14 },
  { id: 'p4', name: 'Auditoría seguridad',  area: 'corp',    due: '2026-03-30', progress: 80, count: 6  },
  { id: 'p5', name: 'Migración POS',        area: 'corp',    due: '2026-04-10', progress: 22, count: 11 },
  { id: 'p6', name: 'Inventario Q2 Sur',    area: 'bodega',  due: '2026-04-15', progress: 43, count: 7  },
  { id: 'p7', name: 'Capacitación turnos',  area: 'bodega',  due: '2026-03-22', progress: 60, count: 5  },
  { id: 'p8', name: 'Apertura Plaza',       area: 'plaza',   due: '2026-06-01', progress: 12, count: 8  },
];

// Today reference: 10 mar 2026
window.TODAY = '2026-03-10';

window.TASKS = [
  { id: 't1',  code: 'OT-1847', title: 'Cotizar proveedores de iluminación LED', project: 'p1', area: 'outlet', assignee: 'and', due: '2026-03-12', priority: 'alta', status: 'curso',  time: '02:14', comments: 4, subtasks: { done: 2, total: 5 } },
  { id: 't2',  code: 'OT-1848', title: 'Revisar permisos municipales obra mayor', project: 'p1', area: 'outlet', assignee: 'car', due: '2026-03-15', priority: 'alta', status: 'pend',   time: '00:00', comments: 1, subtasks: { done: 0, total: 3 } },
  { id: 't3',  code: 'OT-1849', title: 'Coordinar visita arquitecto martes',      project: 'p1', area: 'outlet', assignee: 'joa', due: '2026-03-08', priority: 'urg',  status: 'curso',  time: '01:32', comments: 7, subtasks: { done: 1, total: 2 } },
  { id: 't4',  code: 'OT-1850', title: 'Aprobar paleta de colores zona ventas',   project: 'p1', area: 'outlet', assignee: 'sof', due: '2026-03-18', priority: 'med',  status: 'pend',   time: '00:00', comments: 2, subtasks: { done: 0, total: 0 } },
  { id: 't5',  code: 'OT-1851', title: 'Negociar contrato pintura interiores',    project: 'p1', area: 'outlet', assignee: 'and', due: '2026-03-20', priority: 'med',  status: 'rev',    time: '03:21', comments: 5, subtasks: { done: 3, total: 4 } },
  { id: 't6',  code: 'OT-1852', title: 'Solicitar planos eléctricos al ingeniero',project: 'p1', area: 'outlet', assignee: 'car', due: '2026-03-25', priority: 'alta', status: 'block',  time: '00:45', comments: 3, subtasks: { done: 0, total: 2 } },
  { id: 't7',  code: 'OT-1853', title: 'Instalar nuevo sistema de seguridad',     project: 'p1', area: 'outlet', assignee: 'car', due: '2026-02-28', priority: 'med',  status: 'done',   time: '06:12', comments: 8, subtasks: { done: 5, total: 5 } },
  { id: 't8',  code: 'OT-1854', title: 'Capacitar personal nuevo turno tarde',    project: 'p7', area: 'bodega', assignee: 'and', due: '2026-03-05', priority: 'baja', status: 'done',   time: '04:12', comments: 2, subtasks: { done: 4, total: 4 } },
  { id: 't9',  code: 'OT-1855', title: 'Conciliar inventario físico vs sistema',  project: 'p2', area: 'outlet', assignee: 'die', due: '2026-03-12', priority: 'alta', status: 'curso',  time: '01:48', comments: 3, subtasks: { done: 1, total: 6 } },
  { id: 't10', code: 'OT-1856', title: 'Auditoría protocolos seguridad bodega',   project: 'p4', area: 'corp',   assignee: 'car', due: '2026-03-30', priority: 'alta', status: 'curso',  time: '00:35', comments: 1, subtasks: { done: 0, total: 4 } },
  { id: 't11', code: 'OT-1857', title: 'Migración datos POS sucursal norte',      project: 'p5', area: 'corp',   assignee: 'die', due: '2026-04-10', priority: 'urg',  status: 'curso',  time: '04:58', comments: 6, subtasks: { done: 2, total: 8 } },
  { id: 't12', code: 'OT-1858', title: 'Revisar layout góndolas zona este',       project: 'p3', area: 'norte',  assignee: 'sof', due: '2026-03-14', priority: 'med',  status: 'rev',    time: '02:02', comments: 4, subtasks: { done: 2, total: 3 } },
  { id: 't13', code: 'OT-1859', title: 'Coordinar entrega mobiliario marca',      project: 'p3', area: 'norte',  assignee: 'and', due: '2026-03-09', priority: 'alta', status: 'pend',   time: '00:00', comments: 2, subtasks: { done: 0, total: 0 } },
  { id: 't14', code: 'OT-1860', title: 'Definir KPIs apertura sucursal',          project: 'p3', area: 'norte',  assignee: 'joa', due: '2026-03-10', priority: 'med',  status: 'curso',  time: '00:52', comments: 1, subtasks: { done: 0, total: 0 } },
  { id: 't15', code: 'OT-1861', title: 'Cotizar señalética interior y exterior',  project: 'p3', area: 'norte',  assignee: 'sof', due: '2026-03-18', priority: 'med',  status: 'pend',   time: '00:00', comments: 0, subtasks: { done: 0, total: 0 } },
  { id: 't16', code: 'OT-1862', title: 'Revisar inventario sistema POS',          project: 'p6', area: 'bodega', assignee: 'die', due: '2026-03-11', priority: 'alta', status: 'curso',  time: '02:31', comments: 3, subtasks: { done: 1, total: 4 } },
  { id: 't17', code: 'OT-1863', title: 'Backup completo base de datos POS',       project: 'p5', area: 'corp',   assignee: 'die', due: '2026-03-10', priority: 'urg',  status: 'rev',    time: '01:14', comments: 2, subtasks: { done: 1, total: 1 } },
  { id: 't18', code: 'OT-1864', title: 'Validar plan emergencia bodega',          project: 'p4', area: 'corp',   assignee: 'car', due: '2026-03-16', priority: 'med',  status: 'pend',   time: '00:00', comments: 1, subtasks: { done: 0, total: 0 } },
];

window.ACTIVITY = [
  { who: 'and', action: 'completó', target: 'Capacitar personal nuevo turno tarde', when: 'hace 12 min', kind: 'done' },
  { who: 'die', action: 'comentó en', target: 'Migración datos POS sucursal norte', when: 'hace 38 min', kind: 'comment' },
  { who: 'car', action: 'cambió estado a Bloqueado en', target: 'Solicitar planos eléctricos al ingeniero', when: 'hace 1 h', kind: 'block' },
  { who: 'sof', action: 'asignó a Andrea Mendoza en', target: 'Negociar contrato pintura interiores', when: 'hace 2 h', kind: 'assign' },
  { who: 'joa', action: 'creó', target: 'Definir KPIs apertura sucursal', when: 'hace 3 h', kind: 'create' },
  { who: 'and', action: 'movió a En revisión', target: 'Revisar layout góndolas zona este', when: 'hace 4 h', kind: 'move' },
];

// ── Helpers ──
window.byId = function(coll, id) { return coll.find(x => x.id === id); };
window.AREA = function(id) { return window.AREAS.find(a => a.id === id); };
window.MEMBER = function(id) { return window.TEAM.find(m => m.id === id); };
window.PROJECT = function(id) { return window.PROJECTS.find(p => p.id === id); };

window.avatarColor = function(name) {
  const palette = ['#14B8A6','#3B82F6','#6366F1','#F59E0B','#EC4899','#22C55E','#A78BFA','#F97316'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};
window.initials = function(name) {
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
};

window.MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
window.DAYS_ES   = ['lun','mar','mié','jue','vie','sáb','dom'];

window.fmtDate = function(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.getDate() + ' ' + window.MONTHS_ES[d.getMonth()];
};
window.daysFromToday = function(iso) {
  const a = new Date(window.TODAY + 'T00:00:00');
  const b = new Date(iso + 'T00:00:00');
  return Math.round((b - a) / 86400000);
};
window.dueColor = function(iso) {
  const d = window.daysFromToday(iso);
  if (d < 0) return 'var(--red)';
  if (d <= 1) return 'var(--amber)';
  return 'var(--text-2)';
};

window.STATUS_LABELS = {
  curso: 'En curso',
  pend:  'Pendiente',
  rev:   'En revisión',
  block: 'Bloqueado',
  done:  'Hecho',
};
window.STATUS_ORDER = ['curso','pend','rev','block','done'];
window.PRIORITY_LABELS = { urg: 'Urgente', alta: 'Alta', med: 'Media', baja: 'Baja' };
