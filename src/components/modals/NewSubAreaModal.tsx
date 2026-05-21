import { useState, useEffect } from 'react'
import { X, Layers, Briefcase, Wrench, MoreHorizontal } from 'lucide-react'
import type { ReactElement } from 'react'
import { useAppStore } from '@/stores/app'
import { createSubArea, updateSubArea } from '@/lib/db'
import type { SubAreaType } from '@/types'

const SUBAREA_TYPES: { type: SubAreaType; label: string; icon: ReactElement; defaultColor: string }[] = [
  { type: 'general',   label: 'General',   icon: <Layers size={15} />,         defaultColor: '#14B8A6' },
  { type: 'comercial', label: 'Comercial', icon: <Briefcase size={15} />,      defaultColor: '#3B82F6' },
  { type: 'tecnico',   label: 'Técnico',   icon: <Wrench size={15} />,         defaultColor: '#F59E0B' },
  { type: 'otros',     label: 'Otros',     icon: <MoreHorizontal size={15} />, defaultColor: '#6B7280' },
]

const COLORS = [
  '#14B8A6','#3B82F6','#6366F1','#F59E0B','#EC4899',
  '#22C55E','#EF4444','#8B5CF6','#F97316','#06B6D4',
]

const TYPE_ICONS: Record<SubAreaType, string> = {
  general: 'Layers', comercial: 'Briefcase', tecnico: 'Wrench', otros: 'MoreHorizontal',
}

export function NewSubAreaModal() {
  const {
    newSubAreaOpen, newSubAreaAreaId, editSubAreaId,
    closeNewSubArea, areas, subareas, addSubArea, refreshAll,
  } = useAppStore()

  const editing = editSubAreaId ? subareas.find(sa => sa.id === editSubAreaId) : null
  const targetAreaId = editing?.area ?? newSubAreaAreaId ?? areas[0]?.id ?? ''
  const targetArea = areas.find(a => a.id === targetAreaId)

  const [name,    setName]    = useState('')
  const [type,    setType]    = useState<SubAreaType>('general')
  const [color,   setColor]   = useState(COLORS[0])
  const [desc,    setDesc]    = useState('')
  const [areaId,  setAreaId]  = useState(targetAreaId)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setType(editing.type)
      setColor(editing.color)
      setDesc(editing.description ?? '')
      setAreaId(editing.area)
    } else {
      setName('')
      setType('general')
      setColor(COLORS[0])
      setDesc('')
      setAreaId(targetAreaId)
    }
    setError('')
  }, [newSubAreaOpen, editing, targetAreaId])

  const handleTypeChange = (t: SubAreaType) => {
    setType(t)
    const def = SUBAREA_TYPES.find(x => x.type === t)?.defaultColor
    if (def && !editing) setColor(def)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!areaId)      { setError('Debe seleccionar un área'); return }
    setSaving(true); setError('')
    try {
      if (editing) {
        await updateSubArea(editing.id, { name: name.trim(), type, color, description: desc || null })
      } else {
        const sa = await createSubArea({
          name: name.trim(), area: areaId, type, color,
          icon: TYPE_ICONS[type],
          description: desc || undefined,
        })
        addSubArea(sa)
      }
      await refreshAll()
      closeNewSubArea()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!newSubAreaOpen) return null

  return (
    <>
      <div className="modal-bd" onClick={closeNewSubArea} />
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>
            {editing ? 'Editar sub-área' : `Nueva sub-área${targetArea ? ` · ${targetArea.name}` : ''}`}
          </span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={closeNewSubArea}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          {/* Área padre (solo al crear) */}
          {!editing && (
            <div className="form-group">
              <label className="form-label">Área padre <span style={{ color: 'var(--red)' }}>*</span></label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={areaId}
                  onChange={e => setAreaId(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer' }}
                >
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Tipo */}
          <div className="form-group mt-16">
            <label className="form-label">Tipo</label>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {SUBAREA_TYPES.map(at => (
                <button
                  key={at.type}
                  className={`btn btn-sm ${type === at.type ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: 6 }}
                  onClick={() => handleTypeChange(at.type)}
                >
                  {at.icon} {at.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div className="form-group mt-16">
            <label className="form-label">Nombre <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className="input">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Tropical, Bovinsa, Huawei..."
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>

          {/* Color */}
          <div className="form-group mt-16">
            <label className="form-label">Color identificador</label>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 999, background: c, border: 'none', cursor: 'pointer',
                    outline: color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: 2,
                    opacity: color === c ? 1 : 0.65,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group mt-16">
            <label className="form-label">Descripción (opcional)</label>
            <div className="input" style={{ height: 'auto' }}>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Descripción breve de la sub-área..."
                style={{ resize: 'vertical', minHeight: 60, background: 'transparent', border: 'none', outline: 'none', width: '100%', color: 'var(--text-1)', fontSize: 13 }}
              />
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-md" onClick={closeNewSubArea}>Cancelar</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear sub-área'}
          </button>
        </div>
      </div>
    </>
  )
}
