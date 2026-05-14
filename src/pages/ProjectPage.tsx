import { useState, useReducer, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { List, Kanban, GanttChart as GanttIcon, Calendar, Table, UserPlus, MoreHorizontal, Filter, ArrowDownWideNarrow, Plus, CheckSquare, MessageSquare, ChevronLeft, ChevronRight, X, Pen, Trash2 } from 'lucide-react';
import { useProjects, useTasks, useMembers } from '@/hooks/useSupabase';
import { getMember, STATUS_ORDER, STATUS_LABELS, fmtDate, dueColor } from '@/lib/mock-data';
import { useAppStore } from '@/stores/app';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill, AreaPill } from '@/components/shared/Badges';
import { GanttChart } from '@/components/shared/GanttChart';
import type { Task, TaskStatus } from '@/types';

// ─── Project actions dropdown ───
function ProjectActionsMenu({ projectId }: { projectId: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { openEditProject } = useAppStore();

  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(target)) setPos(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = () => {
    if (open) { setPos(null); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const item = (icon: React.ReactNode, label: string, color: string, onClick: () => void) => (
    <button
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', color, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
      onClick={() => { setPos(null); onClick(); }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {icon} {label}
    </button>
  );

  return (
    <>
      <button ref={btnRef} className="btn btn-secondary btn-sm btn-icon" onClick={toggle}>
        <MoreHorizontal size={14} />
      </button>
      {open && pos && (
        <div style={{
          position: 'fixed', top: pos.top, right: pos.right, zIndex: 9000,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '4px 0', minWidth: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}>
          {item(<Pen size={13} color="var(--text-2)" />, 'Renombrar / editar', 'var(--text-1)', () => openEditProject(projectId))}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          {item(<Trash2 size={13} color="var(--red)" />, 'Eliminar proyecto', 'var(--red)', () => openEditProject(projectId))}
        </div>
      )}
    </>
  );
}

// ─── Project Header (info only, no tabs) ───
function ProjectHeader({ project, tasks, onNewTask }: { project: NonNullable<ReturnType<typeof useProjects>['data']>[0]; tasks: Task[]; onNewTask: () => void }) {
  const { data: members = [] } = useMembers();
  const assigneeIds = [...new Set(tasks.map(t => t.assignee))].slice(0, 5);
  return (
    <div style={{ padding: '20px 32px 12px' }}>
      <div className="row gap-12 items-center">
        <AreaPill areaId={project.area} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-.005em' }}>{project.name}</h1>
        <span className="pill pill-status-curso" style={{ marginLeft: 4 }}><span className="dot"></span>En curso</span>
        <span style={{ marginLeft: 'auto' }} className="avatar-stack avatar-stack-bordered">
          {assigneeIds.map(id => {
            const m = members.find(x => x.id === id) ?? getMember(id);
            return <Avatar key={id} name={m?.name ?? id} size={26} />;
          })}
        </span>
        <button className="btn btn-secondary btn-sm"><UserPlus size={14} /></button>
        <button className="btn btn-primary btn-sm" onClick={onNewTask}>
          <Plus size={14} /> Nueva tarea
        </button>
        <ProjectActionsMenu projectId={project.id} />
      </div>
      <div className="row gap-16 items-center mt-12 f-xs text-2">
        <span><Calendar size={12} /> Entrega {fmtDate(project.due)}</span>
        <span><List size={12} /> {project.count} tareas</span>
        <span><CheckSquare size={12} /> {project.progress}% completado</span>
      </div>
    </div>
  );
}

// ─── View tabs bar (always visible, outside resize zone) ───
const VIEW_TABS = [
  { id: 'list',   label: 'Lista',      Icon: List },
  { id: 'kanban', label: 'Kanban',     Icon: Kanban },
  { id: 'gantt',  label: 'Gantt',      Icon: GanttIcon },
  { id: 'cal',    label: 'Calendario', Icon: Calendar },
  { id: 'table',  label: 'Tabla',      Icon: Table },
];
function ViewTabsBar({ view, setView }: { view: string; setView: (v: string) => void }) {
  return (
    <div className="row gap-12 items-center" style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', flexShrink: 0, background: 'var(--bg)' }}>
      <div style={{ display: 'flex', gap: 0 }}>
        {VIEW_TABS.map(v => (
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
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, paddingBottom: 0 }}>
        <button className="btn btn-secondary btn-sm"><Filter size={14} /> Filtros</button>
        <button className="btn btn-secondary btn-sm"><ArrowDownWideNarrow size={14} /> Agrupar</button>
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
const KAN_STATUS_COLORS: Record<string, string> = {
  curso: 'var(--blue)', pend: 'var(--text-3)', rev: 'var(--amber)', block: 'var(--red)', done: 'var(--green)',
};
const KAN_STATUS_BG: Record<string, string> = {
  curso: 'rgba(59,130,246,.08)', pend: 'transparent', rev: 'rgba(245,158,11,.08)', block: 'rgba(239,68,68,.08)', done: 'rgba(34,197,94,.08)',
};

// Mini modal that appears when dropping to 'rev' or 'block'
function KanbanPromptModal({ type, members, onConfirm, onCancel }: {
  type: 'rev' | 'block';
  members: { id: string; name: string }[];
  onConfirm: (data: { reviewer?: string; blockNote?: string }) => void;
  onCancel: () => void;
}) {
  const [reviewer,  setReviewer]  = useState('');
  const [blockNote, setBlockNote] = useState('');
  const isRev = type === 'rev';

  return (
    <>
      <div className="modal-bd" onClick={onCancel} />
      <div className="modal" style={{ maxWidth: 400, zIndex: 310 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 14 }}>
            {isRev ? '¿Quién revisa esta tarea?' : '¿Por qué está bloqueada?'}
          </span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={onCancel}>
            <X size={13} />
          </button>
        </div>
        <div className="modal-body">
          {isRev ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, marginTop: 0 }}>
                Asigná un revisor para tener visibilidad de quién aprueba esta tarea.
              </p>
              <div className="form-group">
                <label className="form-label">Revisor responsable</label>
                <div className="input" style={{ padding: 0 }}>
                  <select
                    value={reviewer}
                    onChange={e => setReviewer(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: reviewer ? 'var(--text-1)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer' }}
                  >
                    <option value="">Seleccionar revisor...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14, marginTop: 0 }}>
                Explicá brevemente qué impide avanzar con esta tarea.
              </p>
              <div className="form-group">
                <label className="form-label">Motivo del bloqueo <span style={{ color: 'var(--red)' }}>*</span></label>
                <div className="input" style={{ height: 'auto' }}>
                  <textarea
                    autoFocus
                    value={blockNote}
                    onChange={e => setBlockNote(e.target.value)}
                    placeholder="Ej: Esperando aprobación del proveedor, falta material, sin presupuesto..."
                    style={{ resize: 'vertical', minHeight: 80, background: 'transparent', border: 'none', outline: 'none', width: '100%', color: 'var(--text-1)', fontSize: 13 }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-md" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-primary btn-md"
            disabled={isRev ? false : !blockNote.trim()}
            onClick={() => onConfirm(isRev ? { reviewer } : { blockNote: blockNote.trim() })}
          >
            {isRev ? 'Mover a revisión' : 'Marcar bloqueada'}
          </button>
        </div>
      </div>
    </>
  );
}

function ProjectKanban({ tasks, openTask, projectId }: { tasks: Task[]; openTask: (id: string) => void; projectId: string }) {
  const { updateTaskStatus, openNewTask } = useAppStore();
  const { data: members = [] } = useMembers();

  const [localTasks, setLocalTasks] = useReducer((_: Task[], next: Task[]) => next, tasks);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const [drag,   setDrag]   = useState<string | null>(null);
  const [over,   setOver]   = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Pending prompt when dropping to rev or block
  const [prompt, setPrompt] = useState<{ taskId: string; newStatus: TaskStatus } | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDrag(id); e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move';
  };
  const onDragEnd   = () => { setDrag(null); setOver(null); };
  const onDragOver  = (e: React.DragEvent, s: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(s); };
  const onDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver(null);
  };

  const commitMove = async (id: string, newStatus: TaskStatus) => {
    setLocalTasks(localTasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    setSaving(id);
    await updateTaskStatus(id, newStatus);
    setSaving(null);
  };

  const onDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || drag;
    setDrag(null); setOver(null);
    if (!id) return;
    const task = localTasks.find(t => t.id === id);
    if (!task || task.status === newStatus) return;
    if (newStatus === 'rev' || newStatus === 'block') {
      setPrompt({ taskId: id, newStatus });
    } else {
      commitMove(id, newStatus);
    }
  };

  const handlePromptConfirm = async (_data: { reviewer?: string; blockNote?: string }) => {
    if (!prompt) return;
    await commitMove(prompt.taskId, prompt.newStatus);
    // TODO: persist reviewer/blockNote to task notes when that field exists
    setPrompt(null);
  };

  return (
    <>
      {prompt && (
        <KanbanPromptModal
          type={prompt.newStatus as 'rev' | 'block'}
          members={members}
          onConfirm={handlePromptConfirm}
          onCancel={() => setPrompt(null)}
        />
      )}
      <div className="kanban">
        {STATUS_ORDER.map(s => {
          const list = localTasks.filter(t => t.status === s);
          const col  = KAN_STATUS_COLORS[s];
          const bg   = KAN_STATUS_BG[s];
          return (
            <div key={s} className="kan-col">
              <div className="kan-col-head" style={{ borderTop: `3px solid ${col}`, borderRadius: '6px 6px 0 0', background: bg, padding: '12px 14px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: col, flexShrink: 0 }}></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{STATUS_LABELS[s]}</span>
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: col, background: col + '20', padding: '1px 7px', borderRadius: 999 }}>{list.length}</span>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  style={{ width: 24, height: 24, marginLeft: 'auto' }}
                  onClick={() => openNewTask(projectId)}
                  title="Agregar tarea"
                >
                  <Plus size={13} />
                </button>
              </div>

              <div
                className={`kan-col-body ${over === s ? 'dragover' : ''}`}
                style={{ minHeight: 100 }}
                onDragOver={e => onDragOver(e, s)}
                onDrop={e => onDrop(e, s as TaskStatus)}
                onDragLeave={onDragLeave}
              >
                {list.map(t => {
                  const m = getMember(t.assignee);
                  const isDragging = drag === t.id;
                  const isSaving   = saving === t.id;
                  const isDone     = t.status === 'done';
                  return (
                    <div
                      key={t.id}
                      className={`kan-card ${isDragging ? 'dragging' : ''}`}
                      draggable
                      onDragStart={e => onDragStart(e, t.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => openTask(t.id)}
                      style={{ opacity: isSaving ? 0.6 : 1, borderLeft: `4px solid ${col}` }}
                    >
                      {/* Top row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <PriorityPill priority={t.priority} iconOnly />
                        <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{t.code}</span>
                        {isDone && <CheckSquare size={12} color="var(--green)" style={{ marginLeft: 'auto' }} />}
                      </div>

                      {/* Title */}
                      <div style={{
                        fontSize: 14, fontWeight: 500, lineHeight: 1.5,
                        color: isDone ? 'var(--text-3)' : 'var(--text-1)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        marginBottom: 12,
                        wordBreak: 'break-word',
                      }}>
                        {t.title}
                      </div>

                      {/* Subtasks */}
                      {t.subtasks.total > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <CheckSquare size={10} color="var(--text-3)" />
                            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{t.subtasks.done}/{t.subtasks.total}</span>
                          </div>
                          <div className="progress">
                            <div style={{ width: (t.subtasks.done / t.subtasks.total * 100) + '%', background: col }}></div>
                          </div>
                        </div>
                      )}

                      {/* Bottom meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        {m && <Avatar name={m.name} size={22} title={m.name} />}
                        <span style={{ flex: 1, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: dueColor(t.due) }}>{fmtDate(t.due)}</span>
                        {t.comments > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}>
                            <MessageSquare size={10} />{t.comments}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {list.length === 0 && over !== s && (
                  <div style={{ padding: '20px 12px', color: 'var(--text-3)', fontSize: 12, textAlign: 'center', borderRadius: 6, border: '1px dashed var(--border)', margin: '0 2px' }}>
                    Sin tareas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
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
const HEADER_MIN = 80;
const HEADER_MAX = 320;
const HEADER_DEFAULT = 210;

export default function ProjectPage() {
  const { projectId }       = useParams<{ projectId: string }>();
  const { openTask, openNewTask } = useAppStore();
  const [view, setView]     = useState('list');
  const [headerH, setHeaderH] = useState(HEADER_DEFAULT);
  const id                  = projectId ?? '';

  const { data: projects = [], loading } = useProjects();
  const { data: tasks    = [] }          = useTasks({ projectId: id });

  const project = projects.find(p => p.id === id);

  // Drag-to-resize divider
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = headerH;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(HEADER_MAX, Math.max(HEADER_MIN, startH + ev.clientY - startY));
      setHeaderH(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [headerH]);

  if (loading) return <div className="page-body" style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando proyecto...</div>;
  if (!project) return <div className="page-body">Proyecto no encontrado.</div>;

  const isFullHeight = view === 'gantt' || view === 'kanban' || view === 'cal';

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      {/* Info header — resizable */}
      <div style={{ height: headerH, flexShrink: 0, overflow: 'hidden' }}>
        <ProjectHeader project={project} tasks={tasks} onNewTask={() => openNewTask(id, undefined, project.area)} />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onDividerMouseDown}
        title="Arrastrá para redimensionar"
        style={{
          height: 14, flexShrink: 0, cursor: 'row-resize',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      >
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ width: 4, height: 4, borderRadius: 99, background: 'var(--text-3)', opacity: 0.5 }} />
        ))}
      </div>

      {/* View tabs — always visible, outside resize zone */}
      <ViewTabsBar view={view} setView={setView} />

      {/* Content */}
      <div style={{ flex: 1, overflow: isFullHeight ? 'hidden' : 'auto', display: isFullHeight ? 'flex' : 'block', flexDirection: 'column' }}>
        {view === 'list'   && <ProjectList   tasks={tasks} openTask={openTask} projectId={id} />}
        {view === 'kanban' && <ProjectKanban tasks={tasks} openTask={openTask} projectId={id} />}
        {view === 'gantt'  && (
          <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex' }}>
            <GanttChart
              tasks={tasks}
              projectId={id}
              projectName={project.name}
              projectDue={project.due}
              onOpenTask={openTask}
              onTaskCreated={() => openNewTask(id, undefined, project.area)}
            />
          </div>
        )}
        {view === 'table'  && <ProjectList   tasks={tasks} openTask={openTask} projectId={id} />}
        {view === 'cal'    && <ProjectCalendar tasks={tasks} openTask={openTask} />}
      </div>
    </div>
  );
}
