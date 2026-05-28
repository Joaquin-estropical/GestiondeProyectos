import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClipboardList, Plus, Check, X, ChevronLeft, AlertCircle,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight,
  Trash2, Loader2, Printer
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  fetchProjectForms, createProjectForm, deleteProjectForm,
  fetchFormItems, updateFormItem,
  bulkCreateFormItems, completeForm,
} from '@/lib/projectForms';
import { fetchChecklistTemplates, fetchTemplateItems } from '@/lib/planillas';
import { createTask } from '@/lib/db';
import { useMembers } from '@/hooks/useSupabase';
import { fmtDate } from '@/lib/mock-data';
import type { ProjectForm, ProjectFormItem, ChecklistTemplate, RelevamientoCondition } from '@/types';
import { RELEVAMIENTO_CONDITION_LABELS, RELEVAMIENTO_TEMPLATE_ID } from '@/types';

// ── Relevamiento (4 estados) ──────────────────────────────
const REL_ORDER: RelevamientoCondition[] = ['optimo', 'regular', 'mantenimiento', 'na'];
// Hex (no var()) para poder componer transparencias con sufijo alpha (ej. `${c}22`).
const REL_COLOR: Record<RelevamientoCondition, string> = {
  optimo: '#14b8a6', regular: '#f59e0b', mantenimiento: '#ef4444', na: '#94a3b8',
};
function isRelevamiento(form: ProjectForm) {
  return form.template_id === RELEVAMIENTO_TEMPLATE_ID;
}

// ── Types ─────────────────────────────────────────────────
interface Props {
  projectId:       string;
  projectArea:     string;
  currentUserId:   string;
  currentUserName: string;
  onOpenTask:      (id: string) => void;
}

// ── Helpers ───────────────────────────────────────────────
function statusIcon(s: ProjectFormItem['status']) {
  if (s === 'ok')   return <CheckCircle2 size={16} color="var(--teal)" />;
  if (s === 'fail') return <XCircle      size={16} color="var(--red)"  />;
  return                   <Clock        size={16} color="var(--text-3)" />;
}

function ProgressBar({ items, relevamiento }: { items: ProjectFormItem[]; relevamiento?: boolean }) {
  const total = items.length;
  if (relevamiento) {
    const reviewed = items.filter(i => i.condition !== null).length;
    const mant     = items.filter(i => i.condition === 'mantenimiento').length;
    const pct      = total === 0 ? 0 : Math.round(reviewed / total * 100);
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
          <span>{reviewed} de {total} relevados ({pct}%)</span>
          {mant > 0 && <span style={{ color: 'var(--red)' }}>⚠ {mant} requieren mantenimiento</span>}
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: mant > 0 ? 'var(--amber)' : 'var(--teal)', borderRadius: 3, transition: 'width .3s' }} />
        </div>
      </div>
    );
  }
  const reviewed = items.filter(i => i.status !== 'pending').length;
  const ok       = items.filter(i => i.status === 'ok').length;
  const fail     = items.filter(i => i.status === 'fail').length;
  const pct      = total === 0 ? 0 : Math.round(reviewed / total * 100);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
        <span>{reviewed} de {total} revisados ({pct}%)</span>
        <span style={{ display: 'flex', gap: 12 }}>
          <span style={{ color: 'var(--teal)' }}>✓ {ok} OK</span>
          <span style={{ color: 'var(--red)' }}>✗ {fail} Fallas</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: fail > 0 ? 'var(--amber)' : 'var(--teal)', borderRadius: 3, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────
