import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Printer, Lock, Trash2, Camera, ChevronDown, ChevronRight,
  AlertTriangle, Minus, X,
} from 'lucide-react'
import type { EventChecklist, ChecklistItem, ItemCondition } from '@/types'
import {
  fetchChecklistById, fetchEventChecklists, fetchChecklistItems,
  createChecklistItem, updateChecklistItem, deleteChecklistItem,
  closeReceptionAndCreateDelivery, updateChecklistStatus,
  uploadItemPhoto, deleteItemPhoto, calcDelta, conditionLabel, conditionColor,
} from '@/lib/planillas'
import { useAppStore } from '@/stores/app'
import { useSignatures } from '@/hooks/useSignatures'
import type { SignatureRole } from '@/hooks/useSignatures'
import { SignatureModal } from '@/components/SignatureModal'

const CONDITIONS: ItemCondition[] = ['good', 'fair', 'poor']

function ConditionPicker({ value, onChange }: { value: ItemCondition | null; onChange: (v: ItemCondition | null) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {CONDITIONS.map(c => (
        <button
          key={c}
          onClick={() => onChange(value === c ? null : c)}
          style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 5, border: '1px solid',
            cursor: 'pointer', fontWeight: value === c ? 600 : 400,
            borderColor: value === c ? conditionColor(c) : 'var(--border)',
            background:  value === c ? conditionColor(c) + '22' : 'transparent',
            color:       value === c ? conditionColor(c) : 'var(--text-2)',
          }}
        >
          {conditionLabel(c)}
        </button>
      ))}
    </div>
  )
}

