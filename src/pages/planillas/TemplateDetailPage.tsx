import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, GripVertical, Pencil, Check, X } from 'lucide-react'
import type { ChecklistTemplate, TemplateItem, ItemCategory } from '@/types'
import { ITEM_CATEGORIES } from '@/types'
import {
  fetchChecklistTemplates, updateChecklistTemplate,
  fetchTemplateItems, createTemplateItem, updateTemplateItem, deleteTemplateItem,
} from '@/lib/planillas'

const CAT_COLORS: Record<string, string> = {
  Mobiliario:   '#6366f1',
  Telas:        '#ec4899',
  Pintura:      '#f59e0b',
  Iluminación:  '#eab308',
  Audiovisual:  '#3b82f6',
  Instalaciones:'#10b981',
  Otro:         '#6b7280',
}

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [items, setItems]       = useState<TemplateItem[]>([])
  const [loading, setLoading]   = useState(true)

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal]         = useState('')

  const [newItem, setNewItem]  = useState({ name: '', category: '' as ItemCategory | '', qty: 1 })
  const [addingItem, setAddingItem] = useState(false)

  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editVal, setEditVal] = useState({ name: '', category: '' as ItemCategory | '', qty: 1 })

  useEffect(() => { if (templateId) load() }, [templateId])

  async function load() {
    setLoading(true)
    try {
      const [tpls, its] = await Promise.all([
        fetchChecklistTemplates(),
        fetchTemplateItems(templateId!),
      ])
      const tpl = tpls.find(t => t.id === templateId)
      if (tpl) { setTemplate(tpl); setNameVal(tpl.name) }
      setItems(its)
    } finally { setLoading(false) }
  }

  async function saveName() {
    if (!template || !nameVal.trim()) return
    await updateChecklistTemplate(template.id, { name: nameVal.trim() })
    setTemplate({ ...template, name: nameVal.trim() })
    setEditingName(false)
  }

  async function handleAddItem() {
    if (!newItem.name.trim() || !templateId) return
    const order = items.length
    await createTemplateItem({
      template_id: templateId,
      name:        newItem.name.trim(),
      category:    newItem.category || undefined,
      default_qty: newItem.qty,
      sort_order:  order,
    })
    setNewItem({ name: '', category: '', qty: 1 })
    setAddingItem(false)
    load()
  }

  async function handleSaveItem(id: string) {
    await updateTemplateItem(id, {
      name:        editVal.name.trim(),
      category:    (editVal.category || null) as ItemCategory | null,
      default_qty: editVal.qty,
    })
    setEditingItem(null)
    load()
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('¿Eliminar este ítem de la plantilla?')) return
    await deleteTemplateItem(id)
    load()
  }

  if (loading) return (
    <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '64px 0', fontSize: 14 }}>
      Cargando…
    </div>
  )
  if (!template) return (
    <div style={{ textAlign: 'center', color: 'var(--red)', padding: '64px 0', fontSize: 14 }}>
      Plantilla no encontrada.
    </div>
  )

  const grouped = ITEM_CATEGORIES.reduce<Record<string, TemplateItem[]>>((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat)
    return acc
  }, {} as Record<string, TemplateItem[]>)
  const uncategorized = items.filter(i => !i.category || i.category === 'Otro')

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>
      {/* Back */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/planillas/plantillas')}
        style={{ marginBottom: 20, color: 'var(--text-3)' }}
      >
        <ArrowLeft size={14} /> Plantillas
      </button>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus className="input"
              value={nameVal}
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
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => setEditingName(true)}
              style={{ color: 'var(--text-3)' }}
            >
              <Pencil size={13} />
            </button>
          </div>
        )}
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '6px 0 0' }}>
          {items.length} ítem{items.length !== 1 ? 's' : ''} · Edita la lista base de esta plantilla
        </p>
      </div>

      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {items.length === 0 && !addingItem && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
            Sin ítems todavía. Agrega el primero abajo.
          </div>
        )}

        {items.map(item => (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 7, padding: '9px 12px',
            }}
          >
            <GripVertical size={14} style={{ color: 'var(--text-3)', flexShrink: 0, cursor: 'grab' }} />

            {editingItem === item.id ? (
              <>
                <input
                  autoFocus className="input"
                  value={editVal.name}
                  onChange={e => setEditVal(v => ({ ...v, name: e.target.value }))}
                  style={{ flex: 1, fontSize: 13 }}
                />
                <select
                  className="input"
                  value={editVal.category}
                  onChange={e => setEditVal(v => ({ ...v, category: e.target.value as ItemCategory }))}
                  style={{ width: 140, fontSize: 12 }}
                >
                  <option value="">Sin categoría</option>
                  {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  type="number" min={1} className="input"
                  value={editVal.qty}
                  onChange={e => setEditVal(v => ({ ...v, qty: Number(e.target.value) }))}
                  style={{ width: 64, fontSize: 13, textAlign: 'center' }}
                />
                <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleSaveItem(item.id)}><Check size={13} /></button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingItem(null)}><X size={13} /></button>
              </>
            ) : (
              <>
                {item.category && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                    background: CAT_COLORS[item.category] + '22', color: CAT_COLORS[item.category],
                  }}>{item.category}</span>
                )}
                <span style={{ flex: 1, fontSize: 13 }}>{item.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', minWidth: 40, textAlign: 'right' }}>
                  ×{item.default_qty}
                </span>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => { setEditingItem(item.id); setEditVal({ name: item.name, category: (item.category as ItemCategory) ?? '', qty: item.default_qty }) }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  style={{ color: 'var(--red)' }}
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Add item inline */}
        {addingItem ? (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--teal)',
            borderRadius: 7, padding: '9px 12px',
          }}>
            <input
              autoFocus className="input"
              placeholder="Nombre del ítem…"
              value={newItem.name}
              onChange={e => setNewItem(v => ({ ...v, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAddItem(); if (e.key === 'Escape') setAddingItem(false) }}
              style={{ flex: 1, fontSize: 13 }}
            />
            <select
              className="input"
              value={newItem.category}
              onChange={e => setNewItem(v => ({ ...v, category: e.target.value as ItemCategory }))}
              style={{ width: 140, fontSize: 12 }}
            >
              <option value="">Sin categoría</option>
              {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number" min={1} className="input"
              value={newItem.qty}
              onChange={e => setNewItem(v => ({ ...v, qty: Number(e.target.value) }))}
              style={{ width: 64, fontSize: 13, textAlign: 'center' }}
              title="Cantidad por defecto"
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddItem} disabled={!newItem.name.trim()}>
              Agregar
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAddingItem(false)}>Cancelar</button>
          </div>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setAddingItem(true)}
            style={{ alignSelf: 'flex-start', color: 'var(--teal)', marginTop: 4 }}
          >
            <Plus size={13} /> Agregar ítem
          </button>
        )}
      </div>
    </div>
  )
}
