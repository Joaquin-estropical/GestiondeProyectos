import { useState, useEffect, useRef, useCallback } from 'react';
import { Link2, MoreHorizontal, X, Plus, AtSign, ArrowUp, Check, Flag, Calendar, ChevronRight, Trash2, AlertTriangle, User, GitMerge, Clock, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { getMember, getProject, fmtDate, dueColor, STATUS_LABELS } from '@/lib/mock-data';
import { updateTask, deleteTask, createSubtask, toggleSubtask, createComment, createTaskDependency, deleteTaskDependency, fetchTaskDependencies, fetchTaskEvents, createTaskEvent } from '@/lib/db';
import { useSubtasks, useComments, useMembers } from '@/hooks/useSupabase';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill } from '@/components/shared/Badges';
import { sortedMembers } from '@/lib/auth';
import type { TaskStatus, TaskPriority, TaskDependency, TaskEvent } from '@/types';

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pend',  label: 'Sin iniciar',  color: 'var(--text-3)' },
  { value: 'curso', label: 'En curso',     color: 'var(--blue)'   },
  { value: 'rev',   label: 'En revisión',  color: 'var(--amber)'  },
  { value: 'block', label: 'Bloqueada',    color: 'var(--red)'    },
  { value: 'done',  label: 'Completada',   color: 'var(--green)'  },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urg',  label: 'Urgente', color: 'var(--red)'    },
  { value: 'alta', label: 'Alta',    color: 'var(--amber)'  },
  { value: 'med',  label: 'Media',   color: 'var(--blue)'   },
  { value: 'baja', label: 'Baja',    color: 'var(--text-3)' },
];