export default function ChecklistDetailPage() {
  const { checklistId } = useParams<{ checklistId: string }>()
  const navigate        = useNavigate()
  const { projects }    = useAppStore()

  const [checklist, setChecklist]         = useState<EventChecklist | null>(null)
  const [sibling, setSibling]             = useState<EventChecklist | null>(null)
  const [items, setItems]                 = useState<ChecklistItem[]>([])
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState<string | null>(null)
  const [closing, setClosing]             = useState(false)

  const [addingCat, setAddingCat]         = useState<string | null>(null)
  const [newItemName, setNewItemName]     = useState('')
  const [newItemQty, setNewItemQty]       = useState<string>('')

  const [collapsed, setCollapsed]         = useState<Record<string, boolean>>({})
  const [sigModalOpen, setSigModalOpen]   = useState(false)
  const [activeRole, setActiveRole]       = useState<SignatureRole>('delivery')

  const pendingNotes  = useRef<Record<string, string>>({})
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFor, setUploadingFor]   = useState<string | null>(null)
  const [uploading, setUploading]         = useState(false)

  const { signatures, saveSignature, clearSignature } = useSignatures(checklistId ?? '')

  const openSignModal = (role: SignatureRole) => { setActiveRole(role); setSigModalOpen(true) }

  const load = useCallback(async () => {
    if (!checklistId) return
    setLoading(true)
    try {
      const [cl, its] = await Promise.all([
        fetchChecklistById(checklistId),
        fetchChecklistItems(checklistId),
      ])
      setItems(its)
      if (cl) {
        setChecklist(cl)
        const siblings = await fetchEventChecklists(cl.event_id)
        setSibling(siblings.find(s => s.id !== cl.id) ?? null)
      }
    } finally { setLoading(false) }
  }, [checklistId])

  useEffect(() => { load() }, [load])

  async function setCondition(itemId: string, field: 'condition_in' | 'condition_out', value: ItemCondition | null) {
    setSaving(itemId)
    await updateChecklistItem(itemId, { [field]: value })
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, [field]: value } : it))
    setSaving(null)
  }

  function handleNoteChange(itemId: string, notes: string) {
    pendingNotes.current[itemId] = notes
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, notes } : it))
  }

  async function handleNoteBlur(itemId: string) {
    const notes = pendingNotes.current[itemId]
    if (notes === undefined) return
    delete pendingNotes.current[itemId]
    await updateChecklistItem(itemId, { notes })
  }

  async function handleQtyChange(itemId: string, qty: number | null) {
    await updateChecklistItem(itemId, { qty })
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, qty } : it))
  }

  async function handleAddItem(cat: string) {
    if (!newItemName.trim() || !checklistId) return
    const catItems = items.filter(i => i.category === cat)
    const qty = newItemQty ? parseInt(newItemQty) : null
    const created = await createChecklistItem({
      checklist_id: checklistId, name: newItemName.trim(),
      category: cat, qty, sort_order: catItems.length,
    })
    setItems(prev => [...prev, created])
    setNewItemName(''); setNewItemQty(''); setAddingCat(null)
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('¿Eliminar este ítem del acta?')) return
    await deleteChecklistItem(id)
    setItems(prev => prev.filter(it => it.id !== id))
  }

  async function handleCloseReception() {
    if (!checklist) return
    if (items.length === 0) { alert('Agregá al menos un ítem antes de cerrar el acta.'); return }
    if (!confirm('¿Cerrar el acta de recepción? Se creará automáticamente el acta de entrega.')) return
    setClosing(true)
    try {
      const { checklist: deliveryCl } = await closeReceptionAndCreateDelivery(checklist.id, checklist.event_id)
      navigate(`/planillas/${deliveryCl.id}`)
    } finally { setClosing(false) }
  }

  async function handleCloseDelivery() {
    if (!checklist) return
    if (!confirm('¿Cerrar el acta de entrega? No se podrá modificar después.')) return
    setClosing(true)
    await updateChecklistStatus(checklist.id, 'completed')
    setChecklist({ ...checklist, status: 'completed' })
    setClosing(false)
  }

  async function handlePhotoUpload(itemId: string, file: File) {
    if (!checklist) return
    setUploading(true); setSaving(itemId)
    try {
      const url = await uploadItemPhoto(checklist.event_id, checklist.id, itemId, file)
      const item = items.find(i => i.id === itemId)
      const photos = [...(item?.photos ?? []), url]
      await updateChecklistItem(itemId, { photos })
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, photos } : it))
    } catch (err) {
      alert('Error al subir foto: ' + (err as Error).message)
    } finally { setUploading(false); setSaving(null) }
  }

  async function handleDeletePhoto(item: ChecklistItem, url: string) {
    if (!confirm('¿Eliminar esta foto?')) return
    await deleteItemPhoto(url, item)
    setItems(prev => prev.map(it => it.id === item.id ? { ...it, photos: it.photos.filter(p => p !== url) } : it))
  }

  const isReception = checklist?.type === 'reception'
  const isCompleted = checklist?.status === 'completed'
  const projectName = projects.find(p => p.id === checklist?.event_id)?.name ?? checklist?.event_id ?? ''

  // Group by category preserving order
  const categories = Array.from(new Set(items.map(i => i.category)))
  const grouped: Record<string, ChecklistItem[]> = {}
  categories.forEach(cat => { grouped[cat] = items.filter(i => i.category === cat) })

  const worsened    = items.filter(i => calcDelta(i) === 'worsened').length
  const notReviewed = !isReception ? items.filter(i => calcDelta(i) === 'pending').length : 0
  const improved    = items.filter(i => calcDelta(i) === 'improved').length

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '64px 0', fontSize: 14 }}>Cargando…</div>
  if (!checklist) return <div style={{ textAlign: 'center', color: 'var(--red)', padding: '64px 0', fontSize: 14 }}>Planilla no encontrada.</div>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/planillas')} style={{ marginBottom: 20, color: 'var(--text-3)' }}>
        <ArrowLeft size={14} /> Planillas
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
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
            {projectName} · {items.length} ítem{items.length !== 1 ? 's' : ''} · {new Date(checklist.created_at).toLocaleDateString('es-AR')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/planillas/${checklistId}/imprimir`)}>
            <Printer size={13} /> Imprimir
          </button>
          {sibling && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/planillas/${sibling.id}`)}>
              {sibling.type === 'reception' ? '← Ver recepción' : 'Ver entrega →'}
            </button>
          )}
          {!isCompleted && isReception && (
            <button className="btn btn-primary btn-sm" onClick={handleCloseReception} disabled={closing}>
              <Lock size={13} /> {closing ? 'Cerrando…' : 'Cerrar y crear entrega'}
            </button>
          )}
          {!isCompleted && !isReception && (
            <button className="btn btn-primary btn-sm" onClick={handleCloseDelivery} disabled={closing}>
              <Lock size={13} /> {closing ? 'Cerrando…' : 'Cerrar acta de entrega'}
            </button>
          )}
        </div>
      </div>

      {/* Delivery summary banner */}
      {!isReception && !isCompleted && (worsened > 0 || notReviewed > 0 || improved > 0) && (
        <div style={{
          display: 'flex', gap: 16, padding: '12px 16px', marginBottom: 20,
          background: worsened > 0 ? '#fef2f2' : '#fefce8',
          border: `1px solid ${worsened > 0 ? '#fca5a5' : '#fde68a'}`,
          borderRadius: 8, fontSize: 13, flexWrap: 'wrap',
        }}>
          <AlertTriangle size={15} style={{ color: worsened > 0 ? 'var(--red)' : '#d97706', flexShrink: 0, marginTop: 1 }} />
          {worsened > 0 && <span style={{ color: 'var(--red)', fontWeight: 600 }}>{worsened} deteriorado{worsened !== 1 ? 's' : ''}</span>}
          {notReviewed > 0 && <span style={{ color: '#d97706' }}>{notReviewed} sin revisar</span>}
          {improved > 0 && <span style={{ color: 'var(--teal)' }}>{improved} mejorado{improved !== 1 ? 's' : ''}</span>}
        </div>
      )}

      {/* Closed delivery summary */}
      {!isReception && isCompleted && (
        <div style={{
          display: 'flex', gap: 24, padding: '14px 18px', marginBottom: 20,
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Sin novedad', count: items.filter(i => calcDelta(i) === 'same').length, color: 'var(--text-2)' },
            { label: 'Mejorados',   count: improved,  color: 'var(--teal)' },
            { label: 'Deteriorados',count: worsened,  color: 'var(--red)'  },
            { label: 'Sin revisar', count: notReviewed, color: '#d97706'   },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 10, marginBottom: 16 }}>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>Sin ítems todavía.</p>
          {!isCompleted && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setAddingCat('Sin categoría')}>
              <Plus size={13} /> Agregar primer ítem
            </button>
          )}
        </div>
      )}

      {/* Items by category */}
      {Object.entries(grouped).map(([cat, catItems]) => {
        const isCollapsed = collapsed[cat] ?? false
        const catWorsened = catItems.filter(i => calcDelta(i) === 'worsened').length
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px',
                cursor: 'pointer', borderBottom: '2px solid var(--border)', marginBottom: 6,
              }}
              onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
            >
              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-2)', flex: 1 }}>
                {cat}
              </span>
              {catWorsened > 0 && (
                <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>{catWorsened} ↓</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{catItems.length}</span>
            </div>

            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catItems.map(item => {
                  const delta      = calcDelta(item)
                  const needsPhoto = (item.condition_in === 'fair' || item.condition_in === 'poor' || item.condition_out === 'fair' || item.condition_out === 'poor')
                  const showNotes  = needsPhoto || !!item.notes
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: delta === 'worsened' ? '#fff5f5' : 'var(--surface)',
                        border: `1px solid ${delta === 'worsened' ? '#fca5a5' : 'var(--border)'}`,
                        borderRadius: 8, padding: '10px 14px',
                      } as React.CSSProperties}
                    >
                      {/* Row 1: name, qty, badges, delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, minWidth: 120 }}>{item.name}</span>

                        {/* Qty - editable in reception */}
                        {!isCompleted && isReception ? (
                          <input
                            type="number" min={1} placeholder="Cant."
                            value={item.qty ?? ''}
                            onChange={e => handleQtyChange(item.id, e.target.value ? parseInt(e.target.value) : null)}
                            style={{
                              width: 72, fontSize: 12, textAlign: 'center', padding: '2px 6px',
                              border: '1px solid var(--border)', borderRadius: 5, background: 'var(--surface-2)',
                              color: 'var(--text-1)',
                            }}
                            title="Cantidad"
                          />
                        ) : item.qty ? (
                          <span style={{ fontSize: 11, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>
                            ×{item.qty}
                          </span>
                        ) : null}

                        {delta === 'worsened' && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>↓ Deteriorado</span>}
                        {delta === 'improved'  && <span style={{ fontSize: 10, color: 'var(--teal)', fontWeight: 600 }}>↑ Mejoró</span>}
                        {saving === item.id && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Guardando…</span>}

                        {!isCompleted && (
                          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--text-3)' }} onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {/* Row 2: condition pickers */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 500 }}>
                            {isReception ? 'CONDICIÓN' : 'AL RECIBIR'}
                          </div>
                          {isReception && !isCompleted ? (
                            <ConditionPicker value={item.condition_in} onChange={v => setCondition(item.id, 'condition_in', v)} />
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 600, color: conditionColor(item.condition_in) }}>
                              {conditionLabel(item.condition_in)}
                            </span>
                          )}
                        </div>

                        {!isReception && (
                          <>
                            <Minus size={12} style={{ color: 'var(--text-3)' }} />
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 500 }}>AL DEVOLVER</div>
                              {!isCompleted ? (
                                <ConditionPicker value={item.condition_out} onChange={v => setCondition(item.id, 'condition_out', v)} />
                              ) : (
                                <span style={{ fontSize: 12, fontWeight: 600, color: conditionColor(item.condition_out) }}>
                                  {conditionLabel(item.condition_out)}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Notes */}
                      {!isCompleted && showNotes && (
                        <textarea
                          placeholder="Observaciones…"
                          value={item.notes ?? ''}
                          onChange={e => handleNoteChange(item.id, e.target.value)}
                          onBlur={() => handleNoteBlur(item.id)}
                          style={{
                            width: '100%', marginTop: 10, fontSize: 12, boxSizing: 'border-box',
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '6px 10px', resize: 'vertical', minHeight: 44,
                            color: 'var(--text-1)', fontFamily: 'inherit',
                          }}
                        />
                      )}
                      {isCompleted && item.notes && (
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 8, fontStyle: 'italic' }}>{item.notes}</div>
                      )}

                      {/* Photos */}
                      {(item.photos.length > 0 || (!isCompleted && needsPhoto)) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          {item.photos.map((url, idx) => (
                            <div key={idx} style={{ position: 'relative' }}>
                              <img
                                src={url} alt="foto"
                                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', display: 'block' }}
                              />
                              {!isCompleted && (
                                <button
                                  onClick={() => handleDeletePhoto(item, url)}
                                  style={{
                                    position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                                    borderRadius: '50%', background: 'var(--red)', border: 'none',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >
                                  <X size={10} color="#fff" />
                                </button>
                              )}
                            </div>
                          ))}
                          {!isCompleted && (
                            <button
                              className="btn btn-ghost btn-sm"
                              disabled={uploading && uploadingFor === item.id}
                              style={{ width: 72, height: 72, borderRadius: 6, border: '1px dashed var(--border)', flexDirection: 'column', gap: 4 }}
                              onClick={() => { setUploadingFor(item.id); photoInputRef.current?.click() }}
                            >
                              <Camera size={16} style={{ color: 'var(--text-3)' }} />
                              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>
                                {uploading && uploadingFor === item.id ? 'Subiendo…' : 'Foto'}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add item to category */}
                {!isCompleted && (
                  addingCat === cat ? (
                    <div style={{
                      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                      background: 'var(--surface-2)', border: '1px solid var(--teal)',
                      borderRadius: 8, padding: '8px 12px',
                    }}>
                      <input
                        autoFocus className="input" placeholder="Nombre del ítem…"
                        value={newItemName} onChange={e => setNewItemName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddItem(cat); if (e.key === 'Escape') setAddingCat(null) }}
                        style={{ flex: 1, minWidth: 140, fontSize: 13 }}
                      />
                      <input
                        type="number" min={1} className="input" placeholder="Cantidad"
                        value={newItemQty} onChange={e => setNewItemQty(e.target.value)}
                        style={{ width: 90, fontSize: 13 }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => handleAddItem(cat)} disabled={!newItemName.trim()}>Agregar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setAddingCat(null); setNewItemName(''); setNewItemQty('') }}>Cancelar</button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setAddingCat(cat); setNewItemName(''); setNewItemQty('') }}
                      style={{ color: 'var(--teal)', alignSelf: 'flex-start' }}
                    >
                      <Plus size={12} /> Agregar ítem en {cat}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Add item to new category when no items yet */}
      {!isCompleted && items.length === 0 && addingCat && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
          background: 'var(--surface-2)', border: '1px solid var(--teal)',
          borderRadius: 8, padding: '8px 12px', marginTop: 8,
        }}>
          <input
            autoFocus className="input" placeholder="Nombre del ítem…"
            value={newItemName} onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddItem('Sin categoría'); if (e.key === 'Escape') setAddingCat(null) }}
            style={{ flex: 1, minWidth: 140, fontSize: 13 }}
          />
          <button className="btn btn-primary btn-sm" onClick={() => handleAddItem('Sin categoría')} disabled={!newItemName.trim()}>Agregar</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAddingCat(null)}>Cancelar</button>
        </div>
      )}

      {/* Signature section */}
      <div style={{
        marginTop: 32, border: '1px solid var(--border)', borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px', background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Firmas</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              Las firmas se conservan hasta imprimir o cerrar la pestaña.
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/planillas/${checklistId}/imprimir`)}
            style={{ gap: 6 }}
          >
            <Printer size={13} /> Imprimir
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)' }}>
          {(['delivery', 'reception'] as SignatureRole[]).map(role => {
            const sig   = signatures[role]
            const label = role === 'delivery' ? 'Quien entrega' : 'Quien recibe'
            return (
              <div key={role} style={{ background: 'var(--surface)', padding: 16 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{label}</span>
                  {sig && (
                    <span style={{ fontSize: 10, color: '#059669', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                      ✓ Firmado
                    </span>
                  )}
                </div>

                {sig ? (
                  <div>
                    <div style={{
                      height: 80, border: '1px solid var(--border)', borderRadius: 8,
                      overflow: 'hidden', background: '#fff', marginBottom: 8,
                    }}>
                      <img
                        src={sig.dataUrl}
                        alt={`Firma de ${label}`}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                      />
                    </div>
                    {sig.signerName && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                        {sig.signerName}
                      </div>
                    )}
                    <button
                      onClick={() => clearSignature(role)}
                      style={{
                        fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--text-3)',
                      }}
                    >
                      Borrar firma
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openSignModal(role)}
                    style={{
                      width: '100%', height: 80, border: '1.5px dashed var(--border)',
                      borderRadius: 8, background: 'var(--surface-2)', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', gap: 6, color: 'var(--text-3)',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    <span style={{ fontSize: 12 }}>Tap para firmar</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Signature modal */}
      <SignatureModal
        open={sigModalOpen}
        role={activeRole}
        onSave={(dataUrl, name) => saveSignature(activeRole, dataUrl, name)}
        onClose={() => setSigModalOpen(false)}
      />

      {/* Hidden photo input */}
      <input
        ref={photoInputRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }}
        onChange={async e => {
          const file = e.target.files?.[0]
          if (file && uploadingFor) await handlePhotoUpload(uploadingFor, file)
          e.target.value = ''; setUploadingFor(null)
        }}
      />
    </div>
  )
}
