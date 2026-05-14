import { useState, useEffect, useRef } from 'react';
import { Link2, MoreHorizontal, X, Plus, AtSign, ArrowUp, Check, Flag, Calendar, ChevronRight, Trash2, AlertTriangle, User } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { getMember, getProject, fmtDate, dueColor, STATUS_LABELS } from '@/lib/mock-data';
import { updateTask, deleteTask, createSubtask, toggleSubtask, createComment, createTaskDependency } from '@/lib/db';
import { useSubtasks, useComments, useMembers } from '@/hooks/useSupabase';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill } from '@/components/shared/Badges';
import { APP_USERS, APP_USER_IDS, sortedMembers } from '@/lib/auth';
import type { TaskStatus, TaskPriority } from '@/types';

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
          {members.map(m => {
            const isApp = APP_USER_IDS.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => { onSelect(m.id); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Avatar name={m.name} size={20} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: isApp ? 600 : 400 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.role}</div>
                </div>
                {m.id === value && <Check size={11} color="var(--teal)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks, projects, areas, updateTaskStatus, patchTask, removeTask, currentUser } = useAppStore();
  const { data: membersFromDB = [] } = useMembers();
  const allMembers = sortedMembers(membersFromDB.length > 0 ? membersFromDB : APP_USERS.map(u => ({ id: u.id, name: u.name, role: u.role, short: u.short })));

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
  const subInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (t) { setTitleDraft(t.title); setDescDraft(t.description ?? ''); }
  }, [taskId, t]);

  if (!t) return null;

  const p    = projects.find(x => x.id === t.project) ?? getProject(t.project);
  const area = areas.find(x => x.id === t.area);

  // ── Handlers ──
  const save = async (patch: Parameters<typeof updateTask>[1]) => {
    // Optimistic store update for status
    if (patch.status) updateTaskStatus(t.id, patch.status);
    // Optimistic store patch for other fields
    const { status: _, ...rest } = patch;
    if (Object.keys(rest).length) patchTask(t.id, rest as Partial<typeof t>);
    await updateTask(t.id, patch);
  };

  const handleTitleSave = async () => {
    setEditTitle(false);
    if (titleDraft.trim() && titleDraft !== t.title) await save({ title: titleDraft.trim() });
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
              <DateField value={t.due} onChange={due => save({ due })} />

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
