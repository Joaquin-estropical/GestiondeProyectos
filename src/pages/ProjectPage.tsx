import { useState, useReducer } from 'react';
import { useParams } from 'react-router-dom';
import { List, Kanban, GanttChart, Calendar, Table, UserPlus, MoreHorizontal, Filter, ArrowDownWideNarrow, Plus, CheckSquare, MessageSquare, Clock } from 'lucide-react';
import { PROJECTS, TASKS, getMember, STATUS_ORDER, STATUS_LABELS, MONTHS_ES, TODAY, fmtDate, dueColor } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill, AreaPill } from '@/components/shared/Badges';
import { useAppStore } from '@/stores/app';
import type { Task, TaskStatus } from '@/types';

// ─── Project Header ───
function ProjectHeader({ projectId, view, setView }: { projectId: string; view: string; setView: (v: string) => void }) {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
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
        <div className="tabs" style={{ background: 'transparent', border: 0, padding: 0, gap: 0 }}>
          {views.map(v => (
            <span
              key={v.id}
              onClick={() => setView(v.id)}
              className={`tab ${view === v.id ? 'active' : ''}`}
              style={{ borderRadius: 0, borderBottom: view === v.id ? '2px solid var(--teal)' : '2px solid transparent', padding: '8px 12px', color: view === v.id ? 'var(--text-1)' : 'var(--text-2)', background: 'transparent' }}
            >
              <v.Icon size={13} /> {v.label}
            </span>
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
function ProjectList({ projectId, openTask }: { projectId: string; openTask: (id: string) => void }) {
  const tasks = TASKS.filter(t => t.project === projectId);
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
                const m = getMember(t.assignee)!
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
                    <td><span className="mono f-xs text-2">{t.time !== '00:00' ? t.time : '—'}</span></td>
                    <td><span className="f-xs text-3 mono">{t.comments > 0 ? t.comments : ''}</span></td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '14px 12px', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' }} className="row gap-8 items-center">
        <Plus size={14} /> Agregar tarea
      </div>
    </div>
  );
}

// ─── Project Kanban ───
function ProjectKanban({ projectId, openTask }: { projectId: string; openTask: (id: string) => void }) {
  const { updateTaskStatus } = useAppStore();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const tasks = TASKS.filter(t => t.project === projectId);

  const onDragStart = (e: React.DragEvent, t: Task) => {
    setDrag(t.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragEnd = () => { setDrag(null); setOver(null); };
  const onDragOver = (e: React.DragEvent, s: string) => { e.preventDefault(); setOver(s); };
  const onDrop = (e: React.DragEvent, s: string) => {
    e.preventDefault();
    if (drag) {
      updateTaskStatus(drag, s as TaskStatus);
      force();
    }
    setDrag(null);
    setOver(null);
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
                const m = getMember(t.assignee)!
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
                        {t.time !== '00:00' && (
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
function ProjectGantt({ projectId, openTask }: { projectId: string; openTask: (id: string) => void }) {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  const tasks = TASKS.filter(t => t.project === projectId);

  const start = new Date('2026-02-20T12:00:00');
  const end   = new Date('2026-04-05T12:00:00');
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  const colW = 26;
  const totalW = totalDays * colW;

  const [offsets, setOffsets] = useState<Record<string, number>>({});

  const taskBars = tasks.map((t, i) => {
    const dueD = new Date(t.due + 'T12:00:00');
    const len = 4 + (i % 5) * 2;
    const taskStart = new Date(dueD);
    taskStart.setDate(dueD.getDate() - len);
    return { t, start: taskStart, end: dueD, len };
  });

  const xOf = (d: Date) => Math.round((d.getTime() - start.getTime()) / 86400000) * colW;
  const todayX = xOf(new Date(TODAY + 'T12:00:00')) + colW / 2;

  const weeks: { d: Date; x: number; label: string }[] = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    weeks.push({ d, x: i * colW, label: `${d.getDate()} ${MONTHS_ES[d.getMonth()]}` });
  }

  const dueX = xOf(new Date(project.due + 'T12:00:00'));

  const statusColor = (s: string) =>
    s === 'done' ? 'var(--green)' : s === 'block' ? 'var(--red)' : s === 'rev' ? 'var(--amber)' : s === 'curso' ? 'var(--blue)' : 'var(--text-3)';

  return (
    <div style={{ padding: '8px 0 48px' }}>
      <div style={{ padding: '0 32px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="tabs">
          <span className="tab">Día</span>
          <span className="tab active">Semana</span>
          <span className="tab">Mes</span>
          <span className="tab">Trim.</span>
        </div>
        <span className="text-3 f-xs" style={{ marginLeft: 'auto' }}>20 feb — 5 abr 2026</span>
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
              const x = xOf(ts) + off * colW;
              const w = len * colW;
              const onDown = (e: React.MouseEvent) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startOff = offsets[t.id] ?? 0;
                const move = (ev: MouseEvent) => {
                  const delta = Math.round((ev.clientX - startX) / colW);
                  setOffsets(o => ({ ...o, [t.id]: startOff + delta }));
                };
                const up = () => {
                  window.removeEventListener('mousemove', move);
                  window.removeEventListener('mouseup', up);
                };
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', up);
              };
              return (
                <div key={t.id} className="gantt-body-row">
                  <div
                    className="gantt-bar"
                    onMouseDown={onDown}
                    onClick={e => { if (!e.defaultPrevented) openTask(t.id); }}
                    style={{
                      left: x, width: w,
                      background: t.status === 'done' ? statusColor(t.status) : statusColor(t.status) + '40',
                      color: t.status === 'done' ? '#0A0A0B' : 'var(--text-1)',
                      borderLeft: `3px solid ${statusColor(t.status)}`,
                    }}
                  >
                    {t.title}
                  </div>
                </div>
              );
            })}
            <div className="gantt-milestone" style={{ left: dueX - 8, top: 8 + taskBars.length * 36 + 4, color: 'var(--teal)' }}></div>
            <svg style={{ position: 'absolute', left: 0, top: 36, pointerEvents: 'none' }} width={totalW} height={taskBars.length * 36}>
              {taskBars.slice(0, -1).map(({ end: te }, i) => {
                const x1 = xOf(te);
                const y1 = i * 36 + 18;
                const next = taskBars[i + 1];
                const x2 = xOf(next.start);
                const y2 = (i + 1) * 36 + 18;
                return (
                  <path key={i} d={`M${x1} ${y1} L${x1 + 6} ${y1} L${x1 + 6} ${y2} L${x2} ${y2}`}
                    stroke="var(--border-hover)" strokeWidth="1" fill="none" />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ───
export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { openTask } = useAppStore();
  const [view, setView] = useState('list');
  const id = projectId ?? '';

  const project = PROJECTS.find(p => p.id === id);
  if (!project) return <div className="page-body">Proyecto no encontrado.</div>;

  return (
    <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <ProjectHeader projectId={id} view={view} setView={setView} />
      <div style={{ flex: 1 }}>
        {view === 'list' && <ProjectList projectId={id} openTask={openTask} />}
        {view === 'kanban' && <ProjectKanban projectId={id} openTask={openTask} />}
        {view === 'gantt' && <ProjectGantt projectId={id} openTask={openTask} />}
        {view === 'cal' && (
          <div style={{ padding: 32 }}>
            <div className="empty">
              <div className="ill"><Calendar size={26} /></div>
              <p className="t">Calendario del proyecto</p>
              <p className="d">Vista de calendario por proyecto próximamente.</p>
            </div>
          </div>
        )}
        {view === 'table' && <ProjectList projectId={id} openTask={openTask} />}
      </div>
    </div>
  );
}
