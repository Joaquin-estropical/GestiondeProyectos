import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Copy, Trash2, Layers, Pencil, Check, X,
  ChevronDown, ChevronRight, Save,
} from 'lucide-react'
import type { ChecklistTemplate, TemplateItem, TemplateKind } from '@/types'
import { TEMPLATE_KIND_LABELS, DEFAULT_CATEGORIES } from '@/types'
import {
  fetchChecklistTemplates, createChecklistTemplate,
  updateChecklistTemplate, deleteChecklistTemplate, duplicateChecklistTemplate,
  fetchTemplateItems, createTemplateItem, updateTemplateItem, deleteTemplateItem,
  renameCategory, deleteCategoryItems,
} from '@/lib/planillas'

const KIND_COLORS: Record<TemplateKind, string> = {
  event_delivery:  '#6366f1',
  branch_delivery: '#0d9488',
  local_return:    '#f59e0b',
  custom:          '#6b7280',
}

const CAT_COLORS: Record<string, string> = {
  'Mobiliario': '#6366f1', 'Telas y textiles': '#ec4899', 'Decoración': '#f59e0b',
  'Iluminación': '#eab308', 'Audiovisual': '#3b82f6', 'Instalaciones': '#10b981',
}
function catColor(cat: string) { return CAT_COLORS[cat] ?? '#6b7280' }

// ── Inline item editor inside expanded template ──────────────────────────────

interface ExpandedPanelProps {
  template: ChecklistTemplate
  onClose: () => void
  onSaveAsNew: (tplId: string, items: TemplateItem[]) => void
  onDeleted: () => void
}

