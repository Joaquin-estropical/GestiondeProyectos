import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { X, Store, MapPin, Building2, Warehouse, Layers } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { createArea, updateArea } from '@/lib/db'
import type { AreaType } from '@/types'

const AREA_TYPES: { type: AreaType; label: string; icon: ReactElement; defaultColor: string }[] = [
  { type: 'sucursal', label: 'Sucursal',  icon: <MapPin size={15} />,      defaultColor: '#3B82F6' },
  { type: 'outlet',   label: 'Outlet',    icon: <Store size={15} />,       defaultColor: '#14B8A6' },
  { type: 'edificio', label: 'Edificio',  icon: <Building2 size={15} />,   defaultColor: '#6366F1' },
  { type: 'bodega',   label: 'Bodega',    icon: <Warehouse size={15} />,   defaultColor: '#F59E0B' },
  { type: 'general',  label: 'General',   icon: <Layers size={15} />,      defaultColor: '#EC4899' },
]

const COLORS = [
  '#14B8A6','#3B82F6','#6366F1','#F59E0B','#EC4899',
  '#22C55E','#EF4444','#8B5CF6','#F97316','#06B6D4',
]

const TYPE_ICONS: Record<AreaType, string> = {
  sucursal: 'map-pin', outlet: 'store', edificio: 'building-2', bodega: 'warehouse', general: 'layers',
}

export function NewAreaModal() {
  const { newAreaOpen, editAreaId, closeNewArea, areas, addArea, refreshAll } = useAppStore()

  const editing = editAreaId ? areas.find(a => a.id === editAreaId) : null

  const [name,  setName]  = useState('')
  const [type,  setType]  = useState<AreaType>('sucursal')
  const [color, setColor] = useState(COLORS[0])
  const [desc,  setDesc]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setType(editing.type)
      setColor(editing.color)
      setDesc(editing.description ?? '')
    } else {
      setName(''); setType('sucursal'); setColor(COLORS[0]); setDesc('')
    }
    setError('')
  }, [newAreaOpen, editing])

  const handleTypeChange = (t: AreaType) => {
    setType(t)
    const def = AREA_TYPES.find(x => x.type === t)?.defaultColor
    if (def && !editing) setColor(def)
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    try {
      if (editing) {
        await updateArea(editing.id, { name: name.trim(), type, color, description: desc || null })
      } else {
        const area = await createArea({ name: name.trim(), type, color, icon: TYPE_ICONS[type], description: desc || undefined })
        addArea(area)
      }
      await refreshAll()
      closeNewArea()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!newAreaOpen) return null

  return (
    <>
      <div className="modal-bd" onClick={closeNewArea} />
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>{editing ? 'Editar área' : 'Nueva área'}</span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={closeNewArea}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          {/* Tipo */}
          <div className="form-group">
            <label className="form-label">Tipo de área</label>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {AREA_TYPES.map(at => (
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
                placeholder={`Ej: Sucursal Palermo, Outlet Belgrano...`}
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

          {/* Preview */}
          <div className="form-group mt-16">
            <label className="form-label">Vista previa</label>
            <div className="row gap-10 items-center card-pad" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, borderLeft: `3px solid ${color}` }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{name || 'Nombre del área'}</span>
              <span className="micro" style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>
                {AREA_TYPES.find(x => x.type === type)?.label}
              </span>
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group mt-16">
            <label className="form-label">Descripción (opcional)</label>
            <div className="input" style={{ height: 'auto' }}>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Descripción breve del área..."
                style={{ resize: 'vertical', minHeight: 60, background: 'transparent', border: 'none', outline: 'none', width: '100%', color: 'var(--text-1)', fontSize: 13 }}
              />
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-md" onClick={closeNewArea}>Cancelar</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear área'}
          </button>
        </div>
      </div>
    </>
  )
}
