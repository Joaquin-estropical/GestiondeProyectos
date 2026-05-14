import { useState, useEffect } from 'react'
import { X, Calendar, Trash2 } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { updateProject, deleteProject } from '@/lib/db'

export function EditProjectModal() {
  const { editProjectId, closeEditProject, projects, removeProject, refreshAll } = useAppStore()

  const project = editProjectId ? projects.find(p => p.id === editProjectId) : null

  const [name,    setName]    = useState('')
  const [due,     setDue]     = useState('')
  const [saving,  setSaving]  = useState(false)
  const [delConf, setDelConf] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDue(project.due === '2099-12-31' ? '' : project.due)
      setDelConf(false)
      setError('')
    }
  }, [editProjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError('')
    try {
      await updateProject(project.id, { name: name.trim(), due: due || '2099-12-31' })
      await refreshAll()
      closeEditProject()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await deleteProject(project.id)
      removeProject(project.id)
      await refreshAll()
      closeEditProject()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="modal-bd" onClick={closeEditProject} />
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>Editar proyecto</span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={closeEditProject}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nombre <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className="input">
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>

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

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}

          {/* Zona peligrosa */}
          <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 8, border: '1px solid var(--red)20', background: 'var(--red)08' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', marginBottom: 8 }}>Zona peligrosa</div>
            {!delConf ? (
              <button
                className="btn btn-sm"
                style={{ color: 'var(--red)', border: '1px solid var(--red)40', background: 'transparent', gap: 6 }}
                onClick={() => setDelConf(true)}
              >
                <Trash2 size={13} /> Eliminar proyecto
              </button>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
                  ¿Eliminar <strong>{project.name}</strong> y todas sus tareas? Esta acción no se puede deshacer.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setDelConf(false)}>Cancelar</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-md" onClick={closeEditProject}>Cancelar</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </>
  )
}
