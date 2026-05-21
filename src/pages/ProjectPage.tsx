import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core';
import { List, Kanban, GanttChart as GanttIcon, Calendar, Table, UserPlus, MoreHorizontal, Filter, ArrowDownWideNarrow, Plus, CheckSquare, MessageSquare, ChevronLeft, ChevronRight, X, Pen, Trash2, User, AlertTriangle } from 'lucide-react';
import { useProjects, useTasks, useMembers } from '@/hooks/useSupabase';
import { getMember, STATUS_ORDER, STATUS_LABELS, fmtDate, dueColor } from '@/lib/mock-data';
import { useAppStore } from '@/stores/app';
import { updateTask } from '@/lib/db';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill, AreaPill } from '@/components/shared/Badges';
import { GanttChart } from '@/components/shared/GanttChart';
import type { Task, TaskStatus } from '@/types';

// ─── Project actions dropdown ───
function ProjectActionsMenu({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { openEditProject, removeProject, refreshAll } = useAppStore();
  const navigate = useNavigate();

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

  const handleDelete = async () => {
    setPos(null);
    if (!confirm(`¿Eliminar el proyecto "${projectName}" y todas sus tareas? Esta acción no se puede deshacer.`)) return;
    try {
      const { deleteProject } = await import('@/lib/db');
      await deleteProject(projectId);
      removeProject(projectId);
      await refreshAll();
      navigate('/');
    } catch (e) {
      alert('Error al eliminar el proyecto: ' + (e instanceof Error ? e.message : String(e)));
    }
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
          {item(<Trash2 size={13} color="var(--red)" />, 'Eliminar proyecto', 'var(--red)', handleDelete)}
        </div>
      )}
    </>
  );
}

// ─── Project Header (info only, no tabs) ───
function ProjectHeader({ project, tasks, onNewTask }: { project: NonNullable<ReturnType<typeof useProjects>['data']>[0]; tasks: Task[]; onNewTask: () => void }) {
  const { data: members = [] } = useMembers();
  const navigate = useNavigate();
  const assigneeIds = [...new Set(tasks.map(t => t.assignee))].slice(0, 5);
  return (
    <div className="proj-header" style={{ padding: '20px 32px 12px' }}>
      <div className="row gap-12 items-center proj-header-row">
        <AreaPill areaId={project.area} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40vw' }}>{project.name}</h1>
        <span className="pill pill-status-curso" style={{ marginLeft: 4, flexShrink: 0 }}><span className="dot"></span>En curso</span>
        <span style={{ marginLeft: 'auto' }} className="avatar-stack avatar-stack-bordered">
          {assigneeIds.map(id => {
            const m = members.find(x => x.id === id) ?? getMember(id);
            return <Avatar key={id} name={m?.name ?? id} size={26} />;
          })}
        </span>
        <button className="btn btn-secondary btn-sm"><UserPlus size={14} /></button>
        <button
          className="btn btn-secondary btn-sm"
          title="Asignar planilla a este proyecto"
          onClick={() => navigate(`/planillas?assign=${project.id}`)}
        >
          <CheckSquare size={14} /> <span className="view-tab-label">Planilla</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={onNewTask}>
          <Plus size={14} /> <span className="view-tab-label">Nueva tarea</span>
        </button>
        <ProjectActionsMenu projectId={project.id} projectName={project.name} />
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
    <div className="proj-tabs row gap-12 items-center" style={{ borderBottom: '1px solid var(--border)', padding: '0 32px', flexShrink: 0, background: 'var(--bg)' }}>
      <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
        {VIEW_TABS.map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`tab ${view === v.id ? 'active' : ''}`}
            style={{ borderRadius: 0, padding: '8px 10px', color: view === v.id ? 'var(--text-1)' : 'var(--text-2)', background: 'transparent', border: 0, borderBottom: view === v.id ? '2px solid var(--teal)' : '2px solid transparent', whiteSpace: 'nowrap' }}
          >
            <v.Icon size={13} /> <span className="view-tab-label">{v.label}</span>
          </button>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexShrink: 0 }}>
        <button className="btn btn-secondary btn-sm hide-mob"><Filter size={14} /> Filtros</button>
        <button className="btn btn-secondary btn-sm hide-mob"><ArrowDownWideNarrow size={14} /> Agrupar</button>
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
    <div className="proj-list" style={{ padding: '8px 32px 48px', overflowX: 'auto' }}>
      <table className="table" style={{ minWidth: 480 }}>
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <th>Nombre</th>
            <th className="table-col-assignee" style={{ width: 130 }}>Asignado</th>
            <th style={{ width: 100 }}>Fecha</th>
            <th style={{ width: 90 }}>Prioridad</th>
            <th style={{ width: 120 }}>Estado</th>
            <th className="table-col-time" style={{ width: 70 }}>Tiempo</th>
            <th className="table-col-comments" style={{ width: 60 }}><MessageSquare size={12} /></th>
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
                    <td className="table-col-assignee">
                      <div className="row gap-6 items-center">
                        <Avatar name={m.name} size={22} />
                        <span className="f-xs text-2">{m.short}</span>
                        {t.helper && (() => { const h = getMember(t.helper); return h ? <Avatar name={h.name} size={18} style={{ opacity: 0.7 }} title={`Auxiliar: ${h.name}`} /> : null; })()}
                      </div>
                    </td>
                    <td><span className="mono f-xs" style={{ color: dueColor(t.due) }}>{fmtDate(t.due)}</span></td>
                    <td><PriorityPill priority={t.priority} /></td>
                    <td><StatusPill status={t.status} /></td>
                    <td className="table-col-time"><span className="mono f-xs text-2">{t.time !== '0h' ? t.time : '—'}</span></td>
                    <td className="table-col-comments"><span className="f-xs text-3 mono">{t.comments > 0 ? t.comments : ''}</span></td>
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

