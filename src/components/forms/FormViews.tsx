import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  ClipboardList, Plus, Check, X, ChevronLeft, AlertCircle,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, ChevronUp,
  Trash2, Loader2, Printer,
} from 'lucide-react';
import {
  createProjectForm,
  fetchFormItems, updateFormItem, createFormItem, deleteFormItem,
  bulkCreateFormItems, completeForm, reorderFormItems,
} from '@/lib/projectForms';
import { fetchChecklistTemplates, fetchTemplateItems } from '@/lib/planillas';
import { createTask } from '@/lib/db';
import { fmtDate } from '@/lib/mock-data';
import type { ProjectForm, ProjectFormItem, ChecklistTemplate, RelevamientoCondition } from '@/types';
import { RELEVAMIENTO_CONDITION_LABELS, RELEVAMIENTO_TEMPLATE_ID } from '@/types';

// ── Relevamiento (4 estados) ──────────────────────────────
export const REL_ORDER: RelevamientoCondition[] = ['optimo', 'regular', 'mantenimiento', 'na'];
// Hex (no var()) para poder componer transparencias con sufijo alpha (ej. `${c}22`).
export const REL_COLOR: Record<RelevamientoCondition, string> = {
  optimo: '#14b8a6', regular: '#f59e0b', mantenimiento: '#ef4444', na: '#94a3b8',
};
export function isRelevamiento(form: ProjectForm) {
  return form.template_id === RELEVAMIENTO_TEMPLATE_ID;
}

// ── Helpers ───────────────────────────────────────────────
export function statusIcon(s: ProjectFormItem['status']) {
  if (s === 'ok')   return <CheckCircle2 size={16} color="var(--teal)" />;
  if (s === 'fail') return <XCircle      size={16} color="var(--red)"  />;
  return                   <Clock        size={16} color="var(--text-3)" />;
}

export function ProgressBar({ items, relevamiento }: { items: ProjectFormItem[]; relevamiento?: boolean }) {
  const total = items.length;
  if (relevamiento) {
    const reviewed = items.filter(i => i.condition !== null).length;
    const mant     = items.filter(i => i.condition === 'mantenimiento').length;
    const pct      = total === 0 ? 0 : Math.round(reviewed / total * 100);
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>
          <span>{reviewed} de {total} relevados ({pct}%)</span>
          {mant > 0 && <span style={{ color: 'var(--red)' }}>⚠ {mant} requieren mantenimiento</span>}
        </div>
        <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text-2)', marginBottom: 6 }}>
        <span>{reviewed} de {total} revisados ({pct}%)</span>
        <span style={{ display: 'flex', gap: 12 }}>
          <span style={{ color: 'var(--teal)' }}>✓ {ok} OK</span>
          <span style={{ color: 'var(--red)' }}>✗ {fail} Fallas</span>
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: fail > 0 ? 'var(--amber)' : 'var(--teal)', borderRadius: 3, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

// ── FormCard ──────────────────────────────────────────────
export function FormCard({ form, subtitle, onOpen, onDelete, onPrint }: {
  form: ProjectForm;
  subtitle?: string;
  onOpen: () => void;
  onDelete?: () => void;
  onPrint?: () => void;
}) {
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
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          {subtitle ? `${subtitle} · ${dateLabel}` : dateLabel}
        </div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
        background: isCompleted ? 'rgba(20,184,166,.15)' : 'rgba(245,158,11,.15)',
        color: isCompleted ? 'var(--teal)' : 'var(--amber)',
      }}>
        {isCompleted ? 'Completado' : 'En curso'}
      </span>
      {onPrint && (
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={e => { e.stopPropagation(); onPrint(); }}
          style={{ width: 26, height: 26, color: 'var(--text-3)' }}
          title="Imprimir / PDF"
        >
          <Printer size={13} />
        </button>
      )}
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