export function ProjectFormsView({ projectId, projectArea, currentUserId, currentUserName, onOpenTask }: Props) {
  const { data: members = [] } = useMembers();

  const [forms,    setForms]    = useState<ProjectForm[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchProjectForms(projectId);
      setForms(data);
    } catch (e) {
      console.error('[ProjectFormsView] fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: escuchar cambios locales al project_forms de este proyecto
  useEffect(() => {
    const channel = supabase
      .channel(`project-forms-${projectId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'project_forms',
        filter: `project_id=eq.${projectId}`,
      }, () => { refresh(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, refresh]);

  const activeForm = forms.find(f => f.id === activeId) ?? null;

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-3)', fontSize: 13, gap: 10 }}>
        <Loader2 size={20} style={{ animation: 'spin .7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (creating) {
    return (
      <CreateFormView
        projectId={projectId}
        currentUserId={currentUserId}
        onDone={(form) => { setCreating(false); setActiveId(form.id); refresh(); }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  if (activeId && activeForm) {
    if (activeForm.status === 'completed') {
      return (
        <ReadFormView
          form={activeForm}
          onBack={() => setActiveId(null)}
          onOpenTask={onOpenTask}
        />
      );
    }
    return (
      <RunFormView
        form={activeForm}
        projectId={projectId}
        projectArea={projectArea}
        currentUserName={currentUserName}
        members={members}
        onBack={() => setActiveId(null)}
        onDone={() => { setActiveId(null); refresh(); }}
      />
    );
  }

  // ── Modo lista (default) ──
  const active    = forms.filter(f => f.status === 'in_progress');
  const completed = forms.filter(f => f.status === 'completed');

  return (
    <div style={{ padding: '24px 32px', maxWidth: 760, overflowY: 'auto', height: '100%' }}>

      {/* En curso */}
      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 10 }}>En curso</div>
          {active.map(f => (
            <FormCard key={f.id} form={f} onOpen={() => setActiveId(f.id)} onDelete={() => deleteProjectForm(f.id).then(refresh)} />
          ))}
        </div>
      )}

      {/* Botón nuevo */}
      <button
        onClick={() => setCreating(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '14px 18px', borderRadius: 10,
          border: '2px dashed var(--border)', background: 'transparent',
          color: 'var(--text-2)', fontSize: 14, cursor: 'pointer',
          transition: 'border-color .15s, color .15s', marginBottom: 28,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
      >
        <Plus size={16} /> Nuevo formulario
      </button>

      {/* Historial */}
      {completed.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 10 }}>
            Historial · {completed.length}
          </div>
          {completed.map(f => (
            <FormCard key={f.id} form={f} onOpen={() => setActiveId(f.id)} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {forms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
          <ClipboardList size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: .5 }} />
          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 6 }}>Sin formularios todavía</div>
          <div style={{ fontSize: 13 }}>Creá uno para registrar revisiones y generar tareas a partir de las fallas.</div>
        </div>
      )}
    </div>
  );
}

// ── FormCard ──────────────────────────────────────────────
function FormCard({ form, onOpen, onDelete }: { form: ProjectForm; onOpen: () => void; onDelete?: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isCompleted = form.status === 'completed';
  const dateLabel   = isCompleted
    ? `Completado ${fmtDate(form.completed_at?.slice(0, 10) ?? form.created_at.slice(0, 10))}`
    : `Iniciado ${fmtDate(form.created_at.slice(0, 10))}`;

  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 8,
        border: '1px solid var(--border)', background: 'var(--surface-1)',
        marginBottom: 8, cursor: 'pointer', transition: 'border-color .12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <ClipboardList size={15} color={isCompleted ? 'var(--teal)' : 'var(--amber)'} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{dateLabel}</div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
        background: isCompleted ? 'rgba(20,184,166,.15)' : 'rgba(245,158,11,.15)',
        color: isCompleted ? 'var(--teal)' : 'var(--amber)',
      }}>
        {isCompleted ? 'Completado' : 'En curso'}
      </span>
      {onDelete && !isCompleted && (
        <div onClick={e => e.stopPropagation()}>
          {confirmDel ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>¿Eliminar?</span>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(239,68,68,.15)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.3)', padding: '2px 8px', fontSize: 11 }}
                onClick={() => onDelete()}
              >Sí</button>
              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setConfirmDel(false)}>No</button>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setConfirmDel(true)}
              style={{ width: 26, height: 26, color: 'var(--text-3)' }}
              title="Eliminar formulario"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── CreateFormView ────────────────────────────────────────
interface DraftItem { title: string; category: string }

function CreateFormView({ projectId, currentUserId, onDone, onCancel }: {
  projectId:     string;
  currentUserId: string;
  onDone:        (form: ProjectForm) => void;
  onCancel:      () => void;
}) {
  const [title,        setTitle]       = useState('');
  const [source,       setSource]      = useState<'blank' | 'template'>('blank');
  const [templates,    setTemplates]   = useState<ChecklistTemplate[]>([]);
  const [templateId,   setTemplateId]  = useState('');
  const [items,        setItems]       = useState<DraftItem[]>([{ title: '', category: '' }]);
  const [saving,       setSaving]      = useState(false);
  const [error,        setError]       = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    fetchChecklistTemplates().then(setTemplates).catch(() => {});
  }, []);

  const loadTemplate = async (tid: string) => {
    setTemplateId(tid);
    if (!tid) { setItems([{ title: '', category: '' }]); return; }
    try {
      const tItems = await fetchTemplateItems(tid);
      setItems(tItems.map(i => ({ title: i.name, category: i.category })));
    } catch { setItems([{ title: '', category: '' }]); }
  };

  const addItem = () => setItems(prev => [...prev, { title: '', category: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof DraftItem, val: string) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const handleSave = async () => {
    if (!title.trim())                              return setError('El formulario necesita un título.');
    const valid = items.filter(i => i.title.trim());
    if (valid.length === 0)                         return setError('Agregá al menos un ítem.');
    setError('');
    setSaving(true);
    try {
      const form = await createProjectForm({
        project_id:  projectId,
        title:       title.trim(),
        template_id: templateId || null,
        created_by:  currentUserId,
      });
      await bulkCreateFormItems(form.id, valid.map((it, idx) => ({
        title:      it.title.trim(),
        category:   it.category.trim() || null,
        sort_order: idx,
      })));
      onDone(form);
    } catch (e) {
      console.error(e);
      setError('Error al guardar. Intentá de nuevo.');
      setSaving(false);
    }
  };

  // Group items by category for preview
  const previewCategories = [...new Set(items.map(i => i.category || ''))];
  const previewGrouped = previewCategories.map(cat => ({
    cat, items: items.filter(i => (i.category || '') === cat),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header fijo */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onCancel}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Nuevo formulario</span>
      </div>

      {/* Body scrollable — layout de 2 columnas cuando hay ítems del template */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: items.length > 3 ? '1fr 1fr' : '1fr', gap: 32, maxWidth: 1100 }}>

          {/* Columna izquierda: controles */}
          <div>
            {/* Título */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', display: 'block', marginBottom: 7 }}>
                Título del formulario
              </label>
              <input
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Inspección semanal de equipos"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--text-1)',
                  outline: 'none',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* Origen */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>
                Empezar desde
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: source === 'template' ? 10 : 0 }}>
                {(['blank', 'template'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSource(opt)}
                    style={{
                      flex: 1, padding: '9px 14px', borderRadius: 8, fontSize: 13,
                      border: `1px solid ${source === opt ? 'var(--teal)' : 'var(--border)'}`,
                      background: source === opt ? 'rgba(20,184,166,.1)' : 'var(--surface-1)',
                      color: source === opt ? 'var(--teal)' : 'var(--text-2)',
                      cursor: 'pointer', fontWeight: source === opt ? 600 : 400,
                    }}
                  >
                    {opt === 'blank' ? 'En blanco' : 'Desde formulario maestro'}
                  </button>
                ))}
              </div>
              {source === 'template' && (
                <select
                  value={templateId}
                  onChange={e => loadTemplate(e.target.value)}
                  style={{
                    width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-1)',
                    outline: 'none',
                  }}
                >
                  <option value="">— Seleccionar formulario maestro —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>

            {/* Ítems — solo si hay pocos o no hay template cargado */}
            {items.length <= 3 && (
              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>
                  Ítems del formulario
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-1)' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          value={item.title}
                          onChange={e => updateItem(idx, 'title', e.target.value)}
                          placeholder={`Ítem ${idx + 1}`}
                          style={{
                            flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--text-1)', outline: 'none',
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                          onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
                        />
                        {items.length > 1 && (
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => removeItem(idx)}
                            style={{ width: 28, height: 28, color: 'var(--text-3)', flexShrink: 0 }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      <input
                        value={item.category}
                        onChange={e => updateItem(idx, 'category', e.target.value)}
                        placeholder="Categoría (opcional)"
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                          borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text-2)', outline: 'none',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                        onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={addItem}
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}
                >
                  <Plus size={12} /> Agregar ítem
                </button>
              </div>
            )}

            {error && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}
          </div>

          {/* Columna derecha: preview de ítems del template (solo cuando hay muchos) */}
          {items.length > 3 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 12 }}>
                Ítems del formulario · {items.length}
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface-1)' }}>
                {previewGrouped.map(({ cat, items: catItems }, gi) => (
                  <div key={cat} style={{ borderBottom: gi < previewGrouped.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {cat && (
                      <div style={{
                        padding: '8px 14px', fontSize: 10.5, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '.06em',
                        color: 'var(--text-3)', background: 'var(--surface-2)',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        {cat} · {catItems.length}
                      </div>
                    )}
                    {catItems.map((item, ii) => (
                      <div
                        key={ii}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 14px',
                          borderBottom: ii < catItems.length - 1 ? '1px solid var(--border)' : 'none',
                          fontSize: 13, color: 'var(--text-1)',
                        }}
                      >
                        <span style={{
                          display: 'inline-block', width: 20, height: 20, borderRadius: 4,
                          border: '1.5px solid var(--border)', flexShrink: 0,
                        }} />
                        {item.title}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer fijo */}
      <div style={{ padding: '14px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-secondary btn-md" onClick={onCancel}>Cancelar</button>
        <button
          className="btn btn-primary btn-md"
          onClick={handleSave}
          disabled={saving || !title.trim()}
        >
          {saving ? <><Loader2 size={13} style={{ animation: 'spin .7s linear infinite' }} /> Guardando…</> : 'Crear y empezar'}
        </button>
      </div>
    </div>
  );
}

// ── RunFormView ───────────────────────────────────────────
function RunFormView({ form, projectId, projectArea, currentUserName, members, onBack, onDone }: {
  form:            ProjectForm;
  projectId:       string;
  projectArea:     string;
  currentUserName: string;
  members:         { id: string; name: string; role: string }[];
  onBack:          () => void;
  onDone:          () => void;
}) {
  const [items,           setItems]         = useState<ProjectFormItem[]>([]);
  const [expandedObs,     setExpandedObs]   = useState<Set<string>>(new Set());
  const [obsText,         setObsText]       = useState<Record<string, string>>({});
  const [saving,          setSaving]        = useState<Set<string>>(new Set());
  const [showTaskPanel,   setShowTaskPanel] = useState(false);
  const [completing,      setCompleting]    = useState(false);

  useEffect(() => {
    fetchFormItems(form.id).then(data => {
      setItems(data);
      const obs: Record<string, string> = {};
      data.forEach(i => { if (i.observation) obs[i.id] = i.observation; });
      setObsText(obs);
    }).catch(console.error);
  }, [form.id]);

  const relevamiento = isRelevamiento(form);

  const markItem = async (item: ProjectFormItem, status: 'ok' | 'fail') => {
    setSaving(prev => new Set(prev).add(item.id));
    const patch: Partial<ProjectFormItem> = { status };
    if (status === 'ok') patch.observation = null;
    await updateFormItem(item.id, patch).catch(console.error);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...patch } : i));
    setSaving(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    if (status === 'fail') {
      setExpandedObs(prev => new Set(prev).add(item.id));
    }
    if (status === 'ok') {
      setExpandedObs(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  };

  const setCondition = async (item: ProjectFormItem, condition: RelevamientoCondition) => {
    setSaving(prev => new Set(prev).add(item.id));
    await updateFormItem(item.id, { condition }).catch(console.error);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, condition } : i));
    setSaving(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    // Para relevamiento, dejar la observación siempre disponible
    setExpandedObs(prev => new Set(prev).add(item.id));
  };

  const saveObs = async (item: ProjectFormItem) => {
    const obs = obsText[item.id]?.trim() ?? '';
    await updateFormItem(item.id, { observation: obs || null }).catch(console.error);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, observation: obs || null } : i));
  };

  const handleFinalize = () => {
    if (!relevamiento) {
      const fails = items.filter(i => i.status === 'fail');
      if (fails.length > 0) {
        setShowTaskPanel(true);
        return;
      }
    }
    setCompleting(true);
    completeForm(form.id).then(onDone).catch(console.error).finally(() => setCompleting(false));
  };

  const allReviewed = items.length > 0 && (
    relevamiento
      ? items.every(i => i.condition !== null)
      : items.every(i => i.status !== 'pending')
  );

  // Group by category
  const categories = [...new Set(items.map(i => i.category ?? ''))];
  const grouped    = categories.map(cat => ({
    cat,
    items: items.filter(i => (i.category ?? '') === cat),
  }));

  if (showTaskPanel) {
    return (
      <TaskGenerationPanel
        form={form}
        failItems={items.filter(i => i.status === 'fail')}
        projectId={projectId}
        projectArea={projectArea}
        members={members}
        onDone={onDone}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onBack}><ChevronLeft size={16} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{form.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Ejecutado por {currentUserName}</div>
        </div>
        {relevamiento && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.open(`/formularios/${form.id}/imprimir`, '_blank')}
            style={{ fontSize: 12, gap: 5 }}
          >
            <Printer size={13} /> Imprimir / PDF
          </button>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(245,158,11,.15)', color: 'var(--amber)' }}>
          EN CURSO
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 100px' }}>
        <ProgressBar items={items} relevamiento={relevamiento} />

        {grouped.map(({ cat, items: catItems }) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            {cat && (
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                {cat}
              </div>
            )}
            {catItems.map(item => {
              const isSaving    = saving.has(item.id);
              const isExpanded  = expandedObs.has(item.id);

              // ── Relevamiento: selector de 4 estados ──
              if (relevamiento) {
                const cond = item.condition;
                return (
                  <div
                    key={item.id}
                    style={{
                      marginBottom: 6, borderRadius: 8,
                      border: `1px solid ${cond ? REL_COLOR[cond] : 'var(--border)'}`,
                      background: cond ? `${REL_COLOR[cond]}0d` : 'var(--surface-1)', overflow: 'hidden',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', flexWrap: 'wrap' }}>
                      <span style={{ flex: '1 1 180px', fontSize: 13.5, color: 'var(--text-1)' }}>
                        {item.title}
                      </span>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {REL_ORDER.map(c => {
                          const on = cond === c;
                          return (
                            <button
                              key={c}
                              onClick={() => setCondition(item, c)}
                              disabled={isSaving}
                              style={{
                                padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                                border: `1px solid ${on ? REL_COLOR[c] : 'var(--border)'}`,
                                background: on ? `${REL_COLOR[c]}26` : 'var(--surface-2)',
                                color: on ? REL_COLOR[c] : 'var(--text-2)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {RELEVAMIENTO_CONDITION_LABELS[c]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {cond && cond !== 'na' && (
                      <div style={{ padding: '0 14px 12px' }}>
                        <textarea
                          value={obsText[item.id] ?? ''}
                          onChange={e => setObsText(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Observaciones / hallazgo (opcional)…"
                          rows={2}
                          style={{
                            width: '100%', boxSizing: 'border-box', resize: 'vertical',
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '7px 10px', fontSize: 12.5,
                            color: 'var(--text-1)', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                          onBlur={e => { saveObs(item); e.currentTarget.style.borderColor = 'var(--border)'; }}
                        />
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  style={{
                    marginBottom: 6, borderRadius: 8,
                    border: `1px solid ${item.status === 'ok' ? 'rgba(20,184,166,.3)' : item.status === 'fail' ? 'rgba(239,68,68,.3)' : 'var(--border)'}`,
                    background: item.status === 'ok' ? 'rgba(20,184,166,.04)' : item.status === 'fail' ? 'rgba(239,68,68,.04)' : 'var(--surface-1)',
                    opacity: item.status === 'ok' ? 0.75 : 1,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                    {statusIcon(item.status)}
                    <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-1)', textDecoration: item.status === 'ok' ? 'line-through' : 'none' }}>
                      {item.title}
                    </span>
                    {/* OK button */}
                    <button
                      onClick={() => markItem(item, 'ok')}
                      disabled={isSaving}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${item.status === 'ok' ? 'var(--teal)' : 'var(--border)'}`,
                        background: item.status === 'ok' ? 'rgba(20,184,166,.15)' : 'var(--surface-2)',
                        color: item.status === 'ok' ? 'var(--teal)' : 'var(--text-2)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <Check size={12} /> OK
                    </button>
                    {/* Falla button */}
                    <button
                      onClick={() => markItem(item, 'fail')}
                      disabled={isSaving}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${item.status === 'fail' ? 'var(--red)' : 'var(--border)'}`,
                        background: item.status === 'fail' ? 'rgba(239,68,68,.15)' : 'var(--surface-2)',
                        color: item.status === 'fail' ? 'var(--red)' : 'var(--text-2)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <X size={12} /> Falla
                    </button>
                    {/* Toggle obs for fail */}
                    {item.status === 'fail' && (
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => setExpandedObs(prev => {
                          const s = new Set(prev);
                          s.has(item.id) ? s.delete(item.id) : s.add(item.id);
                          return s;
                        })}
                        style={{ width: 24, height: 24 }}
                      >
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                    )}
                  </div>
                  {/* Observation textarea */}
                  {item.status === 'fail' && isExpanded && (
                    <div style={{ padding: '0 14px 12px' }}>
                      <textarea
                        value={obsText[item.id] ?? ''}
                        onChange={e => setObsText(prev => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="Describí el problema encontrado…"
                        rows={2}
                        style={{
                          width: '100%', boxSizing: 'border-box', resize: 'vertical',
                          background: 'var(--surface-2)', border: '1px solid var(--border)',
                          borderRadius: 6, padding: '7px 10px', fontSize: 12.5,
                          color: 'var(--text-1)', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--red)')}
                        onBlur={e => { saveObs(item); e.currentTarget.style.borderColor = 'var(--border)'; }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer sticky */}
      <div style={{ padding: '14px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button className="btn btn-secondary btn-md" onClick={onBack}>Volver</button>
        <button
          className="btn btn-primary btn-md"
          onClick={handleFinalize}
          disabled={!allReviewed || completing}
          style={{ opacity: allReviewed ? 1 : 0.5 }}
        >
          {completing ? <><Loader2 size={13} style={{ animation: 'spin .7s linear infinite' }} /> Finalizando…</> : 'Finalizar'}
        </button>
      </div>
    </div>
  );
}

// ── TaskGenerationPanel ───────────────────────────────────
interface TaskDraft {
  itemId:   string;
  title:    string;
  notes:    string;
  assignee: string;
  priority: 'urg' | 'alta' | 'med' | 'baja';
  selected: boolean;
}

function TaskGenerationPanel({ form, failItems, projectId, projectArea, members, onDone }: {
  form:      ProjectForm;
  failItems: ProjectFormItem[];
  projectId: string;
  projectArea: string;
  members:   { id: string; name: string; role: string }[];
  onDone:    () => void;
}) {
  const today7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [drafts,   setDrafts]   = useState<TaskDraft[]>(
    failItems.map(i => ({
      itemId:   i.id,
      title:    i.title,
      notes:    i.observation ?? '',
      assignee: '',
      priority: 'alta' as const,
      selected: true,
    }))
  );
  const [saving, setSaving] = useState(false);

  const update = (idx: number, patch: Partial<TaskDraft>) =>
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));

  const selectedCount = drafts.filter(d => d.selected).length;

  const handleCreate = async () => {
    setSaving(true);
    try {
      const selected = drafts.filter(d => d.selected);
      for (const d of selected) {
        const task = await createTask({
          project:     projectId,
          area:        projectArea,
          title:       d.title,
          description: d.notes || undefined,
          assignee:    d.assignee || members[0]?.id || '',
          priority:    d.priority,
          due:         today7,
        });
        // Link task back to form item
        await updateFormItem(d.itemId, { task_id: task.id }).catch(() => {});
      }
      await completeForm(form.id);
      onDone();
    } catch (e) {
      console.error('[TaskGenerationPanel]', e);
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    await completeForm(form.id).catch(console.error);
    onDone();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Generar tareas a partir de las fallas</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
          {failItems.length} ítem{failItems.length !== 1 ? 's' : ''} con falla — seleccioná los que convertir en tareas
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px' }}>
        {drafts.map((d, idx) => (
          <div
            key={d.itemId}
            style={{
              padding: '14px 16px', borderRadius: 8,
              border: `1px solid ${d.selected ? 'rgba(239,68,68,.3)' : 'var(--border)'}`,
              background: d.selected ? 'rgba(239,68,68,.04)' : 'var(--surface-1)',
              marginBottom: 10,
            }}
          >
            {/* Row 1: checkbox + title */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={d.selected}
                onChange={e => update(idx, { selected: e.target.checked })}
                style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--teal)', flexShrink: 0 }}
              />
              <input
                value={d.title}
                onChange={e => update(idx, { title: e.target.value })}
                style={{
                  flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '6px 10px', fontSize: 13, color: 'var(--text-1)', outline: 'none',
                  opacity: d.selected ? 1 : 0.5,
                }}
                disabled={!d.selected}
                placeholder="Título de la tarea"
              />
            </div>
            {d.selected && (
              <>
                {/* Descripción / observación */}
                <textarea
                  value={d.notes}
                  onChange={e => update(idx, { notes: e.target.value })}
                  placeholder="Descripción de la tarea (opcional)"
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '6px 10px', fontSize: 12.5, color: 'var(--text-1)',
                    outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
                  }}
                />
                {/* Asignado + prioridad */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={d.assignee}
                    onChange={e => update(idx, { assignee: e.target.value })}
                    style={{
                      flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '6px 8px', fontSize: 12.5, color: 'var(--text-1)', outline: 'none',
                    }}
                  >
                    <option value="">Sin asignar</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={d.priority}
                    onChange={e => update(idx, { priority: e.target.value as TaskDraft['priority'] })}
                    style={{
                      width: 130, background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '6px 8px', fontSize: 12.5, color: 'var(--text-1)', outline: 'none',
                    }}
                  >
                    <option value="urg">Urgente</option>
                    <option value="alta">Alta</option>
                    <option value="med">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-md" onClick={handleSkip} disabled={saving}>
          Saltar y finalizar
        </button>
        <button
          className="btn btn-primary btn-md"
          onClick={handleCreate}
          disabled={saving || selectedCount === 0}
        >
          {saving
            ? <><Loader2 size={13} style={{ animation: 'spin .7s linear infinite' }} /> Creando…</>
            : `Crear ${selectedCount} tarea${selectedCount !== 1 ? 's' : ''} y finalizar`}
        </button>
      </div>
    </div>
  );
}

// ── ReadFormView (historial / lectura) ────────────────────
function ReadFormView({ form, onBack, onOpenTask }: {
  form:       ProjectForm;
  onBack:     () => void;
  onOpenTask: (id: string) => void;
}) {
  const [items, setItems] = useState<ProjectFormItem[]>([]);

  useEffect(() => {
    fetchFormItems(form.id).then(setItems).catch(console.error);
  }, [form.id]);

  const relevamiento = isRelevamiento(form);
  const ok    = items.filter(i => i.status === 'ok').length;
  const fail  = items.filter(i => i.status === 'fail').length;
  const tasks = items.filter(i => i.task_id).length;
  const mant  = items.filter(i => i.condition === 'mantenimiento').length;

  const categories = [...new Set(items.map(i => i.category ?? ''))];
  const grouped    = categories.map(cat => ({
    cat,
    items: items.filter(i => (i.category ?? '') === cat),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onBack}><ChevronLeft size={16} /></button>
          <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{form.title}</span>
          {relevamiento && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => window.open(`/formularios/${form.id}/imprimir`, '_blank')}
              style={{ fontSize: 12, gap: 5 }}
            >
              <Printer size={13} /> Imprimir / PDF
            </button>
          )}
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(20,184,166,.15)', color: 'var(--teal)' }}>
            COMPLETADO
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-3)', paddingLeft: 36 }}>
          <span>{fmtDate(form.completed_at?.slice(0, 10) ?? form.created_at.slice(0, 10))}</span>
          {relevamiento ? (
            <span style={{ color: mant > 0 ? 'var(--red)' : 'var(--text-3)' }}>⚠ {mant} requieren mantenimiento</span>
          ) : (
            <>
              <span style={{ color: 'var(--teal)' }}>✓ {ok} OK</span>
              <span style={{ color: fail > 0 ? 'var(--red)' : 'var(--text-3)' }}>✗ {fail} Fallas</span>
              {tasks > 0 && <span style={{ color: 'var(--blue)' }}>📋 {tasks} tarea{tasks !== 1 ? 's' : ''} generada{tasks !== 1 ? 's' : ''}</span>}
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
        {grouped.map(({ cat, items: catItems }) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            {cat && (
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                {cat}
              </div>
            )}
            {catItems.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '10px 14px', marginBottom: 5, borderRadius: 8,
                  border: `1px solid ${relevamiento
                    ? (item.condition ? `${REL_COLOR[item.condition]}44` : 'var(--border)')
                    : (item.status === 'ok' ? 'rgba(20,184,166,.2)' : item.status === 'fail' ? 'rgba(239,68,68,.2)' : 'var(--border)')}`,
                  background: 'var(--surface-1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {relevamiento ? (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                      background: item.condition ? `${REL_COLOR[item.condition]}22` : 'var(--surface-2)',
                      color: item.condition ? REL_COLOR[item.condition] : 'var(--text-3)',
                    }}>
                      {item.condition ? RELEVAMIENTO_CONDITION_LABELS[item.condition] : '—'}
                    </span>
                  ) : statusIcon(item.status)}
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>{item.title}</span>
                  {item.task_id && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onOpenTask(item.task_id!)}
                      style={{ fontSize: 11, color: 'var(--blue)', padding: '2px 8px' }}
                    >
                      Ver tarea
                    </button>
                  )}
                </div>
                {item.observation && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5, paddingLeft: 26, fontStyle: 'italic' }}>
                    {item.observation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
