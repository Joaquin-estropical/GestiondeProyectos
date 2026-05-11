import { useState, useEffect, useRef } from 'react';
import { Link2, MoreHorizontal, X, Play, Pause, Plus, AtSign, Paperclip, ArrowUp, Check, Pencil, Flag, Calendar } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { getMember, getProject, fmtDate, dueColor, STATUS_LABELS } from '@/lib/mock-data';
import { updateTask, createSubtask, toggleSubtask, createComment } from '@/lib/db';
import { useSubtasks, useComments } from '@/hooks/useSupabase';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill, AreaPill } from '@/components/shared/Badges';
import type { TaskStatus, TaskPriority } from '@/types';

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pend',  label: 'Pendiente'   },
  { value: 'curso', label: 'En curso'    },
  { value: 'rev',   label: 'En revisión' },
  { value: 'block', label: 'Bloqueada'   },
  { value: 'done',  label: 'Completada'  },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urg',  label: 'Urgente', color: 'var(--red)'    },
  { value: 'alta', label: 'Alta',    color: 'var(--amber)'  },
  { value: 'med',  label: 'Media',   color: 'var(--blue)'   },
  { value: 'baja', label: 'Baja',    color: 'var(--text-3)' },
];

const MEMBERS = [
  { id: 'joa', name: 'Joaquín Rivera'  },
  { id: 'and', name: 'Andrea Mendoza'  },
  { id: 'car', name: 'Carlos Rojas'    },
  { id: 'sof', name: 'Sofía Vargas'    },
  { id: 'die', name: 'Diego Aguilera'  },
];

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks, updateTaskStatus } = useAppStore();
  const t = tasks.find(x => x.id === taskId);

  // time tracker
  const [timing,  setTiming]  = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!timing) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [timing]);

  // subtasks reales
  const { data: subtasks, reload: reloadSubs } = useSubtasks(taskId);
  const [newSub,     setNewSub]     = useState('');
  const [addingSub,  setAddingSub]  = useState(false);
  const subInputRef = useRef<HTMLInputElement>(null);

  // comentarios reales
  const { data: comments, reload: reloadComments } = useComments(taskId);
  const [comment,  setComment]  = useState('');
  const [sending,  setSending]  = useState(false);

  // edición inline de campos
  const [editStatus,   setEditStatus]   = useState(false);
  const [editPriority, setEditPriority] = useState(false);
  const [editAssignee, setEditAssignee] = useState(false);
  const [editDue,      setEditDue]      = useState(false);
  const [editTitle,    setEditTitle]    = useState(false);
  const [titleDraft,   setTitleDraft]   = useState('');

  // guardar cuando cambia el toggle de editTitle
  useEffect(() => {
    if (t) setTitleDraft(t.title);
  }, [taskId, t]);

  if (!t) return null;

  const m = getMember(t.assignee);
  const p = getProject(t.project);
  const fmtSec = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Handlers ──────────────────────────────────────────
  const handleStatusChange = async (status: TaskStatus) => {
    setEditStatus(false);
    updateTaskStatus(t.id, status);
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    setEditPriority(false);
    await updateTask(t.id, { priority });
  };

  const handleAssigneeChange = async (assignee: string) => {
    setEditAssignee(false);
    await updateTask(t.id, { assignee });
  };

  const handleDueChange = async (due: string) => {
    setEditDue(false);
    if (due) await updateTask(t.id, { due });
  };

  const handleTitleSave = async () => {
    setEditTitle(false);
    if (titleDraft.trim() && titleDraft !== t.title) {
      await updateTask(t.id, { title: titleDraft.trim() });
    }
  };

  const handleAddSubtask = async () => {
    if (!newSub.trim()) return;
    setAddingSub(true);
    await createSubtask(t.id, newSub.trim());
    setNewSub('');
    reloadSubs();
    setAddingSub(false);
  };

  const handleToggleSubtask = async (subId: string, done: boolean) => {
    await toggleSubtask(subId, !done, t.id);
    reloadSubs();
  };

  const handleSendComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    await createComment(t.id, 'joa', comment.trim());
    setComment('');
    reloadComments();
    setSending(false);
  };

  const fmtCommentDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diff < 1)  return 'ahora mismo';
    if (diff < 60) return `hace ${diff} min`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
    return fmtDate(iso.split('T')[0]);
  };

  return (
    <>
      <div className="slide-bd" onClick={onClose} />
      <aside className="slide-over">
        <div className="slide-head">
          <div className="row gap-10 items-center">
            <span className="mono f-xs text-3">{t.code}</span>
            <span style={{ flex: 1 }} />
            <button className="btn btn-ghost btn-sm btn-icon"><Link2 size={13} /></button>
            <button className="btn btn-ghost btn-sm btn-icon"><MoreHorizontal size={13} /></button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
          </div>

          {/* Título editable */}
          {editTitle ? (
            <div className="input mt-12" style={{ height: 'auto' }}>
              <input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditTitle(false); }}
                style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.005em' }}
              />
            </div>
          ) : (
            <h2
              style={{ margin: '12px 0 0', fontSize: 20, fontWeight: 600, letterSpacing: '-.005em', lineHeight: 1.3, cursor: 'text' }}
              onClick={() => setEditTitle(true)}
              title="Clic para editar"
            >
              {t.title}
            </h2>
          )}

          <div className="row gap-8 items-center mt-10" style={{ flexWrap: 'wrap' }}>
            {/* Status editable */}
            <div style={{ position: 'relative' }}>
              <div onClick={() => setEditStatus(v => !v)} style={{ cursor: 'pointer' }}>
                <StatusPill status={t.status} />
              </div>
              {editStatus && (
                <div className="dropdown" style={{ top: 28, left: 0, minWidth: 150, zIndex: 100 }}>
                  {STATUS_OPTIONS.map(s => (
                    <div key={s.value} className="dd-item" onClick={() => handleStatusChange(s.value)}>
                      {s.value === t.status && <Check size={11} color="var(--teal)" />}
                      {s.value !== t.status && <span style={{ width: 11 }} />}
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prioridad editable */}
            <div style={{ position: 'relative' }}>
              <div onClick={() => setEditPriority(v => !v)} style={{ cursor: 'pointer' }}>
                <PriorityPill priority={t.priority} />
              </div>
              {editPriority && (
                <div className="dropdown" style={{ top: 28, left: 0, minWidth: 140, zIndex: 100 }}>
                  {PRIORITY_OPTIONS.map(p => (
                    <div key={p.value} className="dd-item" onClick={() => handlePriorityChange(p.value)}>
                      <Flag size={11} color={p.color} />
                      {p.label}
                      {p.value === t.priority && <Check size={11} color="var(--teal)" style={{ marginLeft: 'auto' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AreaPill areaId={t.area} mini />
            <span className="micro" style={{ marginLeft: 'auto' }}>
              {fmtDate(t.due)} 2026
            </span>
          </div>
        </div>

        <div className="slide-body">
          {/* Meta grid */}
          <div className="micro mb-8">Detalles</div>
          <div className="meta-grid">
            {/* Asignado editable */}
            <div className="lbl">Asignado</div>
            <div style={{ position: 'relative' }}>
              <div className="row gap-8 items-center" style={{ cursor: 'pointer' }} onClick={() => setEditAssignee(v => !v)}>
                <Avatar name={m?.name ?? ''} size={22} />
                <span style={{ fontSize: 13 }}>{m?.name ?? t.assignee}</span>
                <Pencil size={10} color="var(--text-3)" />
              </div>
              {editAssignee && (
                <div className="dropdown" style={{ top: 28, left: 0, minWidth: 180, zIndex: 100 }}>
                  {MEMBERS.map(mb => (
                    <div key={mb.id} className="dd-item" onClick={() => handleAssigneeChange(mb.id)}>
                      <Avatar name={mb.name} size={18} />
                      {mb.name}
                      {mb.id === t.assignee && <Check size={11} color="var(--teal)" style={{ marginLeft: 'auto' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fecha editable */}
            <div className="lbl">Fecha límite</div>
            <div style={{ position: 'relative' }}>
              {editDue ? (
                <input
                  type="date"
                  defaultValue={t.due}
                  autoFocus
                  onBlur={e => handleDueChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setEditDue(false); }}
                  style={{ background: 'transparent', border: '1px solid var(--teal)', borderRadius: 4, padding: '2px 6px', color: 'var(--text-1)', fontSize: 12, colorScheme: 'dark' }}
                />
              ) : (
                <div
                  className="row gap-6 items-center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setEditDue(true)}
                >
                  <span className="mono f-sm" style={{ color: dueColor(t.due) }}>{fmtDate(t.due)} 2026</span>
                  <Calendar size={11} color="var(--text-3)" />
                </div>
              )}
            </div>

            <div className="lbl">Estado</div>
            <div style={{ cursor: 'pointer' }} onClick={() => setEditStatus(v => !v)}>
              <StatusPill status={t.status} />
            </div>

            <div className="lbl">Prioridad</div>
            <div style={{ cursor: 'pointer' }} onClick={() => setEditPriority(v => !v)}>
              <PriorityPill priority={t.priority} />
            </div>

            <div className="lbl">Área</div>
            <div><AreaPill areaId={t.area} mini /></div>

            <div className="lbl">Proyecto</div>
            <div style={{ fontSize: 13 }}>{p?.name ?? t.project}</div>

            <div className="lbl">Tiempo total</div>
            <div className="mono f-sm">{t.time}</div>
          </div>

          {/* Time tracker */}
          <div className="micro mt-24 mb-8">Tiempo</div>
          <div className="card-pad" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="btn btn-primary btn-md btn-icon"
              style={{ width: 40, height: 40, borderRadius: 999 }}
              onClick={() => setTiming(v => !v)}
            >
              {timing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '.02em', color: timing ? 'var(--teal)' : 'var(--text-1)' }}>
                {fmtSec(elapsed)}
              </div>
              <div className="f-xs text-2 mt-4">{timing ? 'Cronometrando ahora...' : `Total registrado: ${t.time}`}</div>
            </div>
          </div>

          {/* Subtasks reales */}
          <div className="row between items-center mt-24 mb-8">
            <span className="micro">
              Subtareas
              <span className="mono" style={{ marginLeft: 4 }}>
                {subtasks.filter(s => s.done).length}/{subtasks.length}
              </span>
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setNewSub(''); setTimeout(() => subInputRef.current?.focus(), 50); }}
            >
              <Plus size={13} /> Agregar
            </button>
          </div>
          <div className="card-pad" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: 0 }}>
            {subtasks.map((s, i) => (
              <div
                key={s.id}
                style={{ padding: '10px 14px', borderBottom: i < subtasks.length - 1 || newSub !== '' ? '1px solid var(--border)' : '', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span
                  className={`check ${s.done ? 'done' : ''}`}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => handleToggleSubtask(s.id, s.done)}
                />
                <span style={{ flex: 1, fontSize: 13, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--text-2)' : 'var(--text-1)' }}>
                  {s.title}
                </span>
                {s.assignee && (
                  <Avatar name={getMember(s.assignee)?.name ?? s.assignee} size={18} />
                )}
              </div>
            ))}

            {/* Input nueva subtarea */}
            <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="check" style={{ flexShrink: 0 }} />
              <input
                ref={subInputRef}
                value={newSub}
                onChange={e => setNewSub(e.target.value)}
                placeholder="Nueva subtarea..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSub.trim()) handleAddSubtask();
                  if (e.key === 'Escape') setNewSub('');
                }}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-1)' }}
              />
              {newSub.trim() && (
                <button
                  className="btn btn-primary btn-sm btn-icon"
                  style={{ width: 22, height: 22 }}
                  onClick={handleAddSubtask}
                  disabled={addingSub}
                >
                  <Check size={11} />
                </button>
              )}
            </div>

            {subtasks.length === 0 && !newSub && (
              <div style={{ padding: '8px 14px 12px', color: 'var(--text-3)', fontSize: 12 }}>
                Sin subtareas. Hacé clic en "Agregar" para crear la primera.
              </div>
            )}
          </div>

          {/* Comentarios reales */}
          <div className="micro mt-24 mb-8">Comentarios</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {comments.map(c => {
              const author = getMember(c.author);
              return (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <Avatar name={author?.name ?? c.author} size={26} />
                  <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                    <div>
                      <span className="fw-5">{author?.short ?? c.author}</span>
                      <span className="mono f-xs text-3" style={{ marginLeft: 8 }}>{fmtCommentDate(c.created_at)}</span>
                    </div>
                    <div className="text-1 mt-4" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && (
              <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Sin comentarios todavía.</div>
            )}
          </div>

          {/* Input comentario */}
          <div className="row gap-8 mt-16">
            <Avatar name="Joaquín Rivera" size={26} />
            <div className="input" style={{ flex: 1, height: 'auto', padding: '8px 12px' }}>
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Escribí un comentario..."
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSendComment(); }}
              />
              <button className="btn btn-ghost btn-sm btn-icon"><AtSign size={13} /></button>
              <button className="btn btn-ghost btn-sm btn-icon"><Paperclip size={13} /></button>
              <button
                className="btn btn-primary btn-sm btn-icon"
                onClick={handleSendComment}
                disabled={sending || !comment.trim()}
              >
                <ArrowUp size={12} />
              </button>
            </div>
          </div>

          {/* Actividad */}
          <div className="micro mt-24 mb-8">Actividad</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: 'var(--text-2)' }}>
            <div>
              <span style={{ color: 'var(--text-1)' }}>Joaquín</span> cambió estado a{' '}
              <span className="fw-5" style={{ color: 'var(--text-1)' }}>{STATUS_LABELS[t.status]}</span>
              {' · '}<span className="mono">hace 3h</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-1)' }}>IA</span> sugirió mover la fecha a +2 días · <span className="mono">ayer</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
