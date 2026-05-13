import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Printer, Lock, Trash2, Camera, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, Minus,
} from 'lucide-react'
import type { EventChecklist, ChecklistItem, ItemCondition, ItemCategory } from '@/types'
import { ITEM_CATEGORIES } from '@/types'
import {
  fetchEventChecklists, fetchChecklistItems,
  createChecklistItem, updateChecklistItem, deleteChecklistItem,
  updateChecklistStatus, createDeliveryFromReception,
  uploadItemPhoto, calcDelta,
} from '@/lib/planillas'
import { useAppStore } from '@/stores/app'

const CONDITION_LABELS: Record<ItemCondition, string> = {
  good: 'Buena',
  fair: 'Regular',
  poor: 'Mala',
}
const CONDITION_COLORS: Record<ItemCondition, string> = {
  good: 'var(--teal)',
  fair: '#f59e0b',
  poor: 'var(--red)',
}
const CAT_COLORS: Record<string, string> = {
  Mobiliario: '#6366f1', Telas: '#ec4899', Pintura: '#f59e0b',
  Iluminación: '#eab308', Audiovisual: '#3b82f6', Instalaciones: '#10b981', Otro: '#6b7280',
}

function ConditionPicker({
  value, onChange, field,
}: { value: ItemCondition | null; onChange: (v: ItemCondition) => void; field: 'in' | 'out' }) {
  const conditions: ItemCondition[] = ['good', 'fair', 'poor']
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {conditions.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid',
            cursor: 'pointer', fontWeight: value === c ? 600 : 400,
            borderColor: value === c ? CONDITION_COLORS[c] : 'var(--border)',
            background:  value === c ? CONDITION_COLORS[c] + '22' : 'transparent',
            color:       value === c ? CONDITION_COLORS[c] : 'var(--text-2)',
          }}
        >
          {CONDITION_LABELS[c]}
        </button>
      ))}
    </div>
  )
}