// ── ItemsEditor ───────────────────────────────────────────
// Lista de ítems editable, agrupada por categoría. Cada grupo permite renombrar
// la categoría (aplica a todos sus ítems) y agregar/quitar ítems individualmente.
function ItemsEditor({
  grouped, updateItem, removeItem, addItem, renameCategory, addCategory, canRemove, count,
}: {
  grouped:        { cat: string; items: DraftItem[] }[];
  updateItem:     (id: string, field: 'title' | 'category', val: string) => void;
  removeItem:     (id: string) => void;
  addItem:        (category?: string) => void;
  renameCategory: (oldCat: string, newCat: string) => void;
  addCategory:    () => void;
  canRemove:      boolean;
  count?:         number;
}) {
  const inputBase: CSSProperties = {
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '9px 12px', fontSize: 14, color: 'var(--text-1)', outline: 'none',
  };
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', display: 'block', marginBottom: 10 }}>
        Ítems del formulario{count != null ? ` · ${count}` : ''}
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {grouped.map(({ cat, items: catItems }) => (
          <div key={cat || '__nocat__'} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface-1)' }}>
            {/* Cabecera de categoría editable */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <input
                value={cat}
                onChange={e => renameCategory(cat, e.target.value)}
                placeholder="Categoría (opcional)"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em',
                  color: 'var(--text-2)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{catItems.length}</span>
            </div>

            {/* Ítems del grupo — grilla responsiva */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 8, padding: 12,
            }}>
              {catItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    value={item.title}
                    onChange={e => updateItem(item.id, 'title', e.target.value)}
                    placeholder="Nombre del ítem"
                    style={{ ...inputBase, flex: 1, minWidth: 0 }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                    onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
                  />
                  {canRemove && (
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => removeItem(item.id)}
                      style={{ width: 28, height: 28, color: 'var(--text-3)', flexShrink: 0 }}
                      title="Quitar ítem"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Agregar ítem a este grupo */}
            <button
              onClick={() => addItem(cat)}
              className="btn btn-ghost btn-sm"
              style={{ margin: '0 12px 10px', fontSize: 12, color: 'var(--text-3)' }}
            >
              <Plus size={12} /> Agregar ítem
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addCategory}
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 12, fontSize: 12, color: 'var(--text-3)' }}
      >
        <Plus size={12} /> Agregar categoría
      </button>
    </div>
  );
}

// ── CreateFormView ────────────────────────────────────────
interface DraftItem { id: string; title: string; category: string }

let draftSeq = 0;
const newDraft = (title = '', category = ''): DraftItem => ({ id: `d${++draftSeq}`, title, category });

export function CreateFormView({ projectId, currentUserId, onDone, onCancel }: {
  projectId:     string;
  currentUserId: string;
  onDone:        (form: ProjectForm) => void;
  onCancel:      () => void;
}) {
  const [title,        setTitle]       = useState('');
  const [source,       setSource]      = useState<'blank' | 'template'>('blank');
  const [templates,    setTemplates]   = useState<ChecklistTemplate[]>([]);
  const [templateId,   setTemplateId]  = useState('');
  const [items,        setItems]       = useState<DraftItem[]>([newDraft()]);
  const [saving,       setSaving]      = useState(false);
  const [error,        setError]       = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    fetchChecklistTemplates().then(setTemplates).catch(() => {});
  }, []);

  const loadTemplate = async (tid: string) => {
    setTemplateId(tid);
    if (!tid) { setItems([newDraft()]); return; }
    try {
      const tItems = await fetchTemplateItems(tid);
      setItems(tItems.map(i => newDraft(i.name, i.category ?? '')));
      // Si el formulario no tiene título aún, proponer el nombre del maestro
      const tpl = templates.find(t => t.id === tid);
      if (tpl && !title.trim()) setTitle(tpl.name);
    } catch { setItems([newDraft()]); }
  };

  const addItem = (category = '') => setItems(prev => [...prev, newDraft('', category)]);
  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const updateItem = (id: string, field: 'title' | 'category', val: string) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: val } : it));

  // Renombrar una categoría completa (aplica a todos sus ítems)
  const renameCategory = (oldCat: string, newCat: string) =>
    setItems(prev => prev.map(it => (it.category || '') === oldCat ? { ...it, category: newCat } : it));

  const addCategory = () => setItems(prev => [...prev, newDraft('', 'Nueva categoría')]);

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

  // Agrupar por categoría (manteniendo el orden de aparición)
  const categories = [...new Set(items.map(i => i.category || ''))];
  const grouped = categories.map(cat => ({
    cat, items: items.filter(i => (i.category || '') === cat),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header fijo */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onCancel}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Nuevo formulario</span>
      </div>

      {/* Body scrollable — apilado vertical a ancho casi completo */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>

          {/* Fila de controles: título + origen */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 24 }}>
            {/* Título */}
            <div style={{ flex: '1 1 360px', minWidth: 0 }}>
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
            <div style={{ flex: '0 1 340px', minWidth: 280 }}>
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
                    outline: 'none', colorScheme: 'dark',
                  }}
                >
                  <option value="" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>— Seleccionar formulario maestro —</option>
                  {templates.map(t => <option key={t.id} value={t.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{t.name}</option>)}
                </select>
              )}
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Ítems editables a ancho completo */}
          <ItemsEditor
            grouped={grouped}
            updateItem={updateItem}
            removeItem={removeItem}
            addItem={addItem}
            renameCategory={renameCategory}
            addCategory={addCategory}
            canRemove={items.length > 1}
            count={items.length}
          />

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

