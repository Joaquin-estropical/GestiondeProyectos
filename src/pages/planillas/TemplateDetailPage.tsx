import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import type { ChecklistTemplate, TemplateItem } from '@/types'
import { DEFAULT_CATEGORIES } from '@/types'
import {
  fetchChecklistTemplates, updateChecklistTemplate,
  fetchTemplateItems, createTemplateItem, updateTemplateItem, deleteTemplateItem,
  renameCategory, deleteCategoryItems,
} from '@/lib/planillas'

const CAT_COLORS: Record<string, string> = {
  'Mobiliario': '#6366f1', 'Telas y textiles': '#ec4899', 'Decoración': '#f59e0b',
  'Iluminación': '#eab308', 'Audiovisual': '#3b82f6', 'Instalaciones': '#10b981',
}
function catColor(cat: string) { return CAT_COLORS[cat] ?? '#6b7280' }

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate       = useNavigate()

  const [template, setTemplate]     = useState<ChecklistTemplate | null>(null)
  const [items, setItems]           = useState<TemplateItem[]>([])
  const [loading, setLoading]       = useState(true)

  // template name editing
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal]         = useState('')

  // category editing
  const [editingCat, setEditingCat]   = useState<string | null>(null)
  const [catVal, setCatVal]           = useState('')
  const [collapsed, setCollapsed]     = useState<Record<string, boolean>>({})

  // new category
  const [addingCat, setAddingCat]     = useState(false)
  const [newCatName, setNewCatName]   = useState('')

  // item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editItemVal, setEditItemVal]     = useState({ name: '', category: '' })

  // new item per category
  const [addingItemCat, setAddingItemCat] = useState<string | null>(null)
  const [newItemName, setNewItemName]     = useState('')

  const load = useCallback(async () => {
    if (!templateId) return
    setLoading(true)
    try {
      const [tpls, its] = await Promise.all([
        fetchChecklistTemplates(),
        fetchTemplateItems(templateId),
      ])
      const tpl = tpls.find(t => t.id === templateId)
      if (tpl) { setTemplate(tpl); setNameVal(tpl.name) }
      setItems(its)
    } finally { setLoading(false) }
  }, [templateId])

  useEffect(() => { load() }, [load])

  async function saveName() {
    if (!template || !nameVal.trim()) return
    await updateChecklistTemplate(template.id, { name: nameVal.trim() })
    setTemplate({ ...template, name: nameVal.trim() })
    setEditingName(false)
  }

  // derive ordered category list from items + defaults
  const categories = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...items.map(i => i.category),
  ])).filter(cat => items.some(i => i.category === cat))

  // All unique categories including ones with no items (so user can add to them)
  const allCategories = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...items.map(i => i.category),
  ]))

  async function handleSaveCat(oldCat: string) {
    if (!catVal.trim() || !templateId) return
    await renameCategory(templateId, oldCat, catVal.trim())
    setEditingCat(null)
    load()
  }

  async function handleDeleteCat(cat: string) {
    const count = items.filter(i => i.category === cat).length
    if (!confirm(`¿Eliminar categoría "${cat}"${count > 0 ? ` y sus ${count} ítem${count !== 1 ? 's' : ''}` : ''}?`)) return
    if (!templateId) return
    await deleteCategoryItems(templateId, cat)
    load()
  }

  async function handleAddItemToCategory(cat: string) {
    if (!newItemName.trim() || !templateId) return
    const catItems = items.filter(i => i.category === cat)
    await createTemplateItem({
      template_id: templateId, name: newItemName.trim(),
      category: cat, sort_order: catItems.length,
    })
    setNewItemName(''); setAddingItemCat(null); load()
  }

  async function handleAddNewCategory() {
    if (!newCatName.trim() || !templateId) return
    // Create a placeholder item to establish the category
    await createTemplateItem({ template_id: templateId, name: 'Nuevo ítem', category: newCatName.trim(), sort_order: 0 })
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

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '64px 0', fontSize: 14 }}>Cargando…</div>
  if (!template) return <div style={{ textAlign: 'center', color: 'var(--red)', padding: '64px 0', fontSize: 14 }}>Formulario no encontrado.</div>

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '28px 24px' }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/planillas/plantillas')} style={{ marginBottom: 20, color: 'var(--text-3)' }}>
        <ArrowLeft size={14} /> Formularios
      </button>

      {/* Template name */}
      <div style={{ marginBottom: 28 }}>
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus className="input" value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              style={{ fontSize: 20, fontWeight: 700, flex: 1 }}
            />
            <button className="btn btn-primary btn-sm btn-icon" onClick={saveName}><Check size={14} /></button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingName(false)}><X size={14} /></button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{template.name}</h1>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingName(true)} style={{ color: 'var(--text-3)' }}>
              <Pencil size={13} />
            </button>
          </div>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '6px 0 0' }}>
          {items.length} ítem{items.length !== 1 ? 's' : ''} · Editá la lista base de este formulario en línea
        </p>
      </div>

      {/* Categories + items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {categories.map(cat => {
          const catItems   = items.filter(i => i.category === cat)
          const isCollapsed = collapsed[cat] ?? false
          return (
            <div key={cat} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Category header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', background: 'var(--surface-2)',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
              }}>
                <span
                  style={{ width: 8, height: 8, borderRadius: 2, background: catColor(cat), flexShrink: 0 }}
                />

                {editingCat === cat ? (
                  <>
                    <input
                      autoFocus className="input" value={catVal}
                      onChange={e => setCatVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveCat(cat); if (e.key === 'Escape') setEditingCat(null) }}
                      style={{ flex: 1, fontSize: 13, fontWeight: 600 }}
                    />
                    <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleSaveCat(cat)}><Check size={12} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingCat(null)}><X size={12} /></button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-2)' }}>
                      {cat}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 4 }}>{catItems.length}</span>
                    <button
                      className="btn btn-ghost btn-sm btn-icon" title="Renombrar categoría"
                      onClick={() => { setEditingCat(cat); setCatVal(cat) }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon" title="Eliminar categoría"
                      style={{ color: 'var(--red)' }}
                      onClick={() => handleDeleteCat(cat)}
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                    >
                      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </>
                )}
              </div>

              {!isCollapsed && (
                <div>
                  {catItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {editingItemId === item.id ? (
                        <>
                          <input
                            autoFocus className="input" value={editItemVal.name}
                            onChange={e => setEditItemVal(v => ({ ...v, name: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveItem(item.id); if (e.key === 'Escape') setEditingItemId(null) }}
                            style={{ flex: 1, fontSize: 13 }}
                          />
                          <select
                            className="input"
                            value={editItemVal.category}
                            onChange={e => setEditItemVal(v => ({ ...v, category: e.target.value }))}
                            style={{ width: 160, fontSize: 12 }}
                          >
                            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleSaveItem(item.id)}><Check size={12} /></button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingItemId(null)}><X size={12} /></button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => { setEditingItemId(item.id); setEditItemVal({ name: item.name, category: item.category }) }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red)' }}
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Add item to this category */}
                  {addingItemCat === cat ? (
                    <div style={{ display: 'flex', gap: 8, padding: '8px 14px', alignItems: 'center' }}>
                      <input
                        autoFocus className="input" placeholder="Nombre del ítem…"
                        value={newItemName} onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItemToCategory(cat); if (e.key === 'Escape') setAddingItemCat(null) }}
                        style={{ flex: 1, fontSize: 13 }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleAddItemToCategory(cat)} disabled={!newItemName.trim()}>Agregar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAddingItemCat(null); setNewItemName('') }}>Cancelar</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setAddingItemCat(cat); setNewItemName('') }}
                      style={{ color: 'var(--teal)', margin: '6px 14px', alignSelf: 'flex-start' }}
                    >
                      <Plus size={12} /> Agregar ítem
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Add new category */}
        {addingCat ? (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            border: '1px solid var(--teal)', borderRadius: 8, padding: '10px 14px',
            background: 'var(--surface-2)',
          }}>
            <input
              autoFocus className="input" placeholder="Nombre de la nueva categoría…"
              value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddNewCategory(); if (e.key === 'Escape') setAddingCat(false) }}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddNewCategory} disabled={!newCatName.trim()}>Crear</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAddingCat(false)}>Cancelar</button>
          </div>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setAddingCat(true)}
            style={{ color: 'var(--text-2)', alignSelf: 'flex-start' }}
          >
            <Plus size={13} /> Agregar categoría
          </button>
        )}
      </div>
    </div>
  )
}
