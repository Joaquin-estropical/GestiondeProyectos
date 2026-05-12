import { useState } from 'react';
import { Plus, ArrowRight, CircleAlert, TriangleAlert, CircleCheck, ListTodo, Sparkles, ChevronDown, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAreas, useProjects, useTasks, useMembers } from '@/hooks/useSupabase';
import { getMember, daysFromToday, fmtDate, dueColor, ACTIVITY } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, AreaPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
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
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', height: 30, flex: '0 0 220px' }}>
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

// ── Activity icon (kept local) ─────────────────────────
function activityIcon(k: string) {
  if (k === 'done')   return <CircleCheck size={14} color="var(--green)" />;
  if (k === 'block')  return <CircleAlert size={14} color="var(--red)" />;
  if (k === 'create') return <Plus size={14} color="var(--teal)" />;
  return <ArrowRight size={14} color="var(--text-2)" />;
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
  const overdue  = tasks.filter(t => t.status !== 'done' && t.due < today);
  const atRisk   = tasks.filter(t => t.status !== 'done' && daysFromToday(t.due) <= 2 && daysFromToday(t.due) >= 0);
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const todayCount = tasks.filter(t => t.status !== 'done' && daysFromToday(t.due) === 0).length;

  const myTasks  = tasks.filter(t => t.assignee === currentUser.id && t.status !== 'done').slice(0, 5);
  const firstName = currentUser.name.split(' ')[0];

  const filtered  = applyFilters(tasks, filters);
  const hasFilter = Object.values(filters).some(v => v !== '');

  const areaLoad = areas.map(a => {
    const proj   = projects.filter(p => p.area === a.id);
    const atasks = tasks.filter(t => t.area === a.id);
    const open   = atasks.filter(t => t.status !== 'done').length;
    return {
      ...a,
      projects:  proj.length,
      openTasks: open,
      progress:  Math.round(proj.reduce((s, p) => s + p.progress, 0) / Math.max(proj.length, 1)),
    };
  });

  return (
    <>
      <PageHead
        title={`Hola, ${firstName}`}
        subtitle={`${areas.length} áreas activas · ${tasks.filter(t => t.status !== 'done').length} tareas abiertas`}
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
              return (
                <div
                  key={t.id}
                  onClick={() => openTask(t.id)}
                  style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span className={`check ${t.status === 'done' ? 'done' : ''}`}></span>
                  <span style={{ flex: 1, fontSize: 13.5 }}>{t.title}</span>
                  <AreaPill areaId={t.area} mini />
                  {member && <Avatar name={member.name} size={20} />}
                  <span className="mono" style={{ fontSize: 12, color: dueColor(t.due), minWidth: 80, textAlign: 'right' }}>{dueLbl}</span>
                  <StatusPill status={t.status} />
                </div>
              );
            })}
          </div>
        )}

        {/* KPIs */}
        {!hasFilter && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="card kpi">
              <div className="lbl"><ListTodo size={13} /> Tareas hoy</div>
              <div className="val">{todayCount}</div>
              <div className="sub">asignadas para hoy</div>
            </div>
            <div className="card kpi danger">
              <div className="lbl"><CircleAlert size={13} /> Vencidas</div>
              <div className="val">{overdue.length}</div>
              <div className="sub">requieren atención</div>
            </div>
            <div className="card kpi warn">
              <div className="lbl"><TriangleAlert size={13} /> En riesgo</div>
              <div className="val">{atRisk.length}</div>
              <div className="sub">vencen en 48h</div>
            </div>
            <div className="card kpi ok">
              <div className="lbl"><CircleCheck size={13} /> Completadas</div>
              <div className="val">{doneCount}</div>
              <div className="sub">total completadas</div>
            </div>
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
              <p style={{ margin: '14px 0 0', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.6, maxWidth: 780 }}>
                {overdue.length > 0
                  ? <>Tenés <span className="fw-6">{overdue.length} tarea{overdue.length > 1 ? 's' : ''} vencida{overdue.length > 1 ? 's' : ''}</span> que requieren atención.</>
                  : 'Todas las tareas están al día.'}
                {atRisk.length > 0 && <> Hay <span className="fw-6">{atRisk.length} tarea{atRisk.length > 1 ? 's' : ''}</span> que vence{atRisk.length > 1 ? 'n' : ''} en las próximas 48h.</>}
                {tasks.length === 0 && ' Aún no hay tareas en el sistema — empezá creando la primera.'}
              </p>
            </div>
          </div>
        )}

        {/* Two columns */}
        {!hasFilter && (
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <span className="title">Mis tareas</span>
                <span className="micro" style={{ marginLeft: 'auto' }}>{myTasks.length} pendientes</span>
              </div>
              <div>
                {myTasks.map(t => {
                  const due    = daysFromToday(t.due);
                  const dueLbl = due < 0 ? `Vencida · ${fmtDate(t.due)}` : due === 0 ? 'Hoy' : due === 1 ? 'Mañana' : fmtDate(t.due);
                  return (
                    <div
                      key={t.id}
                      onClick={() => openTask(t.id)}
                      style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span className="check"></span>
                      <span style={{ flex: 1, fontSize: 13.5 }}>{t.title}</span>
                      <AreaPill areaId={t.area} mini />
                      <span className="mono" style={{ fontSize: 12, color: dueColor(t.due), minWidth: 80, textAlign: 'right' }}>{dueLbl}</span>
                      <StatusPill status={t.status} />
                    </div>
                  );
                })}
                {myTasks.length === 0 && (
                  <div style={{ padding: '24px 18px', color: 'var(--text-3)', fontSize: 13 }}>
                    {tasks.length === 0 ? 'Aún no hay tareas. ¡Crea la primera!' : 'Sin tareas asignadas a vos.'}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <span className="title">Actividad reciente</span>
              </div>
              <div style={{ padding: '8px 18px 12px' }}>
                {tasks.length === 0 ? (
                  <div style={{ padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>Sin actividad todavía.</div>
                ) : ACTIVITY.map((a, i) => {
                  const m = getMember(a.who)!;
                  return (
                    <div
                      key={i}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--border)' : '' }}
                    >
                      <Avatar name={m.name} size={22} />
                      <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5 }}>
                        <span className="fw-5">{m.short}</span> <span className="text-2">{a.action}</span> <span className="fw-5">{a.target}</span>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.when}</div>
                      </div>
                      <span style={{ marginTop: 2 }}>{activityIcon(a.kind)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Areas */}
        {!hasFilter && areaLoad.length > 0 && (
          <div>
            <div className="section-title">Áreas más activas</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
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
                  <div className="row between items-center mt-12">
                    <span className="micro">{a.projects} proyectos</span>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text-1)' }}>{a.progress}%</span>
                  </div>
                  <div className="progress mt-8">
                    <div style={{ width: a.progress + '%', background: a.color }}></div>
                  </div>
                  <div className="mono mt-8" style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.openTasks} tareas abiertas</div>
                </div>
              ))}
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
