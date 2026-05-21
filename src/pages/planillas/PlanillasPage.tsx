import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, ChevronRight, CheckCircle2, Clock, AlertCircle,
  FolderOpen, X, Pencil, Check, Trash2, ChevronDown,
  Copy, Save, ClipboardList,
} from 'lucide-react'
import type { EventChecklist, ChecklistTemplate, TemplateItem, TemplateKind } from '@/types'
import { DEFAULT_CATEGORIES } from '@/types'
import {
  fetchEventChecklists, fetchChecklistTemplates,
  createChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate,
  duplicateChecklistTemplate,
  fetchTemplateItems, createTemplateItem, updateTemplateItem, deleteTemplateItem,
  renameCategory, deleteCategoryItems,
  createLinkedPair,
} from '@/lib/planillas'
import { useAppStore } from '@/stores/app'

// ── Colores y helpers ─────────────────────────────────────────────────────────

const KIND_COLORS: Record<TemplateKind, string> = {
  event_delivery:  '#6366f1',
  branch_delivery: '#0d9488',
  local_return:    '#f59e0b',
  custom:          '#6b7280',
}
const KIND_EMOJI: Record<TemplateKind, string> = {
  event_delivery:  '🎪',
  branch_delivery: '🏪',
  local_return:    '🔄',
  custom:          '📋',
}
const CAT_COLORS: Record<string, string> = {
  'Mobiliario': '#6366f1', 'Telas y textiles': '#ec4899', 'Decoración': '#f59e0b',
  'Iluminación': '#eab308', 'Audiovisual': '#3b82f6', 'Instalaciones': '#10b981',
}
function catColor(cat: string) { return CAT_COLORS[cat] ?? '#6b7280' }

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed')   return <CheckCircle2 size={13} style={{ color: 'var(--teal)', flexShrink: 0 }} />
  if (status === 'in_progress') return <Clock size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
  return <AlertCircle size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
}
function statusLabel(s: string) {
  if (s === 'completed')   return 'Cerrada'
  if (s === 'in_progress') return 'En curso'
  return 'Pendiente'
}

// ── Panel expandido de ítems (edición inline) ─────────────────────────────────

interface ExpandedPanelProps {
  template: ChecklistTemplate
  onClose: () => void
  onReload: () => void
  onDeleted: () => void
}

