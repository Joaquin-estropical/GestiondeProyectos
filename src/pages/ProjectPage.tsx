import { useState, useReducer, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { List, Kanban, GanttChart, Calendar, Table, UserPlus, MoreHorizontal, Filter, ArrowDownWideNarrow, Plus, CheckSquare, MessageSquare, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjects, useTasks } from '@/hooks/useSupabase';
import { getMember, STATUS_ORDER, STATUS_LABELS, MONTHS_ES, fmtDate, dueColor } from '@/lib/mock-data';
import { useAppStore } from '@/stores/app';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill, AreaPill } from '@/components/shared/Badges';
import type { Task, TaskStatus } from '@/types';

// ─── Project Header ───
function ProjectHeader({ project, view, setView }: { project: NonNullable<ReturnType<typeof useProjects>['data']>[0]; view: string; setView: (v: string) => void }) {
  const teamIds = ['joa', 'and', 'car', 'sof'];
  const views = [
    { id: 'list',   label: 'Lista',      Icon: List },
    { id: 'kanban', label: 'Kanban',     Icon: Kanban },
    { id: 'gantt',  label: 'Gantt',      Icon: GanttChart },
    { id: 'cal',    label: 'Calendario', Icon: Calendar },
    { id: 'table',  label: 'Tabla',      Icon: Table },
  ];
  return (
    <div style={{ padding: '20px 32px 0' }}>
      <div className="row gap-12 items-center">
        <AreaPill areaId={project.area} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-.005em' }}>{project.name}</h1>
        <span className="pill pill-status-curso" style={{ marginLeft: 4 }}><span className="dot"></span>En curso</span>
        <span style={{ marginLeft: 'auto' }} className="avatar-stack avatar-stack-bordered">
          {teamIds.map(id => <Avatar key={id} name={getMember(id)?.name ?? ''} size={26} />)}
        </span>
        <button className="btn btn-secondary btn-sm"><UserPlus size={14} /></button>
        <button className="btn btn-secondary btn-sm"><MoreHorizontal size={14} /></button>
      </div>
      <div className="row gap-16 items-center mt-12 f-xs text-2">
        <span><Calendar size={12} /> Entrega {fmtDate(project.due)}</span>
        <span><List size={12} /> {project.count} tareas</span>
        <span><CheckSquare size={12} /> {project.progress}% completado</span>
      </div>
      <div className="row gap-12 items-center mt-20" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`tab ${view === v.id ? 'active' : ''}`}
              style={{ borderRadius: 0, padding: '8px 12px', color: view === v.id ? 'var(--text-1)' : 'var(--text-2)', background: 'transparent', border: 0, borderBottom: view === v.id ? '2px solid var(--teal)' : '2px solid transparent' }}
            >
              <v.Icon size={13} /> {v.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, paddingBottom: 8 }}>
          <button className="btn btn-secondary btn-sm"><Filter size={14} /> Filtros</button>
          <button className="btn btn-secondary btn-sm"><ArrowDownWideNarrow size={14} /> Agrupar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Project List ───