// ── Botones de reordenar (subir/bajar) ────────────────────
function ItemMoveButtons({ onUp, onDown, canUp, canDown }: {
  onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={onUp}
        disabled={!canUp}
        style={{ width: 20, height: 16, color: 'var(--text-3)', opacity: canUp ? 1 : 0.3 }}
        title="Subir"
      >
        <ChevronUp size={12} />
      </button>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        onClick={onDown}
        disabled={!canDown}
        style={{ width: 20, height: 16, color: 'var(--text-3)', opacity: canDown ? 1 : 0.3 }}
        title="Bajar"
      >
        <ChevronDown size={12} />
      </button>
    </div>
  );
}

// ── RunFormView ───────────────────────────────────────────
export function RunFormView({ form, projectId, projectArea, currentUserName, members, onBack, onDone }: {
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
  const [newItemCat,      setNewItemCat]    = useState<string | null>(null);
  const [newItemTitle,    setNewItemTitle]  = useState('');
  const [addingCategory,  setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

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

  const handleAddItem = async (category: string) => {
    const title = newItemTitle.trim();
    if (!title) { setNewItemCat(null); return; }
    const created = await createFormItem({
      form_id:    form.id,
      title,
      category:   category || null,
      sort_order: items.filter(i => (i.category ?? '') === category).length,
    }).catch(console.error);
    if (created) setItems(prev => [...prev, created]);
    setNewItemTitle('');
    setNewItemCat(null);
  };

  const handleRemoveItem = async (item: ProjectFormItem) => {
    await deleteFormItem(item.id).catch(console.error);
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleAddCategory = async () => {
    const cat = newCategoryName.trim();
    if (!cat) { setAddingCategory(false); return; }
    setAddingCategory(false);
    setNewCategoryName('');
    setNewItemCat(cat);
  };

  // Persiste un nuevo orden completo de ítems (sort_order secuencial 0..n) y actualiza el estado local.
  const persistOrder = (ordered: ProjectFormItem[]) => {
    setItems(ordered);
    reorderFormItems(ordered.map((it, idx) => ({ id: it.id, sort_order: idx }))).catch(console.error);
  };

  const moveItem = (item: ProjectFormItem, dir: -1 | 1) => {
    const cat = item.category ?? '';
    const sameCat = items.filter(i => (i.category ?? '') === cat);
    const idx = sameCat.findIndex(i => i.id === item.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sameCat.length) return;
    const a = sameCat[idx], b = sameCat[swapIdx];
    const ai = items.findIndex(i => i.id === a.id);
    const bi = items.findIndex(i => i.id === b.id);
    const reordered = [...items];
    [reordered[ai], reordered[bi]] = [reordered[bi], reordered[ai]];
    persistOrder(reordered);
  };

  const moveCategory = (cat: string, dir: -1 | 1) => {
    const catOrder = [...new Set(items.map(i => i.category ?? ''))];
    const idx = catOrder.indexOf(cat);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= catOrder.length) return;
    [catOrder[idx], catOrder[swapIdx]] = [catOrder[swapIdx], catOrder[idx]];
    const reordered = catOrder.flatMap(c => items.filter(i => (i.category ?? '') === c));
    persistOrder(reordered);
  };

  // Ítems que disparan creación de tareas al finalizar:
  // relevamiento → "Requiere mantenimiento"; genérico → "Falla".
  const actionItems = relevamiento
    ? items.filter(i => i.condition === 'mantenimiento')
    : items.filter(i => i.status === 'fail');

  const handleFinalize = () => {
    if (actionItems.length > 0) {
      setShowTaskPanel(true);
      return;
    }
    setCompleting(true);
    completeForm(form.id).then(onDone).catch(console.error).finally(() => setCompleting(false));
  };

  const allReviewed = items.length > 0 && (
    relevamiento
      ? items.every(i => i.condition !== null)
      : items.every(i => i.status !== 'pending')
  );

  // Group by category (incluye categorías recién creadas que aún no tienen ítems)
  const categories = [...new Set([...items.map(i => i.category ?? ''), ...(newItemCat ? [newItemCat] : [])])];
  const grouped    = categories.map(cat => ({
    cat,
    items: items.filter(i => (i.category ?? '') === cat),
  }));

  if (showTaskPanel) {
    return (
      <TaskGenerationPanel
        form={form}
        actionItems={actionItems}
        mode={relevamiento ? 'mantenimiento' : 'fail'}
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
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.open(`/formularios/${form.id}/imprimir`, '_blank')}
          style={{ fontSize: 12, gap: 5 }}
        >
          <Printer size={13} /> Imprimir / PDF
        </button>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(245,158,11,.15)', color: 'var(--amber)' }}>
          EN CURSO
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 100px' }}>
        <ProgressBar items={items} relevamiento={relevamiento} />

        {grouped.map(({ cat, items: catItems }, catIdx) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            {cat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)' }}>
                  {cat}
                </span>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => moveCategory(cat, -1)}
                  disabled={catIdx === 0}
                  style={{ width: 22, height: 22, color: 'var(--text-3)', opacity: catIdx === 0 ? 0.35 : 1 }}
                  title="Subir categoría"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => moveCategory(cat, 1)}
                  disabled={catIdx === grouped.length - 1}
                  style={{ width: 22, height: 22, color: 'var(--text-3)', opacity: catIdx === grouped.length - 1 ? 0.35 : 1 }}
                  title="Bajar categoría"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
            )}
            {catItems.map((item, itemIdx) => {
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', flexWrap: 'wrap' }}>
                      <span style={{ flex: '1 1 180px', fontSize: 14.5, color: 'var(--text-1)' }}>
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
                                padding: '6px 12px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
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
                      <ItemMoveButtons
                        onUp={() => moveItem(item, -1)}
                        onDown={() => moveItem(item, 1)}
                        canUp={itemIdx > 0}
                        canDown={itemIdx < catItems.length - 1}
                      />
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => handleRemoveItem(item)}
                        style={{ width: 24, height: 24, color: 'var(--text-3)', flexShrink: 0 }}
                        title="Quitar ítem"
                      >
                        <Trash2 size={13} />
                      </button>
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
                            borderRadius: 6, padding: '8px 11px', fontSize: 13,
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                    {statusIcon(item.status)}
                    <span style={{ flex: 1, fontSize: 14.5, color: 'var(--text-1)', textDecoration: item.status === 'ok' ? 'line-through' : 'none' }}>
                      {item.title}
                    </span>
                    {/* OK button */}
                    <button
                      onClick={() => markItem(item, 'ok')}
                      disabled={isSaving}
                      style={{
                        padding: '6px 13px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
                        padding: '6px 13px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
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
                    <ItemMoveButtons
                      onUp={() => moveItem(item, -1)}
                      onDown={() => moveItem(item, 1)}
                      canUp={itemIdx > 0}
                      canDown={itemIdx < catItems.length - 1}
                    />
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => handleRemoveItem(item)}
                      style={{ width: 24, height: 24, color: 'var(--text-3)', flexShrink: 0 }}
                      title="Quitar ítem"
                    >
                      <Trash2 size={13} />
                    </button>
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
                          borderRadius: 6, padding: '8px 11px', fontSize: 13,
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

            {/* Agregar ítem a esta categoría */}
            {newItemCat === cat ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  autoFocus
                  value={newItemTitle}
                  onChange={e => setNewItemTitle(e.target.value)}
                  placeholder="Nombre del ítem…"
                  style={{
                    flex: 1, background: 'var(--surface-2)', border: '1px solid var(--teal)',
                    borderRadius: 6, padding: '8px 12px', fontSize: 13.5, color: 'var(--text-1)', outline: 'none',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddItem(cat);
                    if (e.key === 'Escape') { setNewItemCat(null); setNewItemTitle(''); }
                  }}
                />
                <button className="btn btn-primary btn-sm" onClick={() => handleAddItem(cat)}>Agregar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setNewItemCat(null); setNewItemTitle(''); }}>Cancelar</button>
              </div>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}
                onClick={() => { setNewItemCat(cat); setNewItemTitle(''); }}
              >
                <Plus size={12} /> Agregar ítem
              </button>
            )}
          </div>
        ))}

        {/* Agregar categoría nueva */}
        {addingCategory ? (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            <input
              autoFocus
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="Nombre de la categoría…"
              style={{
                flex: '0 1 280px', background: 'var(--surface-2)', border: '1px solid var(--teal)',
                borderRadius: 6, padding: '8px 12px', fontSize: 13.5, color: 'var(--text-1)', outline: 'none',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCategory();
                if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
              }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddCategory}>Crear</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAddingCategory(false); setNewCategoryName(''); }}>Cancelar</button>
          </div>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 20, fontSize: 12, color: 'var(--text-3)' }}
            onClick={() => setAddingCategory(true)}
          >
            <Plus size={12} /> Agregar categoría
          </button>
        )}
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