// Compact inline select dropdown
function InlineSelect<T extends string>({
  value, options, onSelect, renderTrigger,
}: {
  value: T;
  options: { value: T; label: string; color?: string }[];
  onSelect: (v: T) => void;
  renderTrigger: () => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <div style={{ cursor: 'pointer' }} onClick={() => setOpen(v => !v)}>{renderTrigger()}</div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
          background: 'var(--surface-2)', border: '1px solid var(--border-hover)',
          borderRadius: 8, padding: '4px 0', minWidth: 160,
          boxShadow: '0 8px 24px rgba(0,0,0,.6)',
        }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onSelect(o.value); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'none', border: 'none',
                color: o.color ?? 'var(--text-1)', fontSize: 13, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {o.value === value && <Check size={11} color="var(--teal)" />}
              {o.value !== value && <span style={{ width: 11 }} />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Member picker dropdown
function MemberPicker({ value, members, onSelect, placeholder = 'Sin asignar' }: {
  value: string | null;
  members: { id: string; name: string; role: string }[];
  onSelect: (id: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);
  const selected = members.find(m => m.id === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', cursor: 'pointer', width: '100%',
          color: 'var(--text-1)', fontSize: 13,
          transition: 'border-color .12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        {selected ? (
          <><Avatar name={selected.name} size={20} /><span style={{ flex: 1, textAlign: 'left' }}>{selected.name}</span></>
        ) : (
          <><User size={14} color="var(--text-3)" /><span style={{ flex: 1, textAlign: 'left', color: 'var(--text-3)' }}>{placeholder}</span></>
        )}
        <ChevronRight size={12} color="var(--text-3)" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 200,
          background: 'var(--surface-2)', border: '1px solid var(--border-hover)',
          borderRadius: 8, padding: '4px 0', maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,.6)',
        }}>
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12.5, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <X size={13} /> {placeholder}
            {!value && <Check size={11} color="var(--teal)" style={{ marginLeft: 'auto' }} />}
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '2px 8px' }} />
          {members.map(m => (
              <button
                key={m.id}
                onClick={() => { onSelect(m.id); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Avatar name={m.name} size={20} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 400 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.role}</div>
                </div>
                {m.id === value && <Check size={11} color="var(--teal)" />}
              </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks, projects, areas, updateTaskStatus, patchTask, removeTask, currentUser } = useAppStore();
  const { data: membersFromDB = [] } = useMembers();
  const allMembers = sortedMembers(membersFromDB);

  const t = tasks.find(x => x.id === taskId);

  const { data: subtasks, reload: reloadSubs } = useSubtasks(taskId);
  const { data: comments, reload: reloadComments } = useComments(taskId);

  const [newSub,    setNewSub]    = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [comment,   setComment]   = useState('');
  const [sending,   setSending]   = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleDraft,setTitleDraft]= useState('');
  const [editDesc,  setEditDesc]  = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const subInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dependencies
  const [deps, setDeps]           = useState<TaskDependency[]>([]);
  const [addingDep, setAddingDep] = useState(false);
  const [newDepId, setNewDepId]   = useState('');
  const [newDepType, setNewDepType] = useState<'finish_to_start' | 'start_to_start' | 'finish_to_finish'>('finish_to_start');

  // Task events / history
  const [events, setEvents]       = useState<TaskEvent[]>([]);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<string | null>(null);

  useEffect(() => {
    if (t) { setTitleDraft(t.title); setDescDraft(t.description ?? ''); }
  }, [taskId, t]);

  useEffect(() => {
    if (!t) return;
    fetchTaskDependencies(t.project).then(setDeps).catch(() => {});
    fetchTaskEvents(taskId).then(setEvents).catch(() => {});
  }, [taskId, t]);

  const flashSaved = useCallback(() => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }, []);

  if (!t) return null;

  const p    = projects.find(x => x.id === t.project) ?? getProject(t.project);
  const area = areas.find(x => x.id === t.area);

  // ── Handlers ──
  const save = useCallback(async (patch: Parameters<typeof updateTask>[1]) => {
    if (!t) return;
    // Optimistic store update immediately
    if (patch.status) updateTaskStatus(t.id, patch.status);
    const { status: _, ...rest } = patch;
    if (Object.keys(rest).length) patchTask(t.id, rest as Partial<typeof t>);
    // Debounced DB write
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await updateTask(t.id, patch);
      flashSaved();
    }, 400);
  }, [t, updateTaskStatus, patchTask, flashSaved]);

  const handleTitleSave = async () => {
    setEditTitle(false);
    if (titleDraft.trim() && titleDraft !== t.title) await save({ title: titleDraft.trim() });
  };

  const handleDueSave = (newDue: string) => {
    if (!t || newDue === t.due) return;
    if (t.status !== 'done') {
      // Intercept date change to ask for reason
      setPendingDateChange(newDue);
      setShowRescheduleModal(true);
    } else {
      save({ due: newDue });
    }
  };

  const confirmReschedule = async () => {
    if (!t || !pendingDateChange) return;
    await save({ due: pendingDateChange });
    await createTaskEvent({
      task_id: t.id, user_id: currentUser.id,
      event_type: 'date_changed',
      old_value: { due: t.due },
      new_value: { due: pendingDateChange },
      reason: rescheduleReason.trim() || undefined,
    }).catch(() => {});
    setShowRescheduleModal(false);
    setPendingDateChange(null);
    setRescheduleReason('');
    fetchTaskEvents(taskId).then(setEvents).catch(() => {});
  };

  const handleAddDep = async () => {
    if (!t || !newDepId || newDepId === t.id) return;
    setAddingDep(true);
    try {
      await createTaskDependency(t.project, newDepId, t.id, newDepType);
      const updated = await fetchTaskDependencies(t.project);
      setDeps(updated);
      setNewDepId('');
    } catch {}
    setAddingDep(false);
  };

  const handleRemoveDep = async (dep: TaskDependency) => {
    if (!t) return;
    await deleteTaskDependency(dep.predecessor_id, dep.successor_id).catch(() => {});
    const updated = await fetchTaskDependencies(t.project);
    setDeps(updated);
  };

  const handleDescSave = async () => {
    setEditDesc(false);
    if (descDraft !== (t.description ?? '')) await save({ description: descDraft });
  };

  const handleAddSubtask = async () => {
    if (!newSub.trim()) return;
    setAddingSub(true);
    const sub = await createSubtask(t.id, newSub.trim());
    setNewSub('');
    reloadSubs();
    setAddingSub(false);
    // Create finish-to-start dependency: parent task → subtask (as a linked task)
    // Subtask is a checklist item, not a separate Task, so we link via task_dependencies
    // using the parent task id as predecessor and the subtask's task_id (same) — skip Gantt dep
    // Instead, when user adds a subtask title that matches an existing task title, link them.
    // For now: if the project has a task matching the subtask title, create the dep.
    const siblingTask = tasks.find(tk => tk.project === t.project && tk.title === newSub.trim() && tk.id !== t.id);
    if (siblingTask) {
      await createTaskDependency(t.project, t.id, siblingTask.id, 'finish_to_start').catch(() => {});
    }
    void sub;
  };

  const handleToggleSubtask = async (subId: string, done: boolean) => {
    await toggleSubtask(subId, !done, t.id);
    reloadSubs();
  };

  const handleSendComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    await createComment(t.id, currentUser.id, comment.trim());
    setComment('');
    reloadComments();
    setSending(false);
  };

  const fmtCommentDate = (iso: string) => {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1)   return 'ahora';
    if (diff < 60)  return `hace ${diff}m`;
    if (diff < 1440) return `hace ${Math.floor(diff / 60)}h`;
    return fmtDate(iso.split('T')[0]);
  };

  const blockNote = t.tags.find(x => x.startsWith('block-note:'))?.slice(11) ?? null;
  const reviewer  = t.status === 'rev' && t.helper ? allMembers.find(x => x.id === t.helper) ?? getMember(t.helper) : null;

  const subtasksDone  = subtasks.filter(s => s.done).length;
  const subtasksPct   = subtasks.length > 0 ? Math.round(subtasksDone / subtasks.length * 100) : 0;

  return (
    <>
      {/* Modal: justificación de reprogramación */}
      {showRescheduleModal && (
        <>
          <div className="modal-bd" style={{ zIndex: 310 }} onClick={() => setShowRescheduleModal(false)} />
          <div className="modal" style={{ zIndex: 320, maxWidth: 420 }}>
            <div className="modal-head">
              <AlertTriangle size={15} color="var(--amber)" />
              <span className="fw-6" style={{ fontSize: 14 }}>Motivo del cambio de fecha</span>
              <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setShowRescheduleModal(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
                Estás cambiando la fecha límite de una tarea no completada. Ingresá el motivo (opcional pero recomendado para el historial).
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>De: <b style={{ color: 'var(--text-1)' }}>{t.due}</b></span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>→ A: <b style={{ color: 'var(--teal)' }}>{pendingDateChange}</b></span>
              </div>
              <textarea
                autoFocus
                value={rescheduleReason}
                onChange={e => setRescheduleReason(e.target.value)}
                placeholder="Ej: Cliente solicitó extensión, tarea depende de entrega externa..."
                style={{
                  width: '100%', boxSizing: 'border-box', minHeight: 80,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 12px', color: 'var(--text-1)',
                  fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.5,
                }}
              />
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary btn-md" onClick={() => { setShowRescheduleModal(false); setPendingDateChange(null); }}>Cancelar</button>
              <button className="btn btn-primary btn-md" onClick={confirmReschedule}>Confirmar cambio</button>
            </div>
          </div>
        </>
      )}

      <div className="slide-bd" onClick={onClose} />
      <aside className="slide-over" style={{ width: 520 }}>

        {/* ── Top bar ── */}
        <div style={{
          padding: '14px 20px 0',
          display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '.04em' }}>{t.code}</span>
          <span style={{ flex: 1 }} />
          {savedFlash && (
            <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500, transition: 'opacity .3s' }}>
              <Check size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Guardado
            </span>
          )}
          <button className="btn btn-ghost btn-sm btn-icon" title="Copiar enlace"><Link2 size={13} /></button>
          <button className="btn btn-ghost btn-sm btn-icon"><MoreHorizontal size={13} /></button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
        </div>

        {/* ── Title ── */}
        <div style={{ padding: '10px 20px 0', flexShrink: 0 }}>
          {editTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditTitle(false); }}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text-1)',
                lineHeight: 1.3,
              }}
            />
          ) : (
            <h2
              onClick={() => setEditTitle(true)}
              style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.3, cursor: 'text', color: 'var(--text-1)' }}
              title="Clic para editar"
            >
              {t.title}
            </h2>
          )}

          {/* Status/Priority pills row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <InlineSelect
              value={t.status}
              options={STATUS_OPTIONS}
              onSelect={v => save({ status: v })}
              renderTrigger={() => <StatusPill status={t.status} />}
            />
            <InlineSelect
              value={t.priority}
              options={PRIORITY_OPTIONS.map(o => ({ value: o.value, label: o.label, color: o.color }))}
              onSelect={v => save({ priority: v as TaskPriority })}
              renderTrigger={() => <PriorityPill priority={t.priority} />}
            />
            {area && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)', fontSize: 11.5, color: 'var(--text-2)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: area.color }} />
                {area.name}
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: dueColor(t.due) }}>
              {fmtDate(t.due)}
            </span>
          </div>

          {/* Reviewer / block note alerts */}
          {reviewer && (
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', borderRadius: 6,
              background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
            }}>
              <User size={12} color="var(--amber)" />
              <span style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 500 }}>En revisión con {reviewer.name}</span>
              <Avatar name={reviewer.name} size={18} style={{ marginLeft: 'auto' }} />
            </div>
          )}
          {t.status === 'block' && blockNote && (
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '7px 10px', borderRadius: 6,
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
            }}>
              <AlertTriangle size={12} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5 }}><b>Bloqueo:</b> {blockNote}</span>
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0 0' }} />

        {/* ── Scrollable body ── */}
        <div className="slide-body" style={{ padding: '0 0 32px' }}>

          {/* FIELDS GRID */}
          <div style={{ padding: '18px 20px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: 14, alignItems: 'start' }}>

              {/* Asignado */}
              <FieldLabel>Asignado</FieldLabel>
              <MemberPicker
                value={t.assignee}
                members={allMembers}
                onSelect={id => id && save({ assignee: id })}
                placeholder="Sin asignar"
              />

              {/* Auxiliar */}
              <FieldLabel>Auxiliar</FieldLabel>
              <MemberPicker
                value={t.helper}
                members={allMembers}
                onSelect={id => save({ helper: id })}
                placeholder="Sin auxiliar"
              />

              {/* Fecha límite */}
              <FieldLabel>Fecha límite</FieldLabel>
              <div>
                <DateField value={t.due} onChange={handleDueSave} />
                {t.status !== 'done' && t.due < new Date().toISOString().split('T')[0] && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 8px', borderRadius: 999, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
                    <AlertCircle size={10} /> ATRASADA
                  </div>
                )}
              </div>

              {/* Estado */}
              <FieldLabel>Estado</FieldLabel>
              <InlineSelect
                value={t.status}
                options={STATUS_OPTIONS}
                onSelect={v => save({ status: v })}
                renderTrigger={() => (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer' }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: STATUS_OPTIONS.find(x => x.value === t.status)?.color }} />
                    {STATUS_LABELS[t.status]}
                    <ChevronRight size={11} color="var(--text-3)" style={{ marginLeft: 2 }} />
                  </div>
                )}
              />

              {/* Prioridad */}
              <FieldLabel>Prioridad</FieldLabel>
              <InlineSelect
                value={t.priority}
                options={PRIORITY_OPTIONS.map(o => ({ value: o.value, label: o.label, color: o.color }))}
                onSelect={v => save({ priority: v as TaskPriority })}
                renderTrigger={() => (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer' }}>
                    <Flag size={11} color={PRIORITY_OPTIONS.find(x => x.value === t.priority)?.color} />
                    {PRIORITY_OPTIONS.find(x => x.value === t.priority)?.label}
                    <ChevronRight size={11} color="var(--text-3)" style={{ marginLeft: 2 }} />
                  </div>
                )}
              />

              {/* Proyecto */}
              <FieldLabel>Proyecto</FieldLabel>
              <span style={{ fontSize: 13, color: 'var(--text-1)', padding: '5px 0' }}>{p?.name ?? t.project}</span>

              {/* Área */}
              {area && (
                <>
                  <FieldLabel>Área</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: area.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13 }}>{area.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* DESCRIPTION */}
          <SectionDivider label="Descripción" />
          <div style={{ padding: '0 20px' }}>
            {editDesc ? (
              <textarea
                autoFocus
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                onBlur={handleDescSave}
                onKeyDown={e => { if (e.key === 'Escape') handleDescSave(); }}
                placeholder="Agregar descripción..."
                style={{
                  width: '100%', minHeight: 80, background: 'var(--surface-2)',
                  border: '1px solid var(--teal)', borderRadius: 6, padding: '8px 12px',
                  color: 'var(--text-1)', fontSize: 13, resize: 'vertical',
                  outline: 'none', lineHeight: 1.6, boxSizing: 'border-box',
                }}
              />
            ) : (
              <div
                onClick={() => setEditDesc(true)}
                style={{
                  minHeight: 36, padding: '6px 10px', borderRadius: 6,
                  fontSize: 13, lineHeight: 1.6, cursor: 'text',
                  color: t.description ? 'var(--text-1)' : 'var(--text-3)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  transition: 'border-color .12s, background .12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {t.description || 'Agregar descripción...'}
              </div>
            )}
          </div>

          {/* SUBTASKS */}
          <SectionDivider
            label={`Subtareas ${subtasks.length > 0 ? `${subtasksDone}/${subtasks.length}` : ''}`}
            action={
              <button
                className="btn btn-ghost btn-sm"
                style={{ height: 24, fontSize: 12 }}
                onClick={() => setTimeout(() => subInputRef.current?.focus(), 50)}
              >
                <Plus size={12} /> Agregar
              </button>
            }
          />
          <div style={{ padding: '0 20px' }}>
            {subtasks.length > 0 && (
              <div className="progress" style={{ marginBottom: 10 }}>
                <div style={{ width: subtasksPct + '%', background: 'var(--teal)', transition: 'width .3s' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {subtasks.map(s => (
                <div
                  key={s.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 6, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className={`check ${s.done ? 'done' : ''}`}
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                    onClick={() => handleToggleSubtask(s.id, s.done)}
                  />
                  <span style={{ flex: 1, fontSize: 13, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--text-3)' : 'var(--text-1)' }}>
                    {s.title}
                  </span>
                </div>
              ))}

              {/* New subtask input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 6, border: '1px dashed var(--border)', marginTop: subtasks.length > 0 ? 4 : 0 }}>
                <span className="check" style={{ flexShrink: 0, opacity: 0.4 }} />
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
                <p style={{ margin: '4px 10px', fontSize: 12, color: 'var(--text-3)' }}>
                  Sin subtareas. Presioná "Agregar" para crear la primera.
                </p>
              )}
            </div>
          </div>

          {/* COMMENTS */}
          <SectionDivider label="Comentarios" />
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              {comments.map(c => {
                const author = allMembers.find(x => x.id === c.author) ?? getMember(c.author);
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <Avatar name={author?.name ?? c.author} size={28} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{author?.name?.split(' ')[0] ?? c.author}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtCommentDate(c.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-1)', background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>
                        {c.body}
                      </div>
                    </div>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-3)' }}>Sin comentarios todavía.</p>
              )}
            </div>

            {/* Comment input */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <Avatar name={currentUser.name} size={28} style={{ flexShrink: 0, marginBottom: 2 }} />
              <div style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', transition: 'border-color .12s' }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Escribí un comentario..."
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSendComment(); }}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-1)', marginBottom: 6 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ width: 24, height: 24 }}><AtSign size={12} /></button>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ height: 26, fontSize: 12, gap: 4 }}
                    onClick={handleSendComment}
                    disabled={sending || !comment.trim()}
                  >
                    <ArrowUp size={11} /> Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DEPENDENCIAS */}
          <SectionDivider
            label="Dependencias"
            action={
              <button className="btn btn-ghost btn-sm" style={{ height: 24, fontSize: 12 }} onClick={() => setAddingDep(v => !v)}>
                <Plus size={12} /> Agregar
              </button>
            }
          />
          <div style={{ padding: '0 20px' }}>
            {(() => {
              const projectTasks = tasks.filter(x => x.project === t.project && x.id !== t.id);
              const myDeps = deps.filter(d => d.successor_id === t.id || d.predecessor_id === t.id);
              const DEP_LABELS: Record<string, string> = {
                finish_to_start: 'FS', start_to_start: 'SS', finish_to_finish: 'FF',
              };
              return (
                <>
                  {myDeps.length === 0 && !addingDep && (
                    <p style={{ margin: '4px 10px', fontSize: 12, color: 'var(--text-3)' }}>Sin dependencias. Presioná "Agregar" para crear una.</p>
                  )}
                  {myDeps.map(dep => {
                    const isPred = dep.predecessor_id !== t.id;
                    const otherId = isPred ? dep.predecessor_id : dep.successor_id;
                    const other = tasks.find(x => x.id === otherId);
                    return (
                      <div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, marginBottom: 4, background: 'var(--surface-2)' }}>
                        <GitMerge size={11} color="var(--text-3)" />
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace' }}>{DEP_LABELS[dep.type]}</span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>
                          {isPred ? '← ' : '→ '}{other?.title ?? otherId}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm btn-icon" style={{ width: 20, height: 20 }}
                          onClick={() => handleRemoveDep(dep)}
                        >
                          <X size={10} color="var(--text-3)" />
                        </button>
                      </div>
                    );
                  })}
                  {addingDep && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <select
                        value={newDepId}
                        onChange={e => setNewDepId(e.target.value)}
                        style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-1)', fontSize: 13, outline: 'none' }}
                      >
                        <option value="">Predecesora...</option>
                        {projectTasks.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
                      </select>
                      <select
                        value={newDepType}
                        onChange={e => setNewDepType(e.target.value as typeof newDepType)}
                        style={{ width: 60, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 6px', color: 'var(--text-1)', fontSize: 12, outline: 'none' }}
                      >
                        <option value="finish_to_start">FS</option>
                        <option value="start_to_start">SS</option>
                        <option value="finish_to_finish">FF</option>
                      </select>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleAddDep}
                        disabled={addingDep || !newDepId}
                        style={{ height: 30, whiteSpace: 'nowrap' }}
                      >
                        <Check size={11} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAddingDep(false); setNewDepId(''); }} style={{ height: 30 }}>
                        <X size={11} />
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* HISTORIAL */}
          <SectionDivider label="Historial" />
          <div style={{ padding: '0 20px' }}>
            {events.length === 0 ? (
              <p style={{ margin: '4px 10px', fontSize: 12, color: 'var(--text-3)' }}>Sin eventos registrados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {events.slice(0, 10).map(ev => {
                  const EVENT_LABELS: Record<string, { label: string; color: string }> = {
                    date_changed:    { label: 'Fecha cambiada',  color: 'var(--amber)' },
                    status_changed:  { label: 'Estado cambiado', color: 'var(--blue)'  },
                    overdue_flagged: { label: 'Marcada vencida', color: 'var(--red)'   },
                    comment:         { label: 'Comentario',      color: 'var(--text-3)'},
                    reschedule:      { label: 'Reprogramada',    color: 'var(--amber)' },
                  };
                  const meta = EVENT_LABELS[ev.event_type] ?? { label: ev.event_type, color: 'var(--text-3)' };
                  const author = allMembers.find(m => m.id === ev.user_id)?.name ?? ev.user_id;
                  const d = new Date(ev.created_at);
                  const dateStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                  return (
                    <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Clock size={12} color={meta.color} style={{ marginTop: 3, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{author} · {dateStr}</span>
                        </div>
                        {ev.reason && (
                          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{ev.reason}</div>
                        )}
                        {ev.event_type === 'date_changed' && ev.old_value && ev.new_value && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                            {String(ev.old_value.due ?? '')} → {String(ev.new_value.due ?? '')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DANGER ZONE */}
          <div style={{ padding: '24px 20px 0', borderTop: '1px solid var(--border)', marginTop: 28 }}>
            <button
              className="btn btn-destructive btn-sm"
              style={{ fontSize: 12, gap: 6 }}
              onClick={async () => {
                if (!confirm(`¿Eliminar "${t.title}"? Esta acción no se puede deshacer.`)) return;
                try {
                  await deleteTask(t.id);
                  removeTask(t.id);
                  onClose();
                } catch (e) {
                  alert('Error al eliminar: ' + (e instanceof Error ? e.message : String(e)));
                }
              }}
            >
              <Trash2 size={12} /> Eliminar tarea
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Small helpers ──
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', paddingTop: 7 }}>
      {children}
    </div>
  );
}

function SectionDivider({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '20px 20px 10px', gap: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-2)' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      {action}
    </div>
  );
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="date"
        defaultValue={value}
        autoFocus
        onBlur={e => { setEditing(false); if (e.target.value) onChange(e.target.value); }}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--teal)', borderRadius: 6, padding: '5px 10px', color: 'var(--text-1)', fontSize: 13, colorScheme: 'dark', outline: 'none' }}
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
        color: dueColor(value), fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
        transition: 'border-color .12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <Calendar size={12} color="var(--text-3)" />
      {fmtDate(value)}
    </button>
  );
}