function ProjectList({ tasks, openTask, projectId }: { tasks: Task[]; openTask: (id: string) => void; projectId: string }) {
  const { openNewTask } = useAppStore();
  const grouped = STATUS_ORDER.map(s => ({ status: s as TaskStatus, tasks: tasks.filter(t => t.status === s) })).filter(g => g.tasks.length > 0);

  const dotColor = (s: string) =>
    s === 'done' ? 'var(--green)' : s === 'block' ? 'var(--red)' : s === 'rev' ? 'var(--amber)' : s === 'curso' ? 'var(--blue)' : 'var(--text-3)';

  return (
    <div style={{ padding: '8px 32px 48px' }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <th>Nombre</th>
            <th style={{ width: 130 }}>Asignado</th>
            <th style={{ width: 100 }}>Fecha</th>
            <th style={{ width: 90 }}>Prioridad</th>
            <th style={{ width: 120 }}>Estado</th>
            <th style={{ width: 70 }}>Tiempo</th>
            <th style={{ width: 60 }}><MessageSquare size={12} /></th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(g => (
            <>
              <tr key={g.status + '_h'} className="group">
                <td colSpan={8}>
                  <div className="gh">
                    <span className="dot" style={{ width: 6, height: 6, borderRadius: 999, background: dotColor(g.status) }}></span>
                    {STATUS_LABELS[g.status]} <span className="cnt">{g.tasks.length}</span>
                  </div>
                </td>
              </tr>
              {g.tasks.map(t => {
                const m = getMember(t.assignee)!;
                const done = t.status === 'done';
                return (
                  <tr key={t.id} onClick={() => openTask(t.id)}>
                    <td><span className={`check ${done ? 'done' : ''}`}></span></td>
                    <td><span style={done ? { textDecoration: 'line-through', color: 'var(--text-2)' } : {}}>{t.title}</span></td>
                    <td>
                      <div className="row gap-8 items-center">
                        <Avatar name={m.name} size={22} />
                        <span className="f-xs text-2">{m.short}</span>
                      </div>
                    </td>
                    <td><span className="mono f-xs" style={{ color: dueColor(t.due) }}>{fmtDate(t.due)}</span></td>
                    <td><PriorityPill priority={t.priority} /></td>
                    <td><StatusPill status={t.status} /></td>
                    <td><span className="mono f-xs text-2">{t.time !== '0h' ? t.time : '—'}</span></td>
                    <td><span className="f-xs text-3 mono">{t.comments > 0 ? t.comments : ''}</span></td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '14px 12px', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' }} className="row gap-8 items-center" onClick={() => openNewTask(projectId)}>
        <Plus size={14} /> Agregar tarea
      </div>
    </div>
  );
}

// ─── Project Kanban ───
function ProjectKanban({ tasks, openTask }: { tasks: Task[]; openTask: (id: string) => void }) {
  const { updateTaskStatus } = useAppStore();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, t: Task) => {
    setDrag(t.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragEnd = () => { setDrag(null); setOver(null); };
  const onDragOver = (e: React.DragEvent, s: string) => { e.preventDefault(); setOver(s); };
  const onDrop = (e: React.DragEvent, s: string) => {
    e.preventDefault();
    if (drag) { updateTaskStatus(drag, s as TaskStatus); force(); }
    setDrag(null); setOver(null);
  };

  const dotColor = (s: string) =>
    s === 'done' ? 'var(--green)' : s === 'block' ? 'var(--red)' : s === 'rev' ? 'var(--amber)' : s === 'curso' ? 'var(--blue)' : 'var(--text-3)';

  return (
    <div className="kanban">
      {STATUS_ORDER.map(s => {
        const list = tasks.filter(t => t.status === s);
        return (
          <div key={s} className="kan-col">
            <div className="kan-col-head">
              <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor(s) }}></span>
              <span className="micro" style={{ color: 'var(--text-1)' }}>{STATUS_LABELS[s]}</span>
              <span className="cnt">{list.length}</span>
              <button className="btn btn-ghost btn-sm btn-icon" style={{ width: 20, height: 20, marginLeft: 4 }}><Plus size={12} /></button>
            </div>
            <div
              className={`kan-col-body ${over === s ? 'dragover' : ''}`}
              onDragOver={e => onDragOver(e, s)}
              onDrop={e => onDrop(e, s)}
              onDragLeave={() => setOver(null)}
            >
              {list.map(t => {
                const m = getMember(t.assignee)!;
                return (
                  <div
                    key={t.id}
                    className={`kan-card ${drag === t.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={e => onDragStart(e, t)}
                    onDragEnd={onDragEnd}
                    onClick={() => openTask(t.id)}
                  >
                    <div className="row gap-6 items-center mb-8">
                      <PriorityPill priority={t.priority} iconOnly />
                      <span className="mono f-xs text-3">{t.code}</span>
                      <span style={{ marginLeft: 'auto' }}><AreaPill areaId={t.area} mini /></span>
                    </div>
                    <div className="title">{t.title}</div>
                    {t.subtasks.total > 0 && (
                      <div className="row gap-6 items-center mt-12 f-xs text-2">
                        <CheckSquare size={11} />
                        <span className="mono">{t.subtasks.done}/{t.subtasks.total}</span>
                        <div className="progress" style={{ flex: 1, marginLeft: 6 }}>
                          <div style={{ width: (t.subtasks.done / t.subtasks.total * 100) + '%', background: 'var(--text-3)' }}></div>
                        </div>
                      </div>
                    )}
                    <div className="meta">
                      <Avatar name={m.name} size={20} />
                      <span style={{ color: dueColor(t.due) }} className="mono">{fmtDate(t.due)}</span>
                      <div className="right">
                        {t.comments > 0 && (
                          <span className="row gap-4 items-center"><MessageSquare size={11} /><span className="mono">{t.comments}</span></span>
                        )}
                        {t.time !== '0h' && (
                          <span className="row gap-4 items-center"><Clock size={11} /><span className="mono">{t.time}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Project Gantt ───
function ProjectGantt({ project, tasks, openTask }: { project: NonNullable<ReturnType<typeof useProjects>['data']>[0]; tasks: Task[]; openTask: (id: string) => void }) {
  const colW = 26;

  // Derive time range from actual task due dates
  const allDates = tasks.map(t => new Date(t.due + 'T12:00:00').getTime());
  const minDate  = allDates.length ? new Date(Math.min(...allDates)) : new Date();
  const maxDate  = allDates.length ? new Date(Math.max(...allDates)) : new Date();
  minDate.setDate(minDate.getDate() - 14);
  maxDate.setDate(maxDate.getDate() + 14);
  const totalDays = Math.max(Math.round((maxDate.getTime() - minDate.getTime()) / 86400000), 30);
  const totalW    = totalDays * colW;

  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState<string | null>(null);

  const taskBars = tasks.map((t, i) => {
    const dueD = new Date(t.due + 'T12:00:00');
    const len  = t.start_date
      ? Math.max(1, Math.round((dueD.getTime() - new Date(t.start_date + 'T12:00:00').getTime()) / 86400000))
      : 4 + (i % 5) * 2;
    const ts = t.start_date ? new Date(t.start_date + 'T12:00:00') : new Date(dueD.getTime() - len * 86400000);
    return { t, start: ts, end: dueD, len };
  });

  const xOf    = useCallback((d: Date) => Math.round((d.getTime() - minDate.getTime()) / 86400000) * colW, [minDate, colW]);
  const todayX = xOf(new Date()) + colW / 2;
  const dueX   = xOf(new Date(project.due + 'T12:00:00'));

  const weeks: { label: string }[] = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = new Date(minDate);
    d.setDate(minDate.getDate() + i);
    weeks.push({ label: `${d.getDate()} ${MONTHS_ES[d.getMonth()]}` });
  }

  const statusColor = (s: string) =>
    s === 'done' ? 'var(--green)' : s === 'block' ? 'var(--red)' : s === 'rev' ? 'var(--amber)' : s === 'curso' ? 'var(--blue)' : 'var(--text-3)';

  const onBarMouseDown = useCallback((e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX   = e.clientX;
    const startOff = offsets[taskId] ?? 0;
    setDragging(taskId);
    let rafId = 0;
    const move = (ev: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const delta = Math.round((ev.clientX - startX) / colW);
        setOffsets(o => ({ ...o, [taskId]: startOff + delta }));
      });
    };
    const up = () => {
      cancelAnimationFrame(rafId);
      setDragging(null);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseup', up);
  }, [offsets, colW]);

  return (
    <div style={{ padding: '8px 0 48px' }}>
      <div style={{ padding: '0 32px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="text-3 f-xs" style={{ marginLeft: 'auto' }}>Vista de semana</span>
      </div>
      <div className="gantt-shell">
        <div className="gantt-left">
          <div className="gantt-row" style={{ borderBottom: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500 }}>
            Tarea
          </div>
          {taskBars.map(({ t }) => (
            <div key={t.id} className="gantt-row" onClick={() => openTask(t.id)} style={{ cursor: 'pointer' }}>
              <PriorityPill priority={t.priority} iconOnly />
              <span style={{ marginLeft: 8, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{t.title}</span>
              <Avatar name={getMember(t.assignee)?.name ?? ''} size={20} />
            </div>
          ))}
        </div>
        <div className="gantt-right">
          <div style={{ width: totalW, position: 'relative' }}>
            <div className="gantt-header">
              {weeks.map((w, i) => (
                <div key={i} className="gantt-tick" style={{ width: 7 * colW }}>{w.label}</div>
              ))}
            </div>
            <div className="gantt-today" style={{ left: todayX, height: 36 + taskBars.length * 36 }}></div>
            {taskBars.map(({ t, start: ts, len }) => {
              const off = offsets[t.id] ?? 0;
              const x   = xOf(ts) + off * colW;
              const w   = len * colW;
              return (
                <div key={t.id} className="gantt-body-row">
                  <div
                    className={`gantt-bar ${dragging === t.id ? 'dragging' : ''}`}
                    onMouseDown={e => onBarMouseDown(e, t.id)}
                    onClick={e => { if (dragging === null) openTask(t.id); else e.preventDefault(); }}
                    style={{ left: x, width: w, background: t.status === 'done' ? statusColor(t.status) : statusColor(t.status) + '40', color: t.status === 'done' ? '#0A0A0B' : 'var(--text-1)', borderLeft: `3px solid ${statusColor(t.status)}` }}
                  >
                    {t.title}
                  </div>
                </div>
              );
            })}
            {allDates.length > 0 && (
              <div className="gantt-milestone" style={{ left: dueX - 8, top: 8 + taskBars.length * 36 + 4, color: 'var(--teal)' }}></div>
            )}
            <svg style={{ position: 'absolute', left: 0, top: 36, pointerEvents: 'none' }} width={totalW} height={taskBars.length * 36}>
              {taskBars.slice(0, -1).map(({ end: te }, i) => {
                const x1   = xOf(te);
                const y1   = i * 36 + 18;
                const next = taskBars[i + 1];
                const x2   = xOf(next.start);
                const y2   = (i + 1) * 36 + 18;
                return <path key={i} d={`M${x1} ${y1} L${x1 + 6} ${y1} L${x1 + 6} ${y2} L${x2} ${y2}`} stroke="var(--border-hover)" strokeWidth="1" fill="none" />;
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Project Calendar ───
function ProjectCalendar({ tasks, openTask }: { tasks: Task[]; openTask: (id: string) => void }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthStart   = new Date(year, month, 1);
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; muted: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startWeekday - i));
    cells.push({ date: d, muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(year, month, i, 12), muted: false });
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, muted: true });
    if (cells.length >= 42) break;
  }

  const isoOf    = (d: Date) => d.toISOString().slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);
  const [sel, setSel] = useState(todayIso);

  const taskByDay: Record<string, Task[]> = {};
  tasks.forEach(t => { (taskByDay[t.due] = taskByDay[t.due] || []).push(t); });
  const dayTasks = taskByDay[sel] || [];

  const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DAYS = ['lun','mar','mié','jue','vie','sáb','dom'];

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const statusColor = (s: string) =>
    s === 'done' ? 'var(--green)' : s === 'block' ? 'var(--red)' : s === 'rev' ? 'var(--amber)' : s === 'curso' ? 'var(--blue)' : 'var(--text-3)';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={prev}><ChevronLeft size={14} /></button>
          <span style={{ fontWeight: 600, fontSize: 14, minWidth: 160, textAlign: 'center' }}>{MONTHS_FULL[month]} {year}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={next}><ChevronRight size={14} /></button>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSel(todayIso); }}>Hoy</button>
        </div>
        <div className="cal-grid" style={{ flex: 1 }}>
          {DAYS.map(d => <div key={d} className="cal-wkh">{d}</div>)}
          {cells.map((c, i) => {
            const iso     = isoOf(c.date);
            const isToday = iso === todayIso;
            const isSel   = iso === sel;
            const evts    = taskByDay[iso] || [];
            return (
              <div
                key={i}
                className={`cal-cell ${c.muted ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
                onClick={() => setSel(iso)}
              >
                <span className="num">{c.date.getDate()}</span>
                {evts.slice(0, 3).map(t => (
                  <div key={t.id} className="cal-event" style={{ background: statusColor(t.status) + '20' }} onClick={e => { e.stopPropagation(); openTask(t.id); }}>
                    <span className="dot" style={{ background: statusColor(t.status) }}></span>{t.title}
                  </div>
                ))}
                {evts.length > 3 && <div className="micro" style={{ paddingLeft: 4 }}>+{evts.length - 3} más</div>}
              </div>
            );
          })}
        </div>
      </div>

      <aside style={{ padding: 20, overflowY: 'auto' }}>
        <div className="micro mb-8">Detalle del día</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{sel ? new Date(sel + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : '—'}</div>
        <div className="text-2 f-sm mt-4 mb-16">{dayTasks.length} tareas con vencimiento</div>
        {dayTasks.length === 0 && <div className="text-3 f-sm">Sin tareas en este día.</div>}
        {dayTasks.map(t => (
          <div key={t.id} className="card card-pad" style={{ padding: 12, cursor: 'pointer', marginBottom: 8 }} onClick={() => openTask(t.id)}>
            <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 8 }}>{t.title}</div>
            <div className="row gap-8 items-center">
              <StatusPill status={t.status} />
              <PriorityPill priority={t.priority} />
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

// ─── Main export ───
export default function ProjectPage() {
  const { projectId }       = useParams<{ projectId: string }>();
  const { openTask }        = useAppStore();
  const [view, setView]     = useState('list');
  const id                  = projectId ?? '';

  const { data: projects = [], loading } = useProjects();
  const { data: tasks    = [] }          = useTasks({ projectId: id });

  const project = projects.find(p => p.id === id);

  if (loading) return <div className="page-body" style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando proyecto...</div>;
  if (!project) return <div className="page-body">Proyecto no encontrado.</div>;

  return (
    <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <ProjectHeader project={project} view={view} setView={setView} />
      <div style={{ flex: 1 }}>
        {view === 'list'   && <ProjectList   tasks={tasks} openTask={openTask} projectId={id} />}
        {view === 'kanban' && <ProjectKanban tasks={tasks} openTask={openTask} />}
        {view === 'gantt'  && <ProjectGantt  project={project} tasks={tasks} openTask={openTask} />}
        {view === 'table'  && <ProjectList   tasks={tasks} openTask={openTask} projectId={id} />}
        {view === 'cal'    && <ProjectCalendar tasks={tasks} openTask={openTask} />}
      </div>
    </div>
  );
}
