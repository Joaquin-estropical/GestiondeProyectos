import { useState } from 'react';
import { Plus, CircleAlert, TriangleAlert, CircleCheck, ListTodo, Sparkles, ChevronDown, X, Search, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAreas, useProjects, useTasks, useMembers } from '@/hooks/useSupabase';
import { getMember, daysFromToday, fmtDate, dueColor } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, AreaPill } from '@/components/shared/Badges';
import { Donut, Spark } from '@/components/shared/Charts';
import { PageHead } from '@/components/shared/PageHead';
import { taskAccent, statusColor } from '@/lib/visual';
import { useAppStore } from '@/stores/app';
import type { Task, TaskStatus, TaskPriority } from '@/types';

// ── Filter bar ───────────────────────────────────────────
interface Filters {
  areaId:   string;
  assignee: string;
  status:   TaskStatus | '';
  priority: TaskPriority | '';
  search:   string;
}
const EMPTY_FILTERS: Filters = { areaId: '', assignee: '', status: '', priority: '', search: '' };

const STATUS_OPTS: { v: TaskStatus; l: string }[] = [
  { v: 'curso', l: 'En curso' }, { v: 'pend', l: 'Pendiente' },
  { v: 'rev',   l: 'En revisión' }, { v: 'block', l: 'Bloqueado' }, { v: 'done', l: 'Hecho' },
];
const PRIO_OPTS: { v: TaskPriority; l: string }[] = [
  { v: 'urg', l: 'Urgente' }, { v: 'alta', l: 'Alta' }, { v: 'med', l: 'Media' }, { v: 'baja', l: 'Baja' },
];

function FilterBar({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const { data: areas   = [] } = useAreas();
  const { data: members = [] } = useMembers();
  const active = Object.values(filters).some(v => v !== '');

  const sel = (k: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters({ ...filters, [k]: e.target.value });

  return (
    <div className="filter-bar" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="filter-search" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', height: 30, flex: '0 0 200px', minWidth: 0 }}>
        <Search size={12} color="var(--text-3)" />
        <input
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          placeholder="Buscar tarea..."
          style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 12.5, color: 'var(--text-1)' }}
        />
      </div>

      {[
        { label: 'Área',     key: 'areaId'   as const, opts: areas.map(a   => ({ v: a.id,   l: a.name   })) },
        { label: 'Persona',  key: 'assignee' as const, opts: members.map(m => ({ v: m.id,   l: m.name   })) },
        { label: 'Estado',   key: 'status'   as const, opts: STATUS_OPTS },
        { label: 'Prioridad',key: 'priority' as const, opts: PRIO_OPTS   },
      ].map(({ label, key, opts }) => (
        <div key={key} style={{ position: 'relative' }}>
          <select
            value={filters[key]}
            onChange={sel(key)}
            style={{
              height: 30, padding: '0 26px 0 10px', background: filters[key] ? 'var(--teal-bg)' : 'var(--surface-1)',
              border: `1px solid ${filters[key] ? 'rgba(20,184,166,.4)' : 'var(--border)'}`,
              borderRadius: 6, fontSize: 12.5, color: filters[key] ? 'var(--teal)' : 'var(--text-2)',
              cursor: 'pointer', outline: 'none', appearance: 'none', fontFamily: 'inherit',
            }}
          >
            <option value="">{label}</option>
            {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
          <ChevronDown size={11} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)' }} />
        </div>
      ))}

      {active && (
        <button className="btn btn-ghost btn-sm" onClick={() => setFilters(EMPTY_FILTERS)} style={{ gap: 4 }}>
          <X size={12} /> Limpiar
        </button>
      )}
    </div>
  );
}

