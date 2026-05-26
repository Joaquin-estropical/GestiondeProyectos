import { useState, useEffect, useRef, useCallback } from 'react';
import { Link2, X, Plus, Check, ChevronRight, GitMerge, AlertCircle, User, AlertTriangle, Trash2, MessageSquare, Send } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { getProject, fmtDate, STATUS_LABELS, STATUS_ORDER, PRIORITY_LABELS } from '@/lib/mock-data';
import { updateTask, createTaskDependency, deleteTaskDependency, fetchTaskDependencies, createTaskEvent, deleteTask, fetchTaskEvents, fetchComments, createComment } from '@/lib/db';
import { useMembers } from '@/hooks/useSupabase';
import { Avatar } from '@/components/shared/Avatar';
import { sortedMembers, getLocalUsers } from '@/lib/auth';
import type { TaskDependency, TaskEvent, Comment } from '@/types';

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
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
          color: 'var(--text-1)', fontSize: 13, transition: 'border-color .12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        {selected ? (
          <><Avatar name={selected.name} size={20} /><span style={{ flex: 1, textAlign: 'left' }}>{selected.name}</span></>
        ) : (
          <><User size={14} color="var(--text-3)" /><span style={{ flex: 1, textAlign: 'left', color: 'var(--text-3)' }}>{placeholder}</span></>
        )}
        <ChevronRight size={12} color="var(--text-3)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
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

// Date input field
function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--text-1)',
        outline: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
        transition: 'border-color .12s',
      }}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', paddingTop: 8 }}>
      {children}
    </div>
  );
}

