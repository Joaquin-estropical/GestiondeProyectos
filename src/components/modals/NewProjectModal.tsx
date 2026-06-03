import { useState, useEffect } from 'react'
import { X, Calendar, Layers } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { createProject } from '@/lib/db'
import { useTemplates } from '@/hooks/useSupabase'
import type { AreaType } from '@/types'

const TYPE_ICONS: Record<string, string> = {
  sucursal: '🏪', outlet: '🛍️', edificio: '🏢', bodega: '📦', general: '📋',
}

export function NewProjectModal() {
  const {
    newProjectOpen, newProjectAreaId, newProjectSubAreaId,
    closeNewProject, areas, subareas, addProject, refreshAll,
  } = useAppStore()

  const area = newProjectAreaId ? areas.find(a => a.id === newProjectAreaId) : null
  const { data: templates } = useTemplates(area?.type as AreaType | undefined)

  const [name,       setName]       = useState('')
  const [areaId,     setAreaId]     = useState(newProjectAreaId ?? '')
  const [subareaId,  setSubareaId]  = useState(newProjectSubAreaId ?? '')
  const [due,        setDue]        = useState('')
  const [templateId, setTemplateId] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const areaSubAreas = subareas.filter(sa => sa.area === areaId)

  useEffect(() => {
    if (newProjectOpen) {
      setName(''); setDue(''); setTemplateId(''); setError('')
      const initialArea = newProjectAreaId ?? (areas[0]?.id ?? '')
      setAreaId(initialArea)
      // Auto-pick sub-area: prefer explicit, then only-one-available, then empty
      const availableSubs = subareas.filter(sa => sa.area === initialArea)
      const initialSub = newProjectSubAreaId
        ?? (availableSubs.length === 1 ? availableSubs[0].id : '')
      setSubareaId(initialSub)
    }
  }, [newProjectOpen, newProjectAreaId, newProjectSubAreaId, areas, subareas])

  // Re-evaluate sub-area when the area changes
  useEffect(() => {
    if (!areaId) return
    const available = subareas.filter(sa => sa.area === areaId)
    if (subareaId && !available.find(sa => sa.id === subareaId)) {
      // current sub-area no longer belongs to area
      setSubareaId(available.length === 1 ? available[0].id : '')
    } else if (!subareaId && available.length === 1) {
      setSubareaId(available[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, subareas])

  const selectedArea = areas.find(a => a.id === areaId)
  const areaTemplates = templates.filter(t => !selectedArea || t.area_type === selectedArea.type)

  const needsSubArea = selectedArea?.type === 'edificio'

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (!areaId)      { setError('Seleccioná un área'); return }
    if (needsSubArea && !subareaId) { setError('Seleccioná una sub-área'); return }
    setSaving(true); setError('')
    try {
      const project = await createProject({
        name: name.trim(), area: areaId, areaType: selectedArea?.type, subarea: needsSubArea ? subareaId : null, due,
        templateId: templateId || undefined,
      })
      addProject(project)
      await refreshAll()
      closeNewProject()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!newProjectOpen) return null

  return (
    <>
      <div className="modal-bd" onClick={closeNewProject} />
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>Nuevo proyecto</span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={closeNewProject}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          {/* Área */}
          <div className="form-group">
            <label className="form-label">Área <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className="input" style={{ padding: 0 }}>
              <select
                value={areaId}
                onChange={e => setAreaId(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', colorScheme: 'dark' }}
              >
                <option value="" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Seleccionar área...</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-área (solo edificio) */}
          {needsSubArea && (
            <div className="form-group mt-16">
              <label className="form-label">Sub-área <span style={{ color: 'var(--red)' }}>*</span></label>
              {areaSubAreas.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--amber)', padding: '8px 0' }}>
                  Edificio no tiene sub-áreas. Creá una primero desde el sidebar o desde Configuración.
                </div>
              ) : (
                <div className="input" style={{ padding: 0 }}>
                  <select
                    value={subareaId}
                    onChange={e => setSubareaId(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', colorScheme: 'dark' }}
                  >
                    <option value="" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Seleccionar sub-área...</option>
                    {areaSubAreas.map(sa => (
                      <option key={sa.id} value={sa.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{sa.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Nombre */}
          <div className="form-group mt-16">
            <label className="form-label">Nombre del proyecto <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className="input">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Renovación iluminación LED, Apertura mayo 2026..."
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>

          {/* Fecha límite */}
          <div className="form-group mt-16">
            <label className="form-label">Fecha límite <span className="micro" style={{ marginLeft: 8, color: 'var(--text-3)' }}>opcional</span></label>
            <div className="input">
              <Calendar size={13} color="var(--text-3)" />
              <input
                type="date"
                value={due}
                onChange={e => setDue(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Plantilla */}
          <div className="form-group mt-16">
            <label className="form-label">
              <Layers size={13} style={{ marginRight: 6 }} />
              Plantilla de tareas
              <span className="micro" style={{ marginLeft: 8, color: 'var(--text-3)' }}>opcional</span>
            </label>
            {areaTemplates.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 0' }}>
                No hay plantillas para {selectedArea ? `áreas de tipo "${selectedArea.type}"` : 'el área seleccionada'}. Podés crear plantillas en Configuración.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div
                  className="row gap-10 items-center card-pad"
                  style={{
                    background: !templateId ? 'var(--teal-bg)' : 'var(--surface-1)',
                    border: `1px solid ${!templateId ? 'var(--teal)' : 'var(--border)'}`,
                    borderRadius: 6, cursor: 'pointer',
                  }}
                  onClick={() => setTemplateId('')}
                >
                  <span style={{ fontSize: 13 }}>Sin plantilla — proyecto en blanco</span>
                  {!templateId && <span className="micro" style={{ marginLeft: 'auto', color: 'var(--teal)' }}>Seleccionado</span>}
                </div>
                {areaTemplates.map(t => (
                  <div
                    key={t.id}
                    className="row gap-10 items-center card-pad"
                    style={{
                      background: templateId === t.id ? 'var(--teal-bg)' : 'var(--surface-1)',
                      border: `1px solid ${templateId === t.id ? 'var(--teal)' : 'var(--border)'}`,
                      borderRadius: 6, cursor: 'pointer',
                    }}
                    onClick={() => setTemplateId(t.id)}
                  >
                    <span style={{ fontSize: 13 }}>{TYPE_ICONS[t.area_type] ?? '📋'} {t.name}</span>
                    {t.description && <span className="f-xs text-2" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</span>}
                    {templateId === t.id && <span className="micro" style={{ marginLeft: 'auto', color: 'var(--teal)', flexShrink: 0 }}>Seleccionada</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-md" onClick={closeNewProject}>Cancelar</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving}>
            {saving ? 'Creando...' : templateId ? 'Crear con plantilla' : 'Crear proyecto'}
          </button>
        </div>
      </div>
    </>
  )
}