function applyFilters(tasks: Task[], f: Filters): Task[] {
  return tasks.filter(t => {
    if (f.areaId   && t.area     !== f.areaId)   return false;
    if (f.assignee && t.assignee !== f.assignee)  return false;
    if (f.status   && t.status   !== f.status)    return false;
    if (f.priority && t.priority !== f.priority)  return false;
    if (f.search   && !t.title.toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  });
}


// ── Bloqueadas y en riesgo (datos reales) ─────────────
function AtRiskPanel({ tasks, members, onOpen }: {
  tasks: Task[];
  members: { id: string; name: string; short?: string }[];
  onOpen: (id: string) => void;
}) {
  const blocked = tasks.filter(t => t.status === 'block');
  const atRisk  = tasks.filter(t =>
    t.status !== 'done' && t.status !== 'block' &&
    daysFromToday(t.due) >= 0 && daysFromToday(t.due) <= 2
  );
  const items = [
    ...blocked.map(t => ({ t, kind: 'block' as const })),
    ...atRisk.map(t  => ({ t, kind: 'risk'  as const })),
  ].sort((a, b) => (a.t.due ?? '').localeCompare(b.t.due ?? ''));

  const resolveName = (id: string) => {
    const m = members.find(x => x.id === id) ?? getMember(id);
    return m ? (m.short ?? m.name.split(' ')[0]) : null;
  };

  return (
    <div className="card">
      <div className="card-head">
        <ShieldAlert size={14} color="var(--amber)" />
        <span className="title">Bloqueadas y en riesgo</span>
        <span className="micro" style={{ marginLeft: 'auto', color: items.length > 0 ? 'var(--amber)' : 'var(--text-3)' }}>
          {items.length} {items.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {items.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            <CircleCheck size={20} color="var(--green)" style={{ display: 'block', margin: '0 auto 8px' }} />
            Sin tareas bloqueadas ni en riesgo
          </div>
        ) : items.map(({ t, kind }, i) => {
          const days = daysFromToday(t.due);
          const isBlock = kind === 'block';
          const dueLbl = days < 0 ? `Venció ${fmtDate(t.due)}` : days === 0 ? 'Vence hoy' : `${days}d restantes`;
          const assigneeName = resolveName(t.assignee);
          const accent = taskAccent(t);
          return (
            <div
              key={t.id}
              onClick={() => onOpen(t.id)}
              style={{
                padding: '10px 18px 10px 15px',
                borderLeft: `3px solid ${accent.bar ?? 'transparent'}`,
                borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: accent.tint,
                transition: 'background .1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = accent.tint)}
            >
              {isBlock
                ? <CircleAlert size={14} color="var(--red)" style={{ flexShrink: 0 }} />
                : <TriangleAlert size={14} color="var(--amber)" style={{ flexShrink: 0 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </div>
                {assigneeName && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {assigneeName}
                  </div>
                )}
              </div>
              <span className="mono" style={{ fontSize: 11, color: isBlock ? 'var(--red)' : 'var(--amber)', flexShrink: 0, fontWeight: 600 }}>
                {isBlock ? 'BLOQUEADA' : dueLbl}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { openTask, openNewTask, currentUser } = useAppStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const { data: areas    = [] } = useAreas();
  const { data: projects = [] } = useProjects();
  const { data: tasks    = [] } = useTasks();
  const { data: members  = [] } = useMembers();

  const today = new Date().toISOString().slice(0, 10);

  // ── Personal (this user) ────────────────────────────────
  const myAll      = tasks.filter(t => t.assignee === currentUser.memberId);
  const myOverdue  = myAll.filter(t => t.status !== 'done' && t.due < today);
  const myTodayCnt = myAll.filter(t => t.status !== 'done' && daysFromToday(t.due) === 0).length;
  const myCurso    = myAll.filter(t => t.status === 'curso').length;
  const myDoneCnt  = myAll.filter(t => t.status === 'done').length;
  const myPending  = myAll
    .filter(t => t.status !== 'done')
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));

  // ── Team-wide (for secondary view) ──────────────────────
  const overdue    = tasks.filter(t => t.status !== 'done' && t.due < today);
  const atRisk     = tasks.filter(t => t.status !== 'done' && daysFromToday(t.due) <= 2 && daysFromToday(t.due) >= 0);
  const doneCount  = tasks.filter(t => t.status === 'done').length;
  const todayCount = tasks.filter(t => t.status !== 'done' && daysFromToday(t.due) === 0).length;

  const firstName = currentUser.name.split(' ')[0];

  const filtered  = applyFilters(tasks, filters);
  const hasFilter = Object.values(filters).some(v => v !== '');

  const STATUS_KEYS: TaskStatus[] = ['pend', 'curso', 'rev', 'block', 'done'];
  const areaLoad = areas.map(a => {
    const proj   = projects.filter(p => p.area === a.id);
    const atasks = tasks.filter(t => t.area === a.id);
    const open   = atasks.filter(t => t.status !== 'done').length;
    // Distribución de estados para el mini-donut
    const dist = STATUS_KEYS.map(s => ({
      value: atasks.filter(t => t.status === s).length,
      color: statusColor(s),
      name:  s,
    })).filter(d => d.value > 0);
    // Responsables top (por cantidad de tareas abiertas en el área)
    const counts = new Map<string, number>();
    atasks.filter(t => t.status !== 'done' && t.assignee).forEach(t => counts.set(t.assignee, (counts.get(t.assignee) ?? 0) + 1));
    const topAssignees = [...counts.entries()]
      .sort((x, y) => y[1] - x[1]).slice(0, 3)
      .map(([id]) => members.find(m => m.id === id) ?? getMember(id))
      .filter((m): m is NonNullable<typeof m> => !!m);
    return {
      ...a,
      projects:  proj.length,
      openTasks: open,
      progress:  Math.round(proj.reduce((s, p) => s + p.progress, 0) / Math.max(proj.length, 1)),
      dist,
      topAssignees,
    };
  });

  // Series de 7 días para los KPIs del equipo (tendencia). Cada punto = estado al
  // final de ese día relativo a hoy (−6 … 0). Calculado de las fechas existentes.
  const last7 = Array.from({ length: 7 }, (_, i) => i - 6); // [-6..0]
  const doneSeries    = last7.map(off => tasks.filter(t => t.status === 'done' && daysFromToday(t.due) <= off).length);
  const overdueSeries = last7.map(off => tasks.filter(t => t.status !== 'done' && daysFromToday(t.due) < off).length);
  const trend = (s: number[]) => s[s.length - 1] - s[0];

  return (
    <>
      <PageHead
        title={`Hola, ${firstName}`}
        subtitle={`${myPending.length} pendiente${myPending.length !== 1 ? 's' : ''} · ${myOverdue.length} vencida${myOverdue.length !== 1 ? 's' : ''}`}
        right={
          <div className="row gap-8">
            <button className="btn btn-primary btn-md" onClick={() => openNewTask()}><Plus size={14} /> Nueva tarea</button>
          </div>
        }
      />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Filters */}
        <FilterBar filters={filters} setFilters={setFilters} />

        {/* Filtered task list (when filters active) */}
        {hasFilter && (
          <div className="card">
            <div className="card-head">
              <span className="title">Resultados</span>
              <span className="micro" style={{ marginLeft: 'auto' }}>{filtered.length} tareas</span>
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '24px 18px', color: 'var(--text-3)', fontSize: 13 }}>Sin resultados para estos filtros.</div>
            )}
            {filtered.slice(0, 50).map(t => {
              const due    = daysFromToday(t.due);
              const dueLbl = due < 0 ? `Vencida · ${fmtDate(t.due)}` : due === 0 ? 'Hoy' : due === 1 ? 'Mañana' : fmtDate(t.due);
              const member = members.find(m => m.id === t.assignee) ?? getMember(t.assignee);
              const accent = taskAccent(t);
              return (
                <div
                  key={t.id}
                  onClick={() => openTask(t.id)}
                  style={{ padding: '10px 18px 10px 15px', borderLeft: `3px solid ${accent.bar ?? 'transparent'}`, background: accent.tint, borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span className={`check ${t.status === 'done' ? 'done' : ''}`}></span>
                  <span style={{ flex: 1, fontSize: 13.5 }}>{t.title}</span>
                  <AreaPill areaId={t.area} mini />
                  {member && <Avatar name={member.name} size={20} />}
                  <span className="mono" style={{ fontSize: 12, color: dueColor(t.due), minWidth: 0, textAlign: 'right' }}>{dueLbl}</span>
                  <StatusPill status={t.status} />
                </div>
              );
            })}
          </div>
        )}

        {/* KPIs personales */}
        {!hasFilter && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Mis para hoy',    val: myTodayCnt,      icon: <ListTodo size={13} />,     cls: '',        filter: 'today',   sub: 'asignadas para hoy'   },
              { label: 'Mis vencidas',    val: myOverdue.length, icon: <CircleAlert size={13} />,  cls: ' danger', filter: 'overdue', sub: 'requieren atención'    },
              { label: 'Mis en curso',    val: myCurso,         icon: <TriangleAlert size={13}/>, cls: ' warn',   filter: 'open',    sub: 'trabajando ahora'      },
              { label: 'Mis completadas', val: myDoneCnt,       icon: <CircleCheck size={13} />,  cls: ' ok',     filter: 'done',    sub: 'total completadas'     },
            ].map(kpi => (
              <div
                key={kpi.filter}
                className={`card kpi${kpi.cls}`}
                onClick={() => navigate(`/tareas?filter=${kpi.filter}&assignee=${currentUser.memberId}`)}
                style={{ cursor: 'pointer', transition: 'transform .1s, box-shadow .1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
              >
                <div className="lbl">{kpi.icon} {kpi.label}</div>
                <div className="val">{kpi.val}</div>
                <div className="sub">{kpi.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* AI summary */}
        {!hasFilter && (
          <div className="card" style={{ borderColor: 'rgba(20,184,166,.25)', background: 'linear-gradient(180deg, rgba(20,184,166,.04), transparent)' }}>
            <div className="card-pad">
              <div className="row gap-10 items-center">
                <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--teal-bg)', display: 'grid', placeItems: 'center', color: 'var(--teal)' }}>
                  <Sparkles size={14} />
                </span>
                <div className="fw-6">Resumen IA del día</div>
                <span className="micro" style={{ marginLeft: 'auto' }}>Datos en tiempo real</span>
              </div>
              <p className="ai-summary" style={{ margin: '14px 0 0', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.6, maxWidth: 780 }}>
                {myOverdue.length > 0
                  ? <>Tenés <span className="fw-6">{myOverdue.length} tarea{myOverdue.length > 1 ? 's' : ''} vencida{myOverdue.length > 1 ? 's' : ''}</span> asignada{myOverdue.length > 1 ? 's' : ''} a vos.</>
                  : myPending.length > 0
                    ? <>Tenés <span className="fw-6">{myPending.length} tarea{myPending.length > 1 ? 's' : ''} pendiente{myPending.length > 1 ? 's' : ''}</span>.</>
                    : '¡Sin pendientes! Todo al día.'}
                {myTodayCnt > 0 && <> <span className="fw-6">{myTodayCnt}</span> {myTodayCnt > 1 ? 'vencen' : 'vence'} hoy.</>}
                {tasks.length === 0 && ' Aún no hay tareas en el sistema — empezá creando la primera.'}
              </p>
            </div>
          </div>
        )}

        {/* Two columns */}
        {!hasFilter && (
          <div className="grid dash-two-col" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <span className="title">Mis tareas pendientes</span>
                <span className="micro" style={{ marginLeft: 'auto' }}>{myPending.length} pendiente{myPending.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                {myPending.map(t => {
                  const due    = daysFromToday(t.due);
                  const dueLbl = due < 0 ? `Vencida · ${fmtDate(t.due)}` : due === 0 ? 'Hoy' : due === 1 ? 'Mañana' : fmtDate(t.due);
                  const accent = taskAccent(t);
                  return (
                    <div
                      key={t.id}
                      onClick={() => openTask(t.id)}
                      style={{ padding: '10px 18px 10px 15px', borderLeft: `3px solid ${accent.bar ?? 'transparent'}`, background: accent.tint, borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span className="check"></span>
                      <span style={{ flex: 1, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      <AreaPill areaId={t.area} mini />
                      <span className="mono" style={{ fontSize: 12, color: dueColor(t.due), minWidth: 0, textAlign: 'right', flexShrink: 0 }}>{dueLbl}</span>
                      <StatusPill status={t.status} />
                    </div>
                  );
                })}
                {myPending.length === 0 && (
                  <div style={{ padding: '32px 18px', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
                    {tasks.length === 0 ? 'Aún no hay tareas. ¡Crea la primera!' : '¡Sin pendientes! Todo al día.'}
                  </div>
                )}
              </div>
            </div>

            <AtRiskPanel tasks={tasks} members={members} onOpen={openTask} />
          </div>
        )}

        {/* Areas */}
        {!hasFilter && areaLoad.length > 0 && (
          <div>
            <div className="section-title">Áreas más activas</div>
            <div className="grid areas-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {areaLoad.map(a => (
                <div
                  key={a.id}
                  className="card card-pad"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/area/${a.id}`)}
                >
                  <div className="row gap-8 items-center">
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: a.color, display: 'grid', placeItems: 'center', color: '#0A0A0B', fontSize: 9 }}>
                      {a.name.slice(0, 1)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  </div>
                  <div className="row items-center gap-12 mt-12">
                    {a.dist.length > 0 ? (
                      <Donut data={a.dist} size={46} stroke={7} center={a.openTasks} centerSize={13} />
                    ) : (
                      <div style={{ width: 46, height: 46, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row between items-center">
                        <span className="micro">{a.projects} proy.</span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-1)' }}>{a.progress}%</span>
                      </div>
                      <div className="progress mt-8">
                        <div style={{ width: a.progress + '%', background: a.color }}></div>
                      </div>
                      <div className="row items-center between mt-8">
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.openTasks} abiertas</span>
                        {a.topAssignees.length > 0 && (
                          <span className="avatar-stack">
                            {a.topAssignees.map(m => <Avatar key={m.id} name={m.name} size={18} title={m.name} />)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vista global del equipo (contexto secundario) */}
        {!hasFilter && tasks.length > 0 && (
          <div>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Vista global del equipo</span>
              <span className="micro" style={{ color: 'var(--text-3)', fontWeight: 400 }}>· todas las tareas, todos los responsables</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: 'Hoy del equipo', val: todayCount,     color: 'var(--text-2)', spark: null,          trend: 0,                   good: 'down' as const },
                { label: 'Vencidas',        val: overdue.length, color: 'var(--red)',   spark: overdueSeries, trend: trend(overdueSeries), good: 'down' as const },
                { label: 'En riesgo (48h)', val: atRisk.length,  color: 'var(--amber)', spark: null,          trend: 0,                   good: 'down' as const },
                { label: 'Completadas',     val: doneCount,      color: 'var(--green)', spark: doneSeries,    trend: trend(doneSeries),    good: 'up' as const   },
              ].map((kpi, i) => {
                // Color de la flecha: verde si la tendencia es "buena", rojo si es "mala"
                const dir = kpi.trend === 0 ? null : kpi.trend > 0 ? 'up' : 'down';
                const goodDir = dir && dir === kpi.good;
                const arrowColor = !dir ? 'var(--text-3)' : goodDir ? 'var(--green)' : 'var(--red)';
                return (
                  <div
                    key={i}
                    className="card"
                    onClick={() => navigate('/tareas?filter=' + ['today', 'overdue', 'at_risk', 'done'][i])}
                    style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{kpi.label}</span>
                      <span style={{ fontSize: 20, fontWeight: 700, color: kpi.color, fontFamily: 'JetBrains Mono, monospace' }}>{kpi.val}</span>
                    </div>
                    {kpi.spark && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Spark data={kpi.spark} w={72} h={20} color={kpi.color} />
                        {dir && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: 11, color: arrowColor, fontFamily: 'JetBrains Mono, monospace' }}>
                            {dir === 'up' ? '▲' : '▼'}{Math.abs(kpi.trend)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasFilter && tasks.length === 0 && areas.length === 0 && (
          <div className="empty" style={{ marginTop: 20 }}>
            <div className="ill"><Plus size={22} /></div>
            <p className="t">Workspace listo para usar</p>
            <p className="d">Empezá creando tu primera área y proyecto. Todo lo que crees se guardará en Supabase.</p>
            <button className="btn btn-primary btn-md" onClick={() => openNewTask()}>
              <Plus size={14} /> Crear primera tarea
            </button>
          </div>
        )}
      </div>
    </>
  );
}
