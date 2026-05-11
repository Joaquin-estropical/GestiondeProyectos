import { useState, useEffect } from 'react'
import { X, Calendar, Flag } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { createTask } from '@/lib/db'
import type { TaskPriority } from '@/types'

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urg',  label: 'Urgente', color: 'var(--red)'    },
  { value: 'alta', label: 'Alta',    color: 'var(--amber)'  },
  { value: 'med',  label: 'Media',   color: 'var(--blue)'   },
  { value: 'baja', label: 'Baja',    color: 'var(--text-3)' },
]

const MEMBERS = [
  { id: 'joa', name: 'Joaquín Rivera'  },
  { id: 'and', name: 'Andrea Mendoza'  },
  { id: 'car', name: 'Carlos Rojas'    },
  { id: 'sof', name: 'Sofía Vargas'    },
  { id: 'die', name: 'Diego Aguilera'  },
]

export function NewTaskModal() {
  const { newTaskOpen, newTaskProjectId, closeNewTask, areas, projects, addTask, refreshAll } = useAppStore()

  const [title,     setTitle]     = useState('')
  const [projectId, setProjectId] = useState(newTaskProjectId ?? '')
  const [areaId,    setAreaId]    = useState('')
  const [assignee,  setAssignee]  = useState('joa')
  const [due,       setDue]       = useState('')
  const [priority,  setPriority]  = useState<TaskPriority>('med')
  const [desc,      setDesc]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (newTaskOpen) {
      setTitle(''); setDesc(''); setDue(''); setError('')
      const pid = newTaskProjectId ?? projects[0]?.id ?? ''
      setProjectId(pid)
      const proj = projects.find(p => p.id === pid)
      setAreaId(proj?.area ?? areas[0]?.id ?? '')
      setPriority('med')
      setAssignee('joa')
    }
  }, [newTaskOpen, newTaskProjectId, projects, areas])

  // sync area when project changes
  const handleProjectChange = (pid: string) => {
    setProjectId(pid)
    const proj = projects.find(p => p.id === pid)
    if (proj) setAreaId(proj.area)
  }

  const handleSave = async () => {
    if (!title.trim())  { setError('El título es obligatorio'); return }
    if (!projectId)     { setError('Seleccioná un proyecto'); return }
    if (!due)           { setError('La fecha límite es obligatoria'); return }
    setSaving(true); setError('')
    try {
      const task = await createTask({
        title: title.trim(), project: projectId, area: areaId,
        assignee, due, priority,
        description: desc || undefined,
      })
      addTask(task)
      await refreshAll()
      closeNewTask()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!newTaskOpen) return null

  const filteredProjects = areaId ? projects.filter(p => p.area === areaId) : projects

  return (
    <>
      <div className="modal-bd" onClick={closeNewTask} />
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>Nueva tarea</span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={closeNewTask}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          {/* Título */}
          <div className="form-group">
            <label className="form-label">Título <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className="input">
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="¿Qué hay que hacer?"
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSave()}
              />
            </div>
          </div>

          {/* Área + Proyecto en fila */}
          <div className="row gap-12 mt-16">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Área</label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={areaId}
                  onChange={e => { setAreaId(e.target.value); setProjectId('') }}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">Todas</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Proyecto <span style={{ color: 'var(--red)' }}>*</span></label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={projectId}
                  onChange={e => handleProjectChange(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">Seleccionar...</option>
                  {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Asignado + Fecha en fila */}
          <div className="row gap-12 mt-16">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Asignado a</label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer' }}
                >
                  {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Fecha límite <span style={{ color: 'var(--red)' }}>*</span></label>
              <div className="input">
                <Calendar size={13} color="var(--text-3)" />
                <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ colorScheme: 'dark' }} />
              </div>
            </div>
          </div>

          {/* Prioridad */}
          <div className="form-group mt-16">
            <label className="form-label"><Flag size={12} style={{ marginRight: 6 }} />Prioridad</label>
            <div className="row gap-8">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  className={`btn btn-sm ${priority === p.value ? 'btn-secondary' : 'btn-ghost'}`}
                  style={{ color: priority === p.value ? p.color : 'var(--text-2)', borderColor: priority === p.value ? p.color : undefined }}
                  onClick={() => setPriority(p.value)}
                >
                  <Flag size={11} color={p.color} /> {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group mt-16">
            <label className="form-label">Descripción <span className="micro" style={{ color: 'var(--text-3)', marginLeft: 6 }}>opcional</span></label>
            <div className="input" style={{ height: 'auto' }}>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Contexto, instrucciones, enlaces..."
                style={{ resize: 'vertical', minHeight: 70, background: 'transparent', border: 'none', outline: 'none', width: '100%', color: 'var(--text-1)', fontSize: 13 }}
              />
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary btn-md" onClick={closeNewTask}>Cancelar</button>
          <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving}>
            {saving ? 'Creando...' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </>
  )
}