export default function ChecklistDetailPage() {
  const { checklistId } = useParams<{ checklistId: string }>()
  const navigate = useNavigate()
  const { projects } = useAppStore()

  const [checklist, setChecklist]   = useState<EventChecklist | null>(null)
  const [sibling, setSibling]       = useState<EventChecklist | null>(null)
  const [items, setItems]           = useState<ChecklistItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState<string | null>(null)

  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem]       = useState({ name: '', category: '' as ItemCategory | '', qty: 1 })

  const [collapsed, setCollapsed]   = useState<Record<string, boolean>>({})
  const [creatingDelivery, setCreatingDelivery] = useState(false)

  const photoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  useEffect(() => { if (checklistId) load() }, [checklistId])

  async function load() {
    setLoading(true)
    try {
      const its = await fetchChecklistItems(checklistId!)
      setItems(its)
      if (its.length > 0) {
        // Find the parent checklist via event_id — we need to fetch it
        const cl = await getChecklist()
        if (cl) {
          setChecklist(cl)
          const siblings = await fetchEventChecklists(cl.event_id)
          const other = siblings.find(s => s.id !== cl.id)
          setSibling(other ?? null)
        }
      } else {
        const cl = await getChecklist()
        if (cl) {
          setChecklist(cl)
          const siblings = await fetchEventChecklists(cl.event_id)
          const other = siblings.find(s => s.id !== cl.id)
          setSibling(other ?? null)
        }
      }
    } finally { setLoading(false) }
  }

  async function getChecklist(): Promise<EventChecklist | null> {
    // We don't have a direct fetchChecklistById — search across known projects
    for (const p of projects) {
      const cls = await fetchEventChecklists(p.id)
      const found = cls.find(c => c.id === checklistId)
      if (found) return found
    }
    return null
  }

  async function setCondition(
    itemId: string, field: 'condition_in' | 'condition_out', value: ItemCondition
  ) {
    setSaving(itemId)
    await updateChecklistItem(itemId, { [field]: value })
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, [field]: value } : it))
    setSaving(null)
  }

  async function setNotes(itemId: string, notes: string) {
    await updateChecklistItem(itemId, { notes })
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, notes } : it))
  }

  async function handleAddItem() {
    if (!newItem.name.trim() || !checklistId) return
    const order = items.length
    const created = await createChecklistItem({
      checklist_id: checklistId,
      name:         newItem.name.trim(),
      category:     newItem.category || undefined,
      qty:          newItem.qty,
      sort_order:   order,
    })
    setItems(prev => [...prev, created])
    setNewItem({ name: '', category: '', qty: 1 })
    setAddingItem(false)
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('¿Eliminar este ítem del acta?')) return
    await deleteChecklistItem(id)
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function handleClose() {
    if (!checklist) return
    if (!confirm('¿Cerrar esta acta? Ya no se podrá editar.')) return
    await updateChecklistStatus(checklist.id, 'completed')
    setChecklist({ ...checklist, status: 'completed' })
  }

  async function handleCreateDelivery() {
    if (!checklist) return
    setCreatingDelivery(true)
    try {
      const { checklist: deliveryCl } = await createDeliveryFromReception(checklist.id, checklist.event_id)
      navigate(`/planillas/${deliveryCl.id}`)
    } finally { setCreatingDelivery(false) }
  }

  async function handlePhotoUpload(itemId: string, file: File) {
    if (!checklist) return
    const eventId = checklist.event_id
    setSaving(itemId)
    try {
      const url = await uploadItemPhoto(eventId, checklist.id, itemId, file)
      const item = items.find(i => i.id === itemId)
      const photos = [...(item?.photos ?? []), url]
      await updateChecklistItem(itemId, { photos })
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, photos } : it))
    } catch (err) {
      alert('Error al subir foto: ' + (err as Error).message)
    } finally { setSaving(null) }
  }

  const isReception = checklist?.type === 'reception'
  const isCompleted = checklist?.status === 'completed'
  const projectName = projects.find(p => p.id === checklist?.event_id)?.name ?? checklist?.event_id ?? ''

  // Group items by category
  const grouped = ITEM_CATEGORIES.reduce<Record<string, ChecklistItem[]>>((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat)
    return acc
  }, {} as Record<string, ChecklistItem[]>)
  const uncategorized = items.filter(i => !i.category || !ITEM_CATEGORIES.includes(i.category as ItemCategory))
  if (uncategorized.length > 0) grouped['Sin categoría'] = uncategorized

  const worsened = items.filter(i => calcDelta(i) === 'worsened').length
  const notReviewed = items.filter(i => calcDelta(i) === 'not_reviewed' && checklist?.type === 'delivery').length

  if (loading) return (
    <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '64px 0', fontSize: 14 }}>Cargando…</div>
  )
  if (!checklist) return (
    <div style={{ textAlign: 'center', color: 'var(--red)', padding: '64px 0', fontSize: 14 }}>Planilla no encontrada.</div>
  )

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/planillas')} style={{ marginBottom: 20, color: 'var(--text-3)' }}>
        <ArrowLeft size={14} /> Planillas
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
              {isReception ? 'Acta de recepción' : 'Acta de entrega'}
            </h1>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: isCompleted ? 'var(--teal-bg)' : checklist.status === 'in_progress' ? '#fef3c7' : 'var(--surface-2)',
              color:      isCompleted ? 'var(--teal)' : checklist.status === 'in_progress' ? '#92400e' : 'var(--text-3)',
            }}>
              {isCompleted ? 'Cerrada' : checklist.status === 'in_progress' ? 'En curso' : 'Pendiente'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            {projectName} · {items.length} ítems · {new Date(checklist.created_at).toLocaleDateString('es-AR')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/planillas/${checklistId}/imprimir`)}
          >
            <Printer size={13} /> Imprimir
          </button>
          {!isCompleted && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--teal)' }} onClick={handleClose}>
              <Lock size={13} /> Cerrar acta
            </button>
          )}
          {isReception && isCompleted && !sibling && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCreateDelivery}
              disabled={creatingDelivery}
            >
              <Plus size={13} /> {creatingDelivery ? 'Creando…' : 'Crear acta de entrega'}
            </button>
          )}
          {sibling && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/planillas/${sibling.id}`)}
            >
              {sibling.type === 'reception' ? 'Ver recepción' : 'Ver entrega'} →
            </button>
          )}
        </div>
      </div>

      {/* Summary banner for delivery */}
      {!isReception && (worsened > 0 || notReviewed > 0) && (
        <div style={{
          display: 'flex', gap: 12, padding: '12px 16px', marginBottom: 20,
          background: worsened > 0 ? '#fef2f2' : '#fefce8',
          border: `1px solid ${worsened > 0 ? 'var(--red)' : '#fde68a'}`,
          borderRadius: 8, fontSize: 13,
        }}>
          <AlertTriangle size={16} style={{ color: worsened > 0 ? 'var(--red)' : '#d97706', flexShrink: 0, marginTop: 1 }} />
          <div>
            {worsened > 0 && <span style={{ color: 'var(--red)', fontWeight: 600 }}>{worsened} ítem{worsened !== 1 ? 's' : ''} con deterioro</span>}
            {worsened > 0 && notReviewed > 0 && <span style={{ color: 'var(--text-3)' }}> · </span>}
            {notReviewed > 0 && <span style={{ color: '#d97706' }}>{notReviewed} sin revisar</span>}
          </div>
        </div>
      )}

      {/* Items grouped by category */}
      {Object.entries(grouped).map(([cat, catItems]) => {
        if (catItems.length === 0) return null
        const isCollapsed = collapsed[cat] ?? false
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            {/* Category header */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                cursor: 'pointer', borderBottom: '2px solid var(--border)', marginBottom: 4,
              }}
              onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
            >
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              {CAT_COLORS[cat] && (
                <span style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[cat] ?? '#6b7280', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-2)' }}>
                {cat}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{catItems.length}</span>
            </div>

            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catItems.map(item => {
                  const delta = calcDelta(item)
                  const hasProblem = delta === 'worsened' || (!isReception && !item.condition_out)
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--surface)',
                        border: `1px solid ${delta === 'worsened' ? 'var(--red)' : 'var(--border)'}`,
                        borderRadius: 8,
                        padding: '10px 14px',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {/* Name + qty */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</span>
                            <span style={{
                              fontSize: 11, color: 'var(--text-3)',
                              background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4,
                            }}>×{item.qty}</span>
                            {delta === 'worsened' && (
                              <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>↓ Deteriorado</span>
                            )}
                            {delta === 'improved' && (
                              <span style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 600 }}>↑ Mejoró</span>
                            )}
                          </div>
                          {saving === item.id && (
                            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Guardando…</span>
                          )}
                        </div>

                        {/* Delete */}
                        {!isCompleted && (
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            style={{ color: 'var(--text-3)' }}
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {/* Condition pickers */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 500 }}>
                            {isReception ? 'CONDICIÓN' : 'AL RECIBIR (ref.)'}
                          </div>
                          {isReception && !isCompleted ? (
                            <ConditionPicker
                              value={item.condition_in}
                              onChange={v => setCondition(item.id, 'condition_in', v)}
                              field="in"
                            />
                          ) : (
                            <span style={{
                              fontSize: 12, fontWeight: 600,
                              color: item.condition_in ? CONDITION_COLORS[item.condition_in] : 'var(--text-3)',
                            }}>
                              {item.condition_in ? CONDITION_LABELS[item.condition_in] : '—'}
                            </span>
                          )}
                        </div>

                        {!isReception && (
                          <>
                            <Minus size={12} style={{ color: 'var(--text-3)' }} />
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 500 }}>AL DEVOLVER</div>
                              {!isCompleted ? (
                                <ConditionPicker
                                  value={item.condition_out}
                                  onChange={v => setCondition(item.id, 'condition_out', v)}
                                  field="out"
                                />
                              ) : (
                                <span style={{
                                  fontSize: 12, fontWeight: 600,
                                  color: item.condition_out ? CONDITION_COLORS[item.condition_out] : 'var(--text-3)',
                                }}>
                                  {item.condition_out ? CONDITION_LABELS[item.condition_out] : 'No revisado'}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Notes */}
                      {!isCompleted && (item.condition_in === 'fair' || item.condition_in === 'poor' || item.condition_out === 'fair' || item.condition_out === 'poor' || item.notes) && (
                        <textarea
                          placeholder="Observaciones…"
                          value={item.notes ?? ''}
                          onChange={e => setNotes(item.id, e.target.value)}
                          onBlur={e => updateChecklistItem(item.id, { notes: e.target.value })}
                          style={{
                            width: '100%', marginTop: 10, fontSize: 12,
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '6px 10px', resize: 'vertical', minHeight: 48,
                            color: 'var(--text-1)', fontFamily: 'inherit',
                          }}
                        />
                      )}
                      {isCompleted && item.notes && (
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8, fontStyle: 'italic' }}>
                          {item.notes}
                        </div>
                      )}

                      {/* Photos */}
                      <div style={{ display: 'flex', gap: 8, marginTop: item.photos.length > 0 ? 10 : 0, flexWrap: 'wrap' }}>
                        {item.photos.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="foto"
                            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }}
                          />
                        ))}
                        {!isCompleted && (item.condition_in === 'poor' || item.condition_out === 'poor' || item.photos.length > 0) && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ width: 64, height: 64, borderRadius: 6, border: '1px dashed var(--border)', flexDirection: 'column', gap: 4 }}
                            onClick={() => { setUploadingFor(item.id); photoInputRef.current?.click() }}
                          >
                            <Camera size={16} style={{ color: 'var(--text-3)' }} />
                            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>Foto</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Add item */}
      {!isCompleted && (
        <div style={{ marginTop: 16 }}>
          {addingItem ? (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: 'var(--surface-2)', border: '1px solid var(--teal)',
              borderRadius: 8, padding: '10px 14px',
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
                title="Cantidad"
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddItem} disabled={!newItem.name.trim()}>Agregar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddingItem(false)}>Cancelar</button>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setAddingItem(true)}
              style={{ color: 'var(--teal)' }}
            >
              <Plus size={13} /> Agregar ítem
            </button>
          )}
        </div>
      )}

      {/* Hidden photo input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file && uploadingFor) await handlePhotoUpload(uploadingFor, file)
          e.target.value = ''
          setUploadingFor(null)
        }}
      />
    </div>
  )
}