function TaskGenerationPanel({ form, actionItems, mode = 'fail', projectId, projectArea, members, onDone }: {
  form:        ProjectForm;
  actionItems: ProjectFormItem[];
  mode?:       'fail' | 'mantenimiento';
  projectId:   string;
  projectArea: string;
  members:     { id: string; name: string; role: string }[];
  onDone:      () => void;
}) {
  const isMant  = mode === 'mantenimiento';
  const accent  = isMant ? REL_COLOR.mantenimiento : '#ef4444';
  const today7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [drafts,   setDrafts]   = useState<TaskDraft[]>(
    actionItems.map(i => ({
      itemId:   i.id,
      title:    isMant ? `Mantenimiento: ${i.title}` : i.title,
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
        <div style={{ fontWeight: 600, fontSize: 15 }}>
          {isMant ? 'Generar tareas de mantenimiento' : 'Generar tareas a partir de las fallas'}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3 }}>
          {actionItems.length} ítem{actionItems.length !== 1 ? 's' : ''} {isMant ? 'requieren mantenimiento' : 'con falla'} — seleccioná los que convertir en tareas
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px' }}>
        {drafts.map((d, idx) => (
          <div
            key={d.itemId}
            style={{
              padding: '14px 16px', borderRadius: 8,
              border: `1px solid ${d.selected ? `${accent}4d` : 'var(--border)'}`,
              background: d.selected ? `${accent}0a` : 'var(--surface-1)',
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
                  borderRadius: 6, padding: '8px 11px', fontSize: 13.5, color: 'var(--text-1)', outline: 'none',
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
                    borderRadius: 6, padding: '8px 11px', fontSize: 13, color: 'var(--text-1)',
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
                      borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--text-1)', outline: 'none', colorScheme: 'dark',
                    }}
                  >
                    <option value="" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Sin asignar</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={d.priority}
                    onChange={e => update(idx, { priority: e.target.value as TaskDraft['priority'] })}
                    style={{
                      width: 130, background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--text-1)', outline: 'none', colorScheme: 'dark',
                    }}
                  >
                    <option value="urg"  style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Urgente</option>
                    <option value="alta" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Alta</option>
                    <option value="med"  style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Media</option>
                    <option value="baja" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Baja</option>
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
export function ReadFormView({ form, onBack, onOpenTask }: {
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
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.open(`/formularios/${form.id}/imprimir`, '_blank')}
            style={{ fontSize: 12, gap: 5 }}
          >
            <Printer size={13} /> Imprimir / PDF
          </button>
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