// Dependency type tooltip labels
const DEP_TYPE_INFO: Record<string, { short: string; label: string; tooltip: string }> = {
  finish_to_start: { short: 'FS', label: 'Fin → Inicio', tooltip: 'Empieza cuando termina la anterior (más común)' },
  start_to_start:  { short: 'SS', label: 'Inicio → Inicio', tooltip: 'Ambas empiezan al mismo tiempo' },
  finish_to_finish: { short: 'FF', label: 'Fin → Fin', tooltip: 'Ambas terminan al mismo tiempo' },
};

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks, projects, areas, updateTaskStatus, patchTask, removeTask, currentUser } = useAppStore();
  const { data: membersFromDB = [] } = useMembers();
  const allMembers = sortedMembers(membersFromDB);

  const t = tasks.find(x => x.id === taskId);

  const [editTitle, setEditTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dependencies
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [addingDep, setAddingDep] = useState(false);
  const [newDepId, setNewDepId] = useState('');
  const [newDepType, setNewDepType] = useState<'finish_to_start' | 'start_to_start' | 'finish_to_finish'>('finish_to_start');
  const [newDepDir, setNewDepDir] = useState<'pred' | 'succ'>('pred'); // pred = esta tarea es SUCESORA; succ = esta tarea es PREDECESORA

  // Overdue reason
  const [overdueNote, setOverdueNote] = useState('');
  const [overdueNoteSaved, setOverdueNoteSaved] = useState(false);

  // Comments / timeline
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reschedule modal
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<string | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [startDateDraft, setStartDateDraft] = useState('');

  useEffect(() => {
    if (t) {
      setTitleDraft(t.title);
      setStartDateDraft(t.start_date ?? '');
    }
  }, [taskId, t?.title, t?.start_date]);

  useEffect(() => {
    if (!t) return;
    fetchTaskDependencies(t.project).then(setDeps).catch(() => {});
  }, [taskId, t?.project]);

  useEffect(() => {
    if (!t) return;
    fetchTaskEvents(t.id).then(setEvents).catch(() => {});
    fetchComments(t.id).then(setComments).catch(() => {});
  }, [taskId, t?.id]);

  const flashSaved = useCallback(() => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }, []);

  if (!t) return null;

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = t.status !== 'done' && t.due < today;

  const p    = projects.find(x => x.id === t.project) ?? getProject(t.project);
  const area = areas.find(x => x.id === t.area);

  // ── Handlers ──
  const save = useCallback(async (patch: Record<string, unknown>) => {
    if (!t) return;
    if (patch.status) updateTaskStatus(t.id, patch.status as never);
    const { status: _, ...rest } = patch;
    if (Object.keys(rest).length) patchTask(t.id, rest as Partial<typeof t>);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await updateTask(t.id, patch as Parameters<typeof updateTask>[1]);
      flashSaved();
    }, 400);
  }, [t, updateTaskStatus, patchTask, flashSaved]);

  const handleTitleSave = () => {
    setEditTitle(false);
    if (titleDraft.trim() && titleDraft !== t.title) save({ title: titleDraft.trim() });
  };

  const handleDueSave = (newDue: string) => {
    if (!t || newDue === t.due) return;
    if (t.status !== 'done') {
      setPendingDateChange(newDue);
      setShowRescheduleModal(true);
    } else {
      save({ due: newDue });
    }
  };

  const handleStartSave = (newStart: string) => {
    setStartDateDraft(newStart);
    save({ start_date: newStart });
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
  };

  const handleAddDep = async () => {
    if (!t || !newDepId || newDepId === t.id) return;
    try {
      if (newDepDir === 'pred') {
        // La tarea seleccionada es PREDECESORA → esta tarea es la SUCESORA
        await createTaskDependency(t.project, newDepId, t.id, newDepType);
      } else {
        // La tarea seleccionada es SUCESORA → esta tarea es la PREDECESORA
        await createTaskDependency(t.project, t.id, newDepId, newDepType);
      }
      const updated = await fetchTaskDependencies(t.project);
      setDeps(updated);
      setNewDepId('');
      setAddingDep(false);
    } catch {}
  };

  const handleRemoveDep = async (dep: TaskDependency) => {
    await deleteTaskDependency(dep.predecessor_id, dep.successor_id).catch(() => {});
    const updated = await fetchTaskDependencies(t.project);
    setDeps(updated);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !t) return;
    setPostingComment(true);
    try {
      await createComment(t.id, currentUser.name || currentUser.short || 'Usuario', newComment.trim());
      const fresh = await fetchComments(t.id);
      setComments(fresh);
      setNewComment('');
    } catch (err) {
      console.error('[TaskDetail] Error posting comment:', err);
    } finally {
      setPostingComment(false);
    }
  };

  // Resolve user_id (UUID) → display name. Tries auth.LOCAL_USERS first,
  // then falls back to "Usuario" if unknown.
  const localUsers = getLocalUsers();
  const resolveUserName = (uid: string): string => {
    const u = localUsers.find(x => x.id === uid);
    return u?.name ?? 'Usuario';
  };

  const handleDelete = async () => {
    removeTask(t.id);
    onClose();
    await deleteTask(t.id).catch(() => {});
  };

  const handleSaveOverdueNote = async () => {
    if (!overdueNote.trim()) return;
    await createTaskEvent({
      task_id: t.id, user_id: currentUser.id,
      event_type: 'comment',
      old_value: undefined,
      new_value: undefined,
      reason: overdueNote.trim(),
    }).catch(() => {});
    setOverdueNoteSaved(true);
    setTimeout(() => setOverdueNoteSaved(false), 2000);
  };

  const projectTasks = tasks.filter(x => x.project === t.project && x.id !== t.id);
  const myDeps = deps.filter(d => d.successor_id === t.id || d.predecessor_id === t.id);

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
                Estás cambiando la fecha límite de una tarea no completada. Ingresá el motivo (opcional).
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
      <aside className="slide-over" style={{ width: 480 }}>

        {/* ── Top bar ── */}
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '.04em' }}>{t.code}</span>
          <span style={{ flex: 1 }} />
          {savedFlash && (
            <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 500 }}>
              <Check size={11} style={{ verticalAlign: 'middle', marginRight: 3 }} />Guardado
            </span>
          )}
          <button className="btn btn-ghost btn-sm btn-icon" title="Copiar enlace"><Link2 size={13} /></button>
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
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text-1)', lineHeight: 1.3 }}
            />
          ) : (
            <h2
              onClick={() => setEditTitle(true)}
              style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.3, cursor: 'text', color: 'var(--text-1)' }}
              title="Clic para editar"
            >
              {t.title}
            </h2>
          )}

          {/* Overdue badge */}
          {isOverdue && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '3px 10px', borderRadius: 999, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>
              <AlertCircle size={10} /> ATRASADA · {fmtDate(t.due)}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0 0' }} />

        {/* ── Scrollable body ── */}
        <div className="slide-body" style={{ padding: '0 0 32px' }}>

          {/* FIELDS GRID */}
          <div style={{ padding: '18px 20px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 14, alignItems: 'start' }}>

              {/* Estado */}
              <FieldLabel>Estado</FieldLabel>
              <select
                value={t.status}
                onChange={e => save({ status: e.target.value })}
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--text-1)',
                  outline: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                ))}
              </select>

              {/* Prioridad */}
              <FieldLabel>Prioridad</FieldLabel>
              <select
                value={t.priority}
                onChange={e => save({ priority: e.target.value })}
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--text-1)',
                  outline: 'none', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {/* Área (read-only) */}
              {area && (
                <>
                  <FieldLabel>Área</FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 0' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: area.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{area.name}</span>
                  </div>
                </>
              )}

              {/* Proyecto (read-only) */}
              <FieldLabel>Proyecto</FieldLabel>
              <div style={{ padding: '7px 0', fontSize: 13, color: 'var(--text-1)' }}>{p?.name ?? t.project}</div>

              {/* Responsable */}
              <FieldLabel>Responsable</FieldLabel>
              <MemberPicker
                value={t.assignee}
                members={allMembers}
                onSelect={id => id && save({ assignee: id })}
                placeholder="Sin asignar"
              />

              {/* Ayudante */}
              <FieldLabel>Ayudante</FieldLabel>
              <MemberPicker
                value={t.helper}
                members={allMembers}
                onSelect={id => save({ helper: id })}
                placeholder="Sin auxiliar"
              />

              {/* Fecha inicio */}
              <FieldLabel>Fecha inicio</FieldLabel>
              <DateField value={startDateDraft || t.start_date || ''} onChange={handleStartSave} />

              {/* Fecha límite */}
              <FieldLabel>Fecha límite</FieldLabel>
              <DateField value={t.due} onChange={handleDueSave} />

            </div>
          </div>

          {/* DEPENDENCIAS */}
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <GitMerge size={13} color="var(--text-3)" />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)' }}>Dependencias</span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ height: 24, fontSize: 12, marginLeft: 'auto' }}
                onClick={() => { setAddingDep(v => !v); setNewDepId(''); }}
              >
                <Plus size={12} /> Agregar
              </button>
            </div>

            {/* Lista de dependencias existentes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {myDeps.length === 0 && !addingDep && (
                <p style={{ margin: '0 10px', fontSize: 12, color: 'var(--text-3)' }}>Sin dependencias.</p>
              )}
              {myDeps.map(dep => {
                const isPred = dep.predecessor_id !== t.id; // esta tarea ES la sucesora → la otra es predecesora
                const otherId = isPred ? dep.predecessor_id : dep.successor_id;
                const other = tasks.find(x => x.id === otherId);
                const typeInfo = DEP_TYPE_INFO[dep.type] ?? { short: dep.type, tooltip: '' };
                return (
                  <div key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, background: 'var(--surface-2)' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                      padding: '1px 5px', borderRadius: 4,
                      background: isPred ? 'rgba(59,130,246,.15)' : 'rgba(20,184,166,.15)',
                      color: isPred ? 'var(--blue)' : 'var(--teal)',
                    }}
                      title={typeInfo.tooltip}
                    >
                      {isPred ? '← PRED' : '→ SUC'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }} title={typeInfo.tooltip}>
                      {typeInfo.short}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {other?.title ?? otherId}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm btn-icon" style={{ width: 20, height: 20, flexShrink: 0 }}
                      onClick={() => handleRemoveDep(dep)}
                    >
                      <X size={10} color="var(--text-3)" />
                    </button>
                  </div>
                );
              })}

              {/* Formulario de agregar dependencia */}
              {addingDep && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', marginTop: 4 }}>
                  {/* Tipo de relación: predecesora o sucesora */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setNewDepDir('pred')}
                      style={{
                        flex: 1, padding: '7px 10px', borderRadius: 6, border: `1px solid ${newDepDir === 'pred' ? 'var(--blue)' : 'var(--border)'}`,
                        background: newDepDir === 'pred' ? 'rgba(59,130,246,.12)' : 'var(--surface-1)',
                        color: newDepDir === 'pred' ? 'var(--blue)' : 'var(--text-2)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      ← Predecesora
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>La otra tarea va antes</div>
                    </button>
                    <button
                      onClick={() => setNewDepDir('succ')}
                      style={{
                        flex: 1, padding: '7px 10px', borderRadius: 6, border: `1px solid ${newDepDir === 'succ' ? 'var(--teal)' : 'var(--border)'}`,
                        background: newDepDir === 'succ' ? 'rgba(20,184,166,.12)' : 'var(--surface-1)',
                        color: newDepDir === 'succ' ? 'var(--teal)' : 'var(--text-2)',
                        fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      → Sucesora
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>La otra tarea va después</div>
                    </button>
                  </div>

                  {/* Selección de tarea */}
                  <select
                    value={newDepId}
                    onChange={e => setNewDepId(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text-1)', fontSize: 13, outline: 'none' }}
                  >
                    <option value="">Seleccionar tarea...</option>
                    {projectTasks.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}
                  </select>

                  {/* Tipo de dependencia con tooltip */}
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>Tipo de relación:</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {Object.entries(DEP_TYPE_INFO).map(([key, info]) => (
                        <button
                          key={key}
                          onClick={() => setNewDepType(key as typeof newDepType)}
                          title={info.tooltip}
                          style={{
                            flex: 1, padding: '6px 4px', borderRadius: 6,
                            border: `1px solid ${newDepType === key ? 'var(--teal)' : 'var(--border)'}`,
                            background: newDepType === key ? 'rgba(20,184,166,.1)' : 'var(--surface-1)',
                            color: newDepType === key ? 'var(--teal)' : 'var(--text-2)',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'center',
                          }}
                        >
                          <div>{info.short}</div>
                          <div style={{ fontSize: 9, fontWeight: 400, marginTop: 1, color: 'var(--text-3)' }}>{info.label}</div>
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>
                      {DEP_TYPE_INFO[newDepType]?.tooltip}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setAddingDep(false); setNewDepId(''); }}>Cancelar</button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleAddDep}
                      disabled={!newDepId}
                    >
                      <Check size={11} /> Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COMENTARIOS / TIMELINE */}
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MessageSquare size={13} color="var(--text-3)" />
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)' }}>Comentarios</span>
              {(comments.length + events.filter(e => e.event_type === 'comment').length) > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {comments.length + events.filter(e => e.event_type === 'comment').length}</span>
              )}
            </div>

            {/* Lista de comentarios (tabla comments) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {comments.length === 0 && events.filter(e => e.event_type === 'comment').length === 0 && (
                <p style={{ margin: '0 0 4px 4px', fontSize: 12, color: 'var(--text-3)' }}>
                  Sin comentarios todavía. Sé el primero en comentar.
                </p>
              )}
              {/* Real comments from `comments` table */}
              {comments.map(c => (
                <div key={c.id} style={{
                  display: 'flex', gap: 10,
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}>
                  <Avatar name={c.author} size={26} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{c.author}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtDate(c.created_at.slice(0, 10))}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {c.body}
                    </div>
                  </div>
                </div>
              ))}
              {/* Timeline events (date changes, status changes, etc.) */}
              {events.filter(e => e.event_type !== 'comment').map(ev => {
                const userName = resolveUserName(ev.user_id);
                const typeLabel: Record<string, string> = {
                  date_changed: '📅 Fecha cambiada',
                  status_changed: '🔄 Estado cambiado',
                  overdue_flagged: '⚠ Marcada como atrasada',
                  reschedule: '📅 Reprogramada',
                };
                return (
                  <div key={ev.id} style={{
                    display: 'flex', gap: 10,
                    padding: '8px 12px',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    opacity: 0.85,
                  }}>
                    <Avatar name={userName} size={22} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: ev.reason ? 3 : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                          {typeLabel[ev.event_type] ?? ev.event_type}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{fmtDate(ev.created_at.slice(0, 10))}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {userName}</span>
                      </div>
                      {ev.reason && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.4, fontStyle: 'italic' }}>{ev.reason}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form para nuevo comentario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                placeholder="Escribí un comentario... (⌘+Enter para enviar)"
                style={{
                  width: '100%', boxSizing: 'border-box', minHeight: 60,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 12px', color: 'var(--text-1)',
                  fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || postingComment}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Send size={11} /> {postingComment ? 'Enviando…' : 'Comentar'}
                </button>
              </div>
            </div>
          </div>

          {/* MOTIVO DE RETRASO (solo si overdue) */}
          {isOverdue && (
            <div style={{ padding: '24px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <AlertCircle size={13} color="var(--red)" />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--red)' }}>Motivo del retraso</span>
              </div>
              <textarea
                value={overdueNote}
                onChange={e => setOverdueNote(e.target.value)}
                placeholder="Explicá brevemente por qué esta tarea está vencida..."
                style={{
                  width: '100%', boxSizing: 'border-box', minHeight: 70,
                  background: 'var(--surface-2)', border: '1px solid rgba(239,68,68,.3)',
                  borderRadius: 6, padding: '8px 12px', color: 'var(--text-1)',
                  fontSize: 13, resize: 'vertical', outline: 'none', lineHeight: 1.5,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(239,68,68,.3)')}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: 12, background: overdueNoteSaved ? 'var(--green)' : 'rgba(239,68,68,.15)', color: overdueNoteSaved ? 'white' : 'var(--red)', border: 'none' }}
                  onClick={handleSaveOverdueNote}
                  disabled={!overdueNote.trim()}
                >
                  {overdueNoteSaved ? <><Check size={11} /> Guardado</> : 'Guardar observación'}
                </button>
              </div>
            </div>
          )}

          {/* ELIMINAR TAREA */}
          <div style={{ padding: '32px 20px 0', borderTop: '1px solid var(--border)', marginTop: 24 }}>
            {confirmDelete ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8 }}>
                <AlertCircle size={15} color="var(--red)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1 }}>¿Eliminar esta tarea? No se puede deshacer.</span>
                <button
                  className="btn btn-sm"
                  style={{ background: 'rgba(239,68,68,.18)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.35)', fontWeight: 600 }}
                  onClick={handleDelete}
                >
                  Eliminar
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              </div>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                onClick={() => setConfirmDelete(true)}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)' }}
              >
                <Trash2 size={14} /> Eliminar tarea
              </button>
            )}
          </div>

        </div>
      </aside>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