// Extract block-note tag from task tags array
function getBlockNote(t: Task): string | null {
  const tag = t.tags.find(x => x.startsWith('block-note:'));
  return tag ? tag.slice(11) : null;
}

// Droppable column wrapper for dnd-kit
function KanDroppable({ id, children, isOver }: { id: string; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`kan-col-body ${isOver ? 'dragover' : ''}`} style={{ minHeight: 100 }}>
      {children}
    </div>
  );
}

// Draggable card wrapper for dnd-kit
function KanDraggable({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}>
      {children}
    </div>
  );
}

function ProjectKanban({ tasks: _tasksProp, openTask, projectId }: { tasks: Task[]; openTask: (id: string) => void; projectId: string }) {
  const { tasks: storeTasks, updateTaskStatus, patchTask, openNewTask } = useAppStore();
  const { data: members = [] } = useMembers();

  const tasks = storeTasks.filter(t => t.project === projectId);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCol,  setOverCol]  = useState<string | null>(null);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [prompt,   setPrompt]   = useState<{ taskId: string; newStatus: TaskStatus } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const commitMove = async (id: string, newStatus: TaskStatus, patch?: { helper?: string | null; tags?: string[] }) => {
    updateTaskStatus(id, newStatus);
    if (patch) patchTask(id, patch);
    setSaving(id);
    await updateTask(id, { status: newStatus, ...patch }).catch(console.error);
    setSaving(null);
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const onDragOver  = (event: DragOverEvent)  => setOverCol(event.over ? String(event.over.id) : null);
  const onDragEnd   = async (event: DragEndEvent) => {
    setActiveId(null); setOverCol(null);
    const id = String(event.active.id);
    const newStatus = event.over ? String(event.over.id) as TaskStatus : null;
    if (!newStatus) return;
    const task = tasks.find(t => t.id === id);
    if (!task || task.status === newStatus) return;
    if (newStatus === 'rev' || newStatus === 'block') {
      setPrompt({ taskId: id, newStatus });
    } else {
      const cleanTags = task.tags.filter(x => !x.startsWith('block-note:'));
      commitMove(id, newStatus, { tags: cleanTags });
    }
  };

  const handlePromptConfirm = async (data: { reviewer?: string; blockNote?: string }) => {
    if (!prompt) return;
    const task = tasks.find(t => t.id === prompt.taskId);
    if (!task) { setPrompt(null); return; }
    const cleanTags = task.tags.filter(x => !x.startsWith('block-note:'));
    const newTags   = data.blockNote ? [...cleanTags, `block-note:${data.blockNote}`] : cleanTags;
    await commitMove(prompt.taskId, prompt.newStatus, {
      helper: data.reviewer !== undefined ? data.reviewer : task.helper,
      tags:   newTags,
    });
    setPrompt(null);
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

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
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="kanban">
        {STATUS_ORDER.map(s => {
          const list = tasks.filter(t => t.status === s);
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

              <KanDroppable id={s} isOver={overCol === s}>
                {list.map(t => {
                  const m        = getMember(t.assignee);
                  const isSaving = saving === t.id;
                  const isDone   = t.status === 'done';
                  const blockNote = getBlockNote(t);
                  const reviewer  = t.status === 'rev' && t.helper
                    ? (members.find(x => x.id === t.helper) ?? getMember(t.helper))
                    : null;

                  return (
                    <KanDraggable key={t.id} id={t.id}>
                    <div
                      className="kan-card"
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
                        marginBottom: 10,
                        wordBreak: 'break-word',
                      }}>
                        {t.title}
                      </div>

                      {/* Reviewer badge — visible when status = 'rev' and reviewer set */}
                      {reviewer && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 8px', borderRadius: 5, marginBottom: 8,
                          background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)',
                        }}>
                          <User size={11} color="var(--amber)" />
                          <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500, flex: 1 }}>
                            Revisor: {reviewer.name.split(' ')[0]} {reviewer.name.split(' ')[1] ?? ''}
                          </span>
                          <Avatar name={reviewer.name} size={16} />
                        </div>
                      )}

                      {/* Block note badge — visible when status = 'block' */}
                      {t.status === 'block' && blockNote && (
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: 6,
                          padding: '5px 8px', borderRadius: 5, marginBottom: 8,
                          background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
                        }}>
                          <AlertTriangle size={11} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 11, color: 'var(--red)', lineHeight: 1.4 }}>
                            {blockNote}
                          </span>
                        </div>
                      )}

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        {m && <Avatar name={m.name} size={22} title={m.name} />}
                        {t.helper && (() => { const h = getMember(t.helper); return h ? <Avatar name={h.name} size={18} style={{ opacity: 0.6 }} title={`Auxiliar: ${h.name}`} /> : null; })()}
                        <span style={{ flex: 1, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: dueColor(t.due) }}>{fmtDate(t.due)}</span>
                        {t.comments > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}>
                            <MessageSquare size={10} />{t.comments}
                          </span>
                        )}
                      </div>
                    </div>
                    </KanDraggable>
                  );
                })}

                {list.length === 0 && (
                  <div style={{ padding: '20px 12px', color: 'var(--text-3)', fontSize: 12, textAlign: 'center', borderRadius: 6, border: '1px dashed var(--border)', margin: '0 2px' }}>
                    Sin tareas
                  </div>
                )}
              </KanDroppable>
            </div>
          );
        })}
      </div>
      {/* Drag overlay — shows a ghost while dragging */}
      <DragOverlay>
        {activeTask ? (
          <div className="kan-card" style={{ borderLeft: `4px solid ${KAN_STATUS_COLORS[activeTask.status]}`, opacity: 0.9, boxShadow: '0 8px 24px rgba(0,0,0,.5)' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{activeTask.title}</div>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>
    </>
  );
}

// ─── Project Calendar ───
function ProjectCalendar({ tasks, openTask }: { tasks: Task[]; openTask: (id: string) => void }) {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showSide, setShowSide] = useState(true);

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
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Calendar grid — fills all available space */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={prev}><ChevronLeft size={14} /></button>
          <span style={{ fontWeight: 600, fontSize: 14, minWidth: 150, textAlign: 'center' }}>{MONTHS_FULL[month]} {year}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={next}><ChevronRight size={14} /></button>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 4 }} onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSel(todayIso); }}>Hoy</button>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            style={{ marginLeft: 'auto' }}
            title={showSide ? 'Ocultar panel' : 'Mostrar panel'}
            onClick={() => setShowSide(v => !v)}
          >
            <ChevronRight size={14} style={{ transform: showSide ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform .2s' }} />
          </button>
        </div>

        {/* Grid — overflow hidden so it never pushes past parent */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {DAYS.map(d => (
              <div key={d} className="cal-wkh" style={{ borderRight: '1px solid var(--border)', textAlign: 'center' }}>{d}</div>
            ))}
          </div>
          {/* Cells — fill height evenly */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(7,1fr)',
            gridAutoRows: `${Math.floor(100 / Math.ceil(cells.length / 7))}%`,
            borderLeft: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
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
                  style={{ minHeight: 0, overflow: 'hidden' }}
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
      </div>

      {/* Day detail sidebar — collapsible */}
      {showSide && (
        <aside style={{ width: 260, flexShrink: 0, borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: '16px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: 8 }}>Detalle del día</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {sel ? new Date(sel + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, marginBottom: 14 }}>{dayTasks.length} tareas</div>
          {dayTasks.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Sin tareas en este día.</div>}
          {dayTasks.map(t => (
            <div key={t.id} className="card" style={{ padding: '10px 12px', cursor: 'pointer', marginBottom: 6 }} onClick={() => openTask(t.id)}>
              <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 6 }}>{t.title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <StatusPill status={t.status} />
                <PriorityPill priority={t.priority} />
              </div>
            </div>
          ))}
        </aside>
      )}
    </div>
  );
}

// ─── Main export ───
const HEADER_MIN = 80;
const HEADER_MAX = 320;
const HEADER_DEFAULT = 210;

export default function ProjectPage() {
  const { projectId }       = useParams<{ projectId: string }>();
  const [searchParams]      = useSearchParams();
  const { openTask, openNewTask } = useAppStore();
  const [view, setView]     = useState('list');
  const [headerH, setHeaderH] = useState(HEADER_DEFAULT);
  const id                  = projectId ?? '';

  // Open task from query param (e.g. navigating from Mi Día)
  useEffect(() => {
    const taskParam = searchParams.get('task');
    if (taskParam) openTask(taskParam);
  // Only on mount / when taskParam changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('task')]);

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