function ExpandedPanel({ template, onClose, onReload, onDeleted }: ExpandedPanelProps) {
  const [items, setItems]     = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemVal, setEditItemVal]     = useState({ name: '', category: '' })
  const [editingCat, setEditingCat]       = useState<string | null>(null)
  const [catVal, setCatVal]               = useState('')
  const [collapsed, setCollapsed]         = useState<Record<string, boolean>>({})
  const [addingItemCat, setAddingItemCat] = useState<string | null>(null)
  const [newItemName, setNewItemName]     = useState('')
  const [addingCat, setAddingCat]         = useState(false)
  const [newCatName, setNewCatName]       = useState('')
  const [savingAs, setSavingAs]           = useState(false)
  const [saveAsName, setSaveAsName]       = useState('')

  // Carga masiva: pegar lista de ítems
  const [bulkMode, setBulkMode]     = useState(false)
  const [bulkCat, setBulkCat]       = useState('')
  const [bulkText, setBulkText]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchTemplateItems(template.id)) }
    finally { setLoading(false) }
  }, [template.id])

  useEffect(() => { load() }, [load])

  const categories = Array.from(new Set([
    ...DEFAULT_CATEGORIES, ...items.map(i => i.category),
  ])).filter(cat => items.some(i => i.category === cat))

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...items.map(i => i.category)]))

  async function handleSaveCat(oldCat: string) {
    if (!catVal.trim()) return
    await renameCategory(template.id, oldCat, catVal.trim())
    setEditingCat(null); load()
  }

  async function handleDeleteCat(cat: string) {
    const count = items.filter(i => i.category === cat).length
    if (!confirm(`¿Eliminar categoría "${cat}"${count > 0 ? ` y sus ${count} ítem${count !== 1 ? 's' : ''}` : ''}?`)) return
    await deleteCategoryItems(template.id, cat); load()
  }

  async function handleAddItem(cat: string) {
    if (!newItemName.trim()) return
    const catItems = items.filter(i => i.category === cat)
    await createTemplateItem({ template_id: template.id, name: newItemName.trim(), category: cat, sort_order: catItems.length })
    setNewItemName(''); setAddingItemCat(null); load()
  }

  async function handleAddCat() {
    if (!newCatName.trim()) return
    await createTemplateItem({ template_id: template.id, name: 'Nuevo ítem', category: newCatName.trim(), sort_order: 0 })
    setNewCatName(''); setAddingCat(false); load()
  }

  async function handleSaveItem(id: string) {
    if (!editItemVal.name.trim()) return
    await updateTemplateItem(id, { name: editItemVal.name.trim(), category: editItemVal.category })
    setEditingItemId(null); load()
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('¿Eliminar este ítem?')) return
    await deleteTemplateItem(id); load()
  }

  async function handleSaveAsNew() {
    const name = saveAsName.trim()
    if (!name) return
    const newTpl = await createChecklistTemplate({ name, kind: template.kind })
    await Promise.all(
      items.map(item => createTemplateItem({
        template_id: newTpl.id, name: item.name,
        category: item.category, sort_order: item.sort_order ?? 0,
      }))
    )
    setSavingAs(false); setSaveAsName('')
    onReload()
  }

  // Carga masiva: parsear texto pegado (una línea = un ítem)
  async function handleBulkAdd() {
    const cat = bulkCat.trim() || 'General'
    const lines = bulkText.split('\n').map(l => l.replace(/^[-•*·]\s*/, '').trim()).filter(Boolean)
    if (lines.length === 0) return
    const base = items.filter(i => i.category === cat).length
    await Promise.all(
      lines.map((name, idx) => createTemplateItem({ template_id: template.id, name, category: cat, sort_order: base + idx }))
    )
    setBulkText(''); setBulkMode(false); load()
  }

  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid var(--border)' }

  if (loading) return <div style={{ padding: '16px 14px', color: 'var(--text-3)', fontSize: 13 }}>Cargando ítems…</div>

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', flex: 1 }}>
          {items.length} ítem{items.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, gap: 5 }}
          onClick={() => { setBulkMode(v => !v); setBulkCat(''); setBulkText('') }}>
          <Plus size={12} /> Carga masiva
        </button>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, gap: 5 }}
          onClick={() => { setSaveAsName(template.name + ' — copia'); setSavingAs(true) }}>
          <Save size={12} /> Guardar como nueva
        </button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Cerrar panel">
          <X size={13} />
        </button>
      </div>

      {/* Carga masiva */}
      {bulkMode && (
        <div style={{ margin: '10px 14px', padding: '14px', border: '1px solid var(--teal)', borderRadius: 8, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Carga masiva de ítems</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            Pegá o escribí una lista — una línea por ítem. Podés usar guiones, bullets o texto plano.
          </div>
          <input className="input" placeholder="Categoría (ej: Mobiliario)" value={bulkCat}
            onChange={e => setBulkCat(e.target.value)} style={{ fontSize: 13 }} />
          <textarea
            className="input" placeholder={'Mesa de trabajo\nSilla ergonómica\n- Estante de madera\n• Iluminación LED'}
            value={bulkText} onChange={e => setBulkText(e.target.value)}
            style={{ fontSize: 13, resize: 'vertical', minHeight: 100, fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleBulkAdd}
              disabled={!bulkText.trim()}>
              Agregar {bulkText.split('\n').filter(l => l.trim()).length} ítems
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setBulkMode(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Guardar como nueva */}
      {savingAs && (
        <div style={{ margin: '10px 14px', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Guardar como nueva plantilla</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>La original no se modifica. Se crea una copia con todos los ítems actuales.</div>
          <input autoFocus className="input" placeholder="Nombre de la nueva plantilla…"
            value={saveAsName} onChange={e => setSaveAsName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveAsNew(); if (e.key === 'Escape') setSavingAs(false) }}
            style={{ fontSize: 13 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveAsNew} disabled={!saveAsName.trim()}>
              <Save size={12} /> Guardar
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSavingAs(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Categorías e ítems */}
      {categories.length === 0 && !addingCat && (
        <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Sin ítems todavía. Usá "Carga masiva" para agregar varios a la vez, o agregá categorías abajo.
        </div>
      )}

      {categories.map(cat => {
        const catItems    = items.filter(i => i.category === cat)
        const isCollapsed = collapsed[cat] ?? false
        return (
          <div key={cat}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: catColor(cat), flexShrink: 0 }} />
              {editingCat === cat ? (
                <>
                  <input autoFocus className="input" value={catVal}
                    onChange={e => setCatVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveCat(cat); if (e.key === 'Escape') setEditingCat(null) }}
                    style={{ flex: 1, fontSize: 12, fontWeight: 600 }} />
                  <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleSaveCat(cat)}><Check size={11} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingCat(null)}><X size={11} /></button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-2)' }}>
                    {cat}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 2 }}>{catItems.length}</span>
                  <button className="btn btn-ghost btn-sm btn-icon" title="Renombrar" onClick={() => { setEditingCat(cat); setCatVal(cat) }}><Pencil size={11} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" title="Eliminar categoría" style={{ color: 'var(--red)' }} onClick={() => handleDeleteCat(cat)}><Trash2 size={11} /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}>
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  </button>
                </>
              )}
            </div>

            {!isCollapsed && (
              <>
                {catItems.map(item => (
                  <div key={item.id} style={{ ...row, background: 'var(--surface)' }}>
                    {editingItemId === item.id ? (
                      <>
                        <input autoFocus className="input" value={editItemVal.name}
                          onChange={e => setEditItemVal(v => ({ ...v, name: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveItem(item.id); if (e.key === 'Escape') setEditingItemId(null) }}
                          style={{ flex: 1, fontSize: 13 }} />
                        <select className="input" value={editItemVal.category}
                          onChange={e => setEditItemVal(v => ({ ...v, category: e.target.value }))}
                          style={{ width: 150, fontSize: 12 }}>
                          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleSaveItem(item.id)}><Check size={12} /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingItemId(null)}><X size={12} /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                        <button className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => { setEditingItemId(item.id); setEditItemVal({ name: item.name, category: item.category }) }}>
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red)' }}
                          onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                {addingItemCat === cat ? (
                  <div style={{ ...row, background: 'var(--surface)' }}>
                    <input autoFocus className="input" placeholder="Nombre del ítem…"
                      value={newItemName} onChange={e => setNewItemName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddItem(cat); if (e.key === 'Escape') setAddingItemCat(null) }}
                      style={{ flex: 1, fontSize: 13 }} />
                    <button className="btn btn-primary btn-sm" onClick={() => handleAddItem(cat)} disabled={!newItemName.trim()}>Agregar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setAddingItemCat(null); setNewItemName('') }}>×</button>
                  </div>
                ) : (
                  <div style={{ padding: '5px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--teal)', fontSize: 12 }}
                      onClick={() => { setAddingItemCat(cat); setNewItemName('') }}>
                      <Plus size={11} /> Agregar ítem
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* Agregar categoría */}
      <div style={{ padding: '8px 14px', borderTop: categories.length > 0 ? '1px solid var(--border)' : 'none' }}>
        {addingCat ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input autoFocus className="input" placeholder="Nombre de la categoría…"
              value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCat(); if (e.key === 'Escape') setAddingCat(false) }}
              style={{ flex: 1, fontSize: 13 }} />
            <button className="btn btn-primary btn-sm" onClick={handleAddCat} disabled={!newCatName.trim()}>Crear</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAddingCat(false)}>×</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-2)', fontSize: 12 }}
            onClick={() => setAddingCat(true)}>
            <Plus size={11} /> Agregar categoría
          </button>
        )}
      </div>

      {/* Eliminar plantilla */}
      <div style={{ padding: '6px 14px 12px', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: 12 }} onClick={onDeleted}>
          <Trash2 size={11} /> Eliminar esta plantilla
        </button>
      </div>
    </div>
  )
}

// ── Modal: usar plantilla → crear par de actas ────────────────────────────────

interface AssignModalProps {
  template: ChecklistTemplate
  onClose: () => void
  onCreated: () => void
  initialProjectId?: string
}

function AssignModal({ template, onClose, onCreated, initialProjectId }: AssignModalProps) {
  const { projects, areas } = useAppStore()
  const navigate = useNavigate()

  const [targetType, setTargetType] = useState<'project' | 'area'>('project')
  const [projectId,  setProjectId]  = useState(initialProjectId ?? '')
  const [areaId,     setAreaId]     = useState('')
  const [firstType,  setFirstType]  = useState<'reception' | 'delivery'>('reception')
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleCreate() {
    const eventId = targetType === 'project' ? projectId : areaId
    if (!eventId) { setError('Seleccioná un destino'); return }
    setCreating(true); setError(null)
    try {
      const { first } = await createLinkedPair(eventId, template.id, firstType)
      onCreated()
      navigate(`/planillas/${first.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally { setCreating(false) }
  }

  return (
    <>
      <div className="modal-bd" onClick={onClose} />
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>Usar: {template.name}</span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Destino */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Asignar a</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button className={`btn btn-sm ${targetType === 'project' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTargetType('project')}>Proyecto</button>
              <button className={`btn btn-sm ${targetType === 'area' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTargetType('area')}>Área</button>
            </div>
            {targetType === 'project' ? (
              <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Seleccionar proyecto…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <select className="input" value={areaId} onChange={e => setAreaId(e.target.value)}>
                <option value="">Seleccionar área…</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>

          {/* Flujo */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
              Acta inicial
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm ${firstType === 'reception' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFirstType('reception')}
                style={{ flex: 1 }}
              >
                📥 Recepción
              </button>
              <button
                className={`btn btn-sm ${firstType === 'delivery' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFirstType('delivery')}
                style={{ flex: 1 }}
              >
                📤 Entrega
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
              Se crearán ambas actas. La seleccionada es la que ocurre primero.
            </div>
          </div>

          {error && <div style={{ fontSize: 13, color: 'var(--red)', padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-md" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-md"
            disabled={creating || (targetType === 'project' ? !projectId : !areaId)}
            onClick={handleCreate}>
            {creating ? 'Creando…' : 'Crear par de actas'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

interface AssignedGroup {
  id: string
  name: string
  kind: 'project' | 'area'
  checklists: EventChecklist[]
}

export default function PlanillasPage() {
  const navigate            = useNavigate()
  const [searchParams]      = useSearchParams()
  const { projects, areas } = useAppStore()

  const [templates, setTemplates]       = useState<ChecklistTemplate[]>([])
  const [assignedGroups, setAssignedGroups] = useState<AssignedGroup[]>([])
  const [loading, setLoading]           = useState(true)

  // plantillas
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editNameVal, setEditNameVal]     = useState('')

  // nueva plantilla
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')

  // usar plantilla
  const [assigningTemplate, setAssigningTemplate] = useState<ChecklistTemplate | null>(null)

  const allIds = [...projects.map(p => p.id), ...areas.map(a => a.id)].join(',')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const tpls = await fetchChecklistTemplates()
      setTemplates(tpls)
      const allEntities: { id: string; name: string; kind: 'project' | 'area' }[] = [
        ...projects.map(p => ({ id: p.id, name: p.name, kind: 'project' as const })),
        ...areas.map(a => ({ id: a.id, name: a.name, kind: 'area' as const })),
      ]
      if (allEntities.length === 0) { setAssignedGroups([]); return }
      const results = await Promise.all(allEntities.map(e => fetchEventChecklists(e.id)))
      const groups: AssignedGroup[] = allEntities
        .map((e, i) => ({ ...e, checklists: results[i] }))
        .filter(g => g.checklists.length > 0)
      setAssignedGroups(groups)
    } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIds])

  useEffect(() => { load() }, [load])

  // Open assign modal if navigated with ?assign=projectId (from ProjectPage)
  useEffect(() => {
    const assignId = searchParams.get('assign')
    if (!assignId || templates.length === 0) return
    setAssigningTemplate(templates[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('assign'), templates.length])

  async function handleCreate() {
    if (!newName.trim()) return
    const tpl = await createChecklistTemplate({ name: newName.trim(), kind: 'custom' })
    setNewName(''); setCreating(false)
    await load()
    setExpandedId(tpl.id)
  }

  async function handleRename(id: string) {
    if (!editNameVal.trim()) return
    await updateChecklistTemplate(id, { name: editNameVal.trim() })
    setEditingNameId(null); load()
  }

  async function handleDuplicate(id: string) {
    const copy = await duplicateChecklistTemplate(id)
    await load()
    setExpandedId(copy.id)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar plantilla "${name}"? Se eliminarán todos sus ítems.`)) return
    await deleteChecklistTemplate(id)
    if (expandedId === id) setExpandedId(null)
    load()
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 24px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Planillas</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>
          Creá o editá plantillas, y usálas para generar pares de actas en proyectos y áreas.
        </p>
      </div>

      {/* ── Plantillas ── */}
      <section style={{ marginBottom: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>
            Plantillas
          </h2>
          <button className="btn btn-primary btn-sm" onClick={() => { setCreating(true); setExpandedId(null) }}>
            <Plus size={13} /> Nueva plantilla
          </button>
        </div>

        {/* Formulario nueva plantilla */}
        {creating && (
          <div style={{ marginBottom: 12, padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--teal)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input autoFocus className="input" placeholder="Nombre de la plantilla (ej: Entrega edificio, Outlet estándar…)"
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!newName.trim()}>
                Crear y agregar ítems
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando…</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
            <ClipboardList size={32} style={{ color: 'var(--text-3)', marginBottom: 10 }} />
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 4px' }}>No hay plantillas todavía.</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 16px' }}>
              Creá una con los ítems a revisar. Podés cargarlos de a uno o pegar una lista completa.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
              <Plus size={13} /> Crear primera plantilla
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {templates.map(tpl => {
              const isExpanded = expandedId === tpl.id
              return (
                <div key={tpl.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, overflow: 'hidden',
                  boxShadow: isExpanded ? '0 2px 10px rgba(0,0,0,.1)' : 'none',
                }}>
                  {/* Fila */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                      cursor: editingNameId === tpl.id ? 'default' : 'pointer',
                      background: isExpanded ? 'var(--surface-2)' : 'var(--surface)',
                    }}
                    onClick={() => { if (editingNameId === tpl.id) return; setExpandedId(isExpanded ? null : tpl.id) }}
                  >
                    <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingNameId === tpl.id ? (
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <input autoFocus className="input" value={editNameVal}
                            onChange={e => setEditNameVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRename(tpl.id); if (e.key === 'Escape') setEditingNameId(null) }}
                            style={{ flex: 1, fontSize: 13 }} />
                          <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleRename(tpl.id)}><Check size={12} /></button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingNameId(null)}><X size={12} /></button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</span>
                      )}
                    </div>

                    {editingNameId !== tpl.id && (
                      <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-primary btn-sm" style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => setAssigningTemplate(tpl)}>
                          Usar
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Renombrar"
                          onClick={() => { setEditingNameId(tpl.id); setEditNameVal(tpl.name) }}>
                          <Pencil size={12} />
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Duplicar"
                          onClick={() => handleDuplicate(tpl.id)}>
                          <Copy size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <ExpandedPanel
                      template={tpl}
                      onClose={() => setExpandedId(null)}
                      onReload={load}
                      onDeleted={() => handleDelete(tpl.id, tpl.name)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Planillas activas ── */}
      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 16px' }}>
          Planillas activas
        </h2>

        {!loading && assignedGroups.length === 0 ? (
          <div style={{ padding: '24px 20px', border: '1px dashed var(--border)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              No hay planillas asignadas. Usá una plantilla de arriba para crear la primera.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {assignedGroups.map(group => (
              <div key={group.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                {/* Header del grupo */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)' }}>
                  <FolderOpen size={13} style={{ color: 'var(--text-3)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{group.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: group.kind === 'project' ? 'var(--teal-bg)' : 'var(--surface)', color: group.kind === 'project' ? 'var(--teal)' : 'var(--text-3)', border: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {group.kind === 'project' ? 'Proyecto' : 'Área'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {group.checklists.length} planilla{group.checklists.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Pares de actas */}
                {(() => {
                  const cls  = [...group.checklists].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  const used = new Set<string>()
                  const pairs: Array<{ primary: EventChecklist; sibling?: EventChecklist }> = []

                  for (const cl of cls) {
                    if (used.has(cl.id)) continue
                    const partner = cls.find(other =>
                      !used.has(other.id) && other.id !== cl.id &&
                      other.template_id === cl.template_id && cl.template_id !== null &&
                      Math.abs(new Date(other.created_at).getTime() - new Date(cl.created_at).getTime()) < 30_000
                    )
                    used.add(cl.id)
                    if (partner) used.add(partner.id)
                    pairs.push({ primary: cl, sibling: partner })
                  }

                  return pairs.map(({ primary, sibling }, pairIdx) => (
                    <div key={primary.id} style={{ borderBottom: pairIdx < pairs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      {sibling ? (
                        <div style={{ padding: '10px 16px' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 8 }}>
                            Par de actas · {new Date(primary.created_at).toLocaleDateString('es-AR')}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[primary, sibling].map(cl => {
                              const isRec = cl.type === 'reception'
                              const accent = isRec ? 'var(--teal)' : '#6366f1'
                              const accentBg = isRec ? 'var(--teal-bg)' : '#eef2ff'
                              return (
                                <div key={cl.id} onClick={() => navigate(`/planillas/${cl.id}`)}
                                  style={{ flex: 1, minWidth: 160, cursor: 'pointer', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: '10px 12px', background: 'var(--surface)', transition: 'background .1s' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = accentBg)}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>
                                      {isRec ? '📥 Recepción' : '📤 Entrega'}
                                    </span>
                                    <StatusBadge status={cl.status} />
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{statusLabel(cl.status)}</div>
                                  {cl.status === 'completed' && cl.completed_at && (
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                      Cerrada {new Date(cl.completed_at).toLocaleDateString('es-AR')}
                                    </div>
                                  )}
                                  <div style={{ marginTop: 6, textAlign: 'right' }}>
                                    <ChevronRight size={12} style={{ color: accent }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => navigate(`/planillas/${primary.id}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', transition: 'background .1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <StatusBadge status={primary.status} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              {primary.title ?? `Acta de ${primary.type === 'reception' ? 'recepción' : 'entrega'}`}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{statusLabel(primary.status)}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(primary.created_at).toLocaleDateString('es-AR')}</span>
                          <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal asignar */}
      {assigningTemplate && (
        <AssignModal
          template={assigningTemplate}
          onClose={() => setAssigningTemplate(null)}
          onCreated={() => { setAssigningTemplate(null); load() }}
          initialProjectId={searchParams.get('assign') ?? undefined}
        />
      )}
    </div>
  )
}