function ExpandedPanel({ template, onClose, onSaveAsNew, onDeleted }: ExpandedPanelProps) {
  const [items, setItems]       = useState<TemplateItem[]>([])
  const [loading, setLoading]   = useState(true)

  const [editingItemId, setEditingItemId]   = useState<string | null>(null)
  const [editItemVal, setEditItemVal]       = useState({ name: '', category: '' })

  const [editingCat, setEditingCat]         = useState<string | null>(null)
  const [catVal, setCatVal]                 = useState('')
  const [collapsed, setCollapsed]           = useState<Record<string, boolean>>({})

  const [addingItemCat, setAddingItemCat]   = useState<string | null>(null)
  const [newItemName, setNewItemName]       = useState('')

  const [addingCat, setAddingCat]           = useState(false)
  const [newCatName, setNewCatName]         = useState('')

  // "Save as new" modal state
  const [savingAs, setSavingAs]             = useState(false)
  const [saveAsName, setSaveAsName]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchTemplateItems(template.id)) }
    finally { setLoading(false) }
  }, [template.id])

  useEffect(() => { load() }, [load])

  const categories = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...items.map(i => i.category),
  ])).filter(cat => items.some(i => i.category === cat))

  const allCategories = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...items.map(i => i.category),
  ]))

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
    await createTemplateItem({
      template_id: template.id, name: newItemName.trim(),
      category: cat, sort_order: catItems.length,
    })
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
    if (!confirm('¿Eliminar este ítem de la plantilla?')) return
    await deleteTemplateItem(id); load()
  }

  async function handleSaveAsNew() {
    const name = saveAsName.trim()
    if (!name) return
    const newTpl = await createChecklistTemplate({ name, kind: template.kind })
    if (items.length > 0) {
      await Promise.all(
        items.map(item => createTemplateItem({
          template_id: newTpl.id, name: item.name,
          category: item.category, sort_order: item.sort_order ?? 0,
        }))
      )
    }
    setSavingAs(false); setSaveAsName('')
    onSaveAsNew(newTpl.id, items)
  }

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', borderBottom: '1px solid var(--border)',
  }

  if (loading) return (
    <div style={{ padding: '20px 14px', color: 'var(--text-3)', fontSize: 13 }}>Cargando ítems…</div>
  )

  return (
    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', flex: 1 }}>
          {items.length} ítem{items.length !== 1 ? 's' : ''}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => { setSaveAsName(template.name + ' — copia'); setSavingAs(true) }}
          style={{ fontSize: 12, gap: 5 }}
        >
          <Save size={12} /> Guardar como nueva plantilla
        </button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Cerrar">
          <X size={13} />
        </button>
      </div>

      {/* Save-as modal inline */}
      {savingAs && (
        <div style={{
          margin: '10px 14px', padding: '12px 14px',
          border: '1px solid var(--teal)', borderRadius: 8,
          background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Guardar como nueva plantilla</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            La plantilla original no se modifica. Se crea una copia con el nombre que elijas.
          </div>
          <input
            autoFocus className="input" placeholder="Nombre de la nueva plantilla…"
            value={saveAsName} onChange={e => setSaveAsName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveAsNew(); if (e.key === 'Escape') setSavingAs(false) }}
            style={{ fontSize: 13 }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveAsNew} disabled={!saveAsName.trim()}>
              <Save size={12} /> Guardar
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSavingAs(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Categories + items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {categories.map(cat => {
          const catItems    = items.filter(i => i.category === cat)
          const isCollapsed = collapsed[cat] ?? false
          return (
            <div key={cat}>
              {/* Category header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', background: 'var(--surface-2)',
                borderTop: '1px solid var(--border)',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: catColor(cat), flexShrink: 0 }} />

                {editingCat === cat ? (
                  <>
                    <input
                      autoFocus className="input" value={catVal}
                      onChange={e => setCatVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveCat(cat); if (e.key === 'Escape') setEditingCat(null) }}
                      style={{ flex: 1, fontSize: 12, fontWeight: 600 }}
                    />
                    <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleSaveCat(cat)}><Check size={11} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingCat(null)}><X size={11} /></button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-2)' }}>
                      {cat}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 2 }}>{catItems.length}</span>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Renombrar"
                      onClick={() => { setEditingCat(cat); setCatVal(cat) }}>
                      <Pencil size={11} />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon" title="Eliminar categoría"
                      style={{ color: 'var(--red)' }} onClick={() => handleDeleteCat(cat)}>
                      <Trash2 size={11} />
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}>
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
                          <input
                            autoFocus className="input" value={editItemVal.name}
                            onChange={e => setEditItemVal(v => ({ ...v, name: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveItem(item.id); if (e.key === 'Escape') setEditingItemId(null) }}
                            style={{ flex: 1, fontSize: 13 }}
                          />
                          <select
                            className="input" value={editItemVal.category}
                            onChange={e => setEditItemVal(v => ({ ...v, category: e.target.value }))}
                            style={{ width: 150, fontSize: 12 }}
                          >
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

                  {/* Add item */}
                  {addingItemCat === cat ? (
                    <div style={{ ...row, background: 'var(--surface)' }}>
                      <input
                        autoFocus className="input" placeholder="Nombre del ítem…"
                        value={newItemName} onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItem(cat); if (e.key === 'Escape') setAddingItemCat(null) }}
                        style={{ flex: 1, fontSize: 13 }}
                      />
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

        {/* Add category */}
        <div style={{ padding: '8px 14px', borderTop: categories.length > 0 ? '1px solid var(--border)' : 'none' }}>
          {addingCat ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus className="input" placeholder="Nombre de la categoría…"
                value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCat(); if (e.key === 'Escape') setAddingCat(false) }}
                style={{ flex: 1, fontSize: 13 }}
              />
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
      </div>

      {/* Delete template */}
      <div style={{ padding: '8px 14px 12px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--red)', fontSize: 12 }}
          onClick={onDeleted}
        >
          <Trash2 size={11} /> Eliminar esta plantilla
        </button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates]   = useState<ChecklistTemplate[]>([])
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [newKind, setNewKind]       = useState<TemplateKind>('custom')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTemplates(await fetchChecklistTemplates()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!newName.trim()) return
    const tpl = await createChecklistTemplate({ name: newName.trim(), kind: newKind })
    setNewName(''); setCreating(false)
    await load()
    setExpandedId(tpl.id)
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    await updateChecklistTemplate(id, { name: editName.trim() })
    setEditingId(null); load()
  }

  async function handleDuplicate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
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

  const kindEntries = Object.entries(TEMPLATE_KIND_LABELS) as [TemplateKind, string][]

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Plantillas de planillas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>
            Hacé clic en una plantilla para expandirla y editar sus ítems directamente.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setCreating(true); setExpandedId(null) }}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16,
          background: 'var(--surface-2)', border: '1px solid var(--teal)',
          borderRadius: 8, padding: '14px 16px',
        }}>
          <input
            autoFocus className="input" placeholder="Nombre de la plantilla…"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
          />
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Tipo</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {kindEntries.map(([k, label]) => (
                <button key={k} className={`btn btn-sm ${newKind === k ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setNewKind(k)} style={{ fontSize: 12 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!newName.trim()}>Crear y editar ítems</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Template list */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '48px 0', fontSize: 14 }}>Cargando…</div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
          <Layers size={36} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>No hay plantillas todavía.</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => setCreating(true)}>
            <Plus size={13} /> Crear primera plantilla
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {templates.map(tpl => {
            const isExpanded = expandedId === tpl.id
            return (
              <div
                key={tpl.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${KIND_COLORS[tpl.kind]}`,
                  borderRadius: 8, overflow: 'hidden',
                  boxShadow: isExpanded ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
                  transition: 'box-shadow .15s',
                }}
              >
                {/* Template row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px',
                    cursor: editingId === tpl.id ? 'default' : 'pointer',
                    background: isExpanded ? 'var(--surface-2)' : 'var(--surface)',
                  }}
                  onClick={() => {
                    if (editingId === tpl.id) return
                    setExpandedId(isExpanded ? null : tpl.id)
                  }}
                >
                  {/* Chevron */}
                  <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>

                  {/* Name / edit */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingId === tpl.id ? (
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <input
                          autoFocus className="input" value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(tpl.id); if (e.key === 'Escape') setEditingId(null) }}
                          style={{ flex: 1, fontSize: 13 }}
                        />
                        <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleRename(tpl.id)}><Check size={13} /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingId(null)}><X size={13} /></button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
                        <div style={{ fontSize: 11, color: KIND_COLORS[tpl.kind], marginTop: 2, fontWeight: 500 }}>
                          {TEMPLATE_KIND_LABELS[tpl.kind]}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== tpl.id && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Renombrar"
                        onClick={() => { setEditingId(tpl.id); setEditName(tpl.name) }}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Duplicar"
                        onClick={e => handleDuplicate(tpl.id, e)}>
                        <Copy size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Ver / editar ítems"
                        style={{ color: 'var(--text-2)' }}
                        onClick={() => navigate(`/planillas/plantillas/${tpl.id}`)}>
                        ↗
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded inline panel */}
                {isExpanded && (
                  <ExpandedPanel
                    template={tpl}
                    onClose={() => setExpandedId(null)}
                    onSaveAsNew={(_id, _items) => { load() }}
                    onDeleted={() => handleDelete(tpl.id, tpl.name)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
