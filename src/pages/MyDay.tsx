import { useState } from 'react';
import { Play, Pause, Plus, CalendarDays, List, AlertCircle, ExternalLink } from 'lucide-react';
import { useTasks, useProjects, useAreas } from '@/hooks/useSupabase';
import { fmtDate, dueColor, DAYS_ES, MONTHS_SHORT } from '@/lib/mock-data';
import { AreaPill, PriorityPill, StatusPill } from '@/components/shared/Badges';
import { priorityBar } from '@/lib/visual';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import type { Task } from '@/types';

type MyDayView = 'list' | 'schedule';

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}

// ── Cronograma (calendar) view ────────────────────────────
function ScheduleView({ tasks, todayIso, onOpenTask, onNewTask, areas }: {
  tasks: Task[];
  todayIso: string;
  onOpenTask: (id: string) => void;
  onNewTask: (iso: string) => void;
  areas: { id: string; name: string; color: string }[];
}) {
  const today = new Date(todayIso + 'T12:00:00');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [viewRaw, setView] = useState<'week' | 'month'>('week');
  // cast to string to prevent TypeScript narrowing complaints inside conditional returns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const view: any = viewRaw;
  const [month, setMonth] = useState(today.getMonth());
  const [year,  setYear]  = useState(today.getFullYear());

  const areaColor = (id: string) => areas.find(a => a.id === id)?.color ?? 'var(--text-3)';

  const taskByDay: Record<string, Task[]> = {};
  tasks.forEach(t => { (taskByDay[t.due] = taskByDay[t.due] || []).push(t); });

  const prevPeriod = () => {
    if (view === 'week') setWeekStart(d => addDays(d, -7));
    else { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  };
  const nextPeriod = () => {
    if (view === 'week') setWeekStart(d => addDays(d, 7));
    else { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
  };
  const goToday = () => {
    setWeekStart(startOfWeek(today));
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  };

  const periodLabel = view === 'week'
    ? `${addDays(weekStart, 0).getDate()}–${addDays(weekStart, 6).getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : `${MONTHS_SHORT[month]} ${year}`;

  // Week view
  if (view === 'week') {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', flexShrink: 0 }}>
          <div className="tabs">
            <button className={`tab${view === 'week' ? ' active' : ''}`} onClick={() => setView('week')}>Semana</button>
            <button className={`tab${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}>Mes</button>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={prevPeriod}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', minWidth: 0, textAlign: 'center' }}>{periodLabel}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={nextPeriod}>›</button>
          <button className="btn btn-ghost btn-sm" onClick={goToday}>Hoy</button>
        </div>

        {/* Week grid — scrollable on mobile, 7 cols on desktop */}
        <div className="schedule-week-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', gap: 8, flex: 1, overflowX: 'auto', minWidth: 0 }}>
          {days.map((d, i) => {
            const iso     = isoDate(d);
            const isToday = iso === todayIso;
            const evts    = taskByDay[iso] || [];
            return (
              <div key={i} className={isToday ? 'schedule-today-col' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                {/* Day header */}
                <div style={{ textAlign: 'center', paddingBottom: 6 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', fontWeight: 600 }}>{DAYS_ES[i]}</div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, lineHeight: 1.3,
                    color: isToday ? '#00302A' : 'var(--text-2)',
                    background: isToday ? 'var(--teal)' : 'transparent',
                    borderRadius: 999, width: 32, height: 32,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {d.getDate()}
                  </div>
                </div>

                {/* Tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                  {evts.map(t => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTask(t.id)}
                      style={{
                        padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12, lineHeight: 1.4,
                        background: areaColor(t.area) + '20',
                        borderLeft: `3px solid ${areaColor(t.area)}`,
                        color: 'var(--text-1)',
                      }}
                      title={t.title}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{t.title}</div>
                      <StatusPill status={t.status} />
                    </div>
                  ))}
                  {/* Add button */}
                  <button
                    onClick={() => onNewTask(iso)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '100%', height: 26, border: '1px dashed var(--border)', borderRadius: 5,
                      background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11,
                      opacity: 0, transition: 'opacity .12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Month view
  const monthStart   = new Date(year, month, 1);
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; muted: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(monthStart); d.setDate(d.getDate() - (startWeekday - i));
    cells.push({ date: d, muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(year, month, i, 12), muted: false });
  while (cells.length % 7 !== 0) { const last = cells[cells.length - 1].date; const d = new Date(last); d.setDate(d.getDate() + 1); cells.push({ date: d, muted: true }); }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', flexShrink: 0 }}>
        <div className="tabs">
          <button className={`tab${view === 'week' ? ' active' : ''}`} onClick={() => setView('week')}>Semana</button>
          <button className={`tab${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}>Mes</button>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={prevPeriod}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', minWidth: 0, textAlign: 'center' }}>{periodLabel}</span>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={nextPeriod}>›</button>
        <button className="btn btn-ghost btn-sm" onClick={goToday}>Hoy</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        {DAYS_ES.map(d => (
          <div key={d} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>{d}</div>
        ))}
        {cells.map((c, i) => {
          const iso     = isoDate(c.date);
          const isToday = iso === todayIso;
          const evts    = taskByDay[iso] || [];
          return (
            <div key={i} style={{
              borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
              borderBottom: '1px solid var(--border)',
              padding: '4px 6px', minHeight: 80, display: 'flex', flexDirection: 'column', gap: 2,
              background: c.muted ? '#09090B' : 'transparent', cursor: 'pointer',
            }} onClick={() => !c.muted && onNewTask(iso)}>
              <div style={{
                fontSize: 11, fontWeight: 600, textAlign: 'right',
                color: isToday ? '#00302A' : c.muted ? 'var(--text-3)' : 'var(--text-2)',
                background: isToday ? 'var(--teal)' : 'transparent',
                borderRadius: 999, width: 20, height: 20, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end',
              }}>{c.date.getDate()}</div>
              {evts.slice(0, 3).map(t => (
                <div key={t.id} onClick={e => { e.stopPropagation(); onOpenTask(t.id); }} style={{
                  padding: '2px 5px', borderRadius: 3, fontSize: 10.5, lineHeight: 1.4,
                  background: areaColor(t.area) + '22', borderLeft: `2px solid ${areaColor(t.area)}`,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }} title={t.title}>{t.title}</div>
              ))}
              {evts.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-3)' }}>+{evts.length - 3} más</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────
export default function MyDay() {
  const { openNewTask, openTask, currentUser } = useAppStore();
  const today    = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<MyDayView>('list');

  const { data: allTasks = [] } = useTasks({ assigneeId: currentUser.memberId });
  const { data: projects = [] } = useProjects();
  const { data: areas    = [] } = useAreas();
  const [timing, setTiming]     = useState<string | null>(null);

  const overdueTasks = allTasks.filter(t => t.status !== 'done' && t.due < today);
  const todayTasks   = allTasks.filter(t => t.status !== 'done' && t.due === today);
  const upcoming     = allTasks.filter(t => t.status !== 'done' && t.due > today);
  const review       = allTasks.filter(t => t.status === 'rev');

  const goToTask = (t: Task) => openTask(t.id);

  function TaskRow({ t }: { t: Task }) {
    const isTiming = timing === t.id;
    const isOverdue = t.due < today && t.status !== 'done';
    const project = projects.find(p => p.id === t.project);
    const isHigh = t.priority === 'urg' || t.priority === 'alta';
    const bar = isOverdue ? 'var(--red)' : priorityBar(t.priority);
    return (
      <div
        style={{
          padding: '11px 0 11px 11px', borderLeft: `3px solid ${bar}`, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          background: isOverdue ? 'rgba(239,68,68,.03)' : 'transparent',
        }}
        onClick={() => goToTask(t)}
      >
        <span className="check" style={{ flexShrink: 0 }}></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: isHigh ? 600 : 400, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
          {project && (
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AreaPill areaId={t.area} mini />
              {project.name}
            </div>
          )}
        </div>
        {isOverdue && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 999, background: 'rgba(239,68,68,.12)', fontSize: 10, color: 'var(--red)', fontWeight: 600, flexShrink: 0 }}>
            <AlertCircle size={9} /> VENCIDA
          </div>
        )}
        <PriorityPill priority={t.priority} iconOnly />
        <span className="mono" style={{ fontSize: 12, color: dueColor(t.due), minWidth: 60, textAlign: 'right', flexShrink: 0 }}>{fmtDate(t.due)}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={e => { e.stopPropagation(); setTiming(isTiming ? null : t.id); }}
          style={isTiming ? { color: 'var(--teal)', flexShrink: 0 } : { flexShrink: 0 }}
        >
          {isTiming ? <Pause size={12} /> : <Play size={12} />}
          <span className="mono">{t.time}</span>
        </button>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={e => { e.stopPropagation(); goToTask(t); }}
          title="Abrir detalle"
          style={{ width: 24, height: 24, flexShrink: 0 }}
        >
          <ExternalLink size={11} color="var(--text-3)" />
        </button>
      </div>
    );
  }

  const firstName = currentUser.name.split(' ')[0];

  return (
    <>
      <PageHead
        title={`Mi día · ${firstName}`}
        subtitle={`${allTasks.filter(t => t.status !== 'done').length} tareas asignadas`}
        right={
          <div className="row gap-8">
            <div className="tabs">
              <button className={`tab${tab === 'list' ? ' active' : ''}`} onClick={() => setTab('list')} style={{ gap: 5 }}>
                <List size={12} /> Lista
              </button>
              <button className={`tab${tab === 'schedule' ? ' active' : ''}`} onClick={() => setTab('schedule')} style={{ gap: 5 }}>
                <CalendarDays size={12} /> Cronograma
              </button>
            </div>
            <button className="btn btn-primary btn-md" onClick={() => openNewTask()}>
              <Plus size={14} /> Nueva tarea
            </button>
          </div>
        }
      />

      {tab === 'schedule' ? (
        /* ── Cronograma ── */
        <div className="page-body" style={{ height: 'calc(100% - 89px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ScheduleView
            tasks={allTasks}
            todayIso={today}
            onOpenTask={openTask}
            onNewTask={(iso) => openNewTask(undefined, iso)}
            areas={areas}
          />
        </div>
      ) : (
        /* ── Lista ── */
        <div className="page-body" style={{ maxWidth: '100%' }}>
          {/* Mini-resumen del día */}
          {allTasks.length > 0 && (
            <div className="card card-pad mb-16" style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { lbl: 'Para hoy',     val: todayTasks.length,   color: 'var(--text-1)' },
                { lbl: 'Vencidas',     val: overdueTasks.length, color: overdueTasks.length ? 'var(--red)' : 'var(--text-3)' },
                { lbl: 'En revisión',  val: review.length,       color: review.length ? 'var(--amber)' : 'var(--text-3)' },
                { lbl: 'Próximas',     val: upcoming.length,     color: 'var(--text-2)' },
              ].map(s => (
                <div key={s.lbl} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 26, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{s.val}</span>
                  <span className="micro">{s.lbl}</span>
                </div>
              ))}
            </div>
          )}

          {/* Vencidas */}
          {overdueTasks.length > 0 && (
            <div className="card mb-16" style={{ borderColor: 'rgba(239,68,68,.3)' }}>
              <div className="card-head" style={{ background: 'rgba(239,68,68,.05)' }}>
                <AlertCircle size={14} color="var(--red)" />
                <span className="title" style={{ color: 'var(--red)' }}>Vencidas</span>
                <span className="micro" style={{ marginLeft: 'auto', color: 'var(--red)' }}>{overdueTasks.length} tarea{overdueTasks.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ padding: '0 18px 8px' }}>
                {overdueTasks.map(t => <TaskRow key={t.id} t={t} />)}
              </div>
            </div>
          )}

          <div className="card mb-16">
            <div className="card-head">
              <span className="title">Para hoy</span>
              <span className="micro" style={{ marginLeft: 'auto' }}>{todayTasks.length} tareas</span>
            </div>
            <div style={{ padding: '0 18px 8px' }}>
              {todayTasks.map(t => <TaskRow key={t.id} t={t} />)}
              {todayTasks.length === 0 && (
                <div style={{ padding: '18px 0', color: 'var(--text-3)', fontSize: 13 }}>
                  {allTasks.length === 0 ? `No hay tareas asignadas a ${firstName} todavía.` : 'Sin tareas para hoy. ¡Todo al día!'}
                </div>
              )}
            </div>
          </div>

          <div className="card mb-16">
            <div className="card-head">
              <span className="title">En revisión</span>
              <span className="micro" style={{ marginLeft: 'auto' }}>{review.length}</span>
            </div>
            <div style={{ padding: '0 18px 8px' }}>
              {review.length === 0 && (
                <div style={{ padding: '18px 0', color: 'var(--text-3)', fontSize: 13 }}>Nada en revisión.</div>
              )}
              {review.map(t => <TaskRow key={t.id} t={t} />)}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="title">Próximas</span>
              <span className="micro" style={{ marginLeft: 'auto' }}>{upcoming.length}</span>
            </div>
            <div style={{ padding: '0 18px 8px' }}>
              {upcoming.length === 0 && (
                <div style={{ padding: '18px 0', color: 'var(--text-3)', fontSize: 13 }}>Sin tareas próximas.</div>
              )}
              {upcoming.map(t => <TaskRow key={t.id} t={t} />)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
