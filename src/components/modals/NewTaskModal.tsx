import { useState, useEffect } from 'react'
import { X, Calendar, Flag } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { createTask } from '@/lib/db'
import { useMembers } from '@/hooks/useSupabase'
import { APP_USERS } from '@/lib/auth'
import type { TaskPriority } from '@/types'

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urg',  label: 'Urgente', color: 'var(--red)'    },
  { value: 'alta', label: 'Alta',    color: 'var(--amber)'  },
  { value: 'med',  label: 'Media',   color: 'var(--blue)'   },
  { value: 'baja', label: 'Baja',    color: 'var(--text-3)' },
]

export function NewTaskModal() {
  const { newTaskOpen, newTaskProjectId, newTaskDate, closeNewTask, areas, projects, addTask, refreshAll, currentUser } = useAppStore()
  const { data: members = [] } = useMembers()
  const memberList = members.length > 0
    ? members
    : APP_USERS.map(u => ({ id: u.id, name: u.name, role: u.role, short: u.short }))

  const [title,     setTitle]     = useState('')
  const [areaId,    setAreaId]    = useState('')
  const [projectId, setProjectId] = useState('')
  const [assignee,  setAssignee]  = useState(currentUser.id)
  const [helper,    setHelper]    = useState('')
  const [due,       setDue]       = useState('')
  const [priority,  setPriority]  = useState<TaskPriority>('med')
  const [desc,      setDesc]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  // Get "Generales" project for a given area
  const getGeneralesProject = (aid: string) =>
    projects.find(p => p.area === aid && p.name === 'Generales')

  const resolveProject = (aid: string, pid: string) => {
    if (pid && projects.find(p => p.id === pid)) return pid
    const gen = getGeneralesProject(aid)
    return gen?.id ?? ''
  }

  useEffect(() => {
    if (newTaskOpen) {
      setTitle(''); setDesc(''); setError(''); setHelper('')
      setDue(newTaskDate ?? '')
      setPriority('med')
      setAssignee(currentUser.id)

      const pid = newTaskProjectId ?? ''
      const proj = projects.find(p => p.id === pid)
      const aid = proj?.area ?? areas[0]?.id ?? ''
      setAreaId(aid)

      // If no explicit project given, auto-select Generales
      if (pid && proj) {
        setProjectId(pid)
      } else {
        const gen = getGeneralesProject(aid)
        setProjectId(gen?.id ?? projects.filter(p => p.area === aid)[0]?.id ?? '')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTaskOpen, newTaskProjectId, newTaskDate, projects, areas, currentUser.id])

  const handleAreaChange = (aid: string) => {
    setAreaId(aid)
    // Auto-select Generales for the new area, or first project
    const gen = getGeneralesProject(aid)
    setProjectId(gen?.id ?? projects.filter(p => p.area === aid)[0]?.id ?? '')
  }

  const handleProjectChange = (pid: string) => {
    setProjectId(pid)
    const proj = projects.find(p => p.id === pid)
    if (proj) setAreaId(proj.area)
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('El título es obligatorio'); return }
    const finalProjectId = resolveProject(areaId, projectId)
    if (!finalProjectId) { setError('Seleccioná un proyecto o crea uno primero'); return }
    if (!due) { setError('La fecha límite es obligatoria'); return }
    const finalProj = projects.find(p => p.id === finalProjectId)
    const finalArea = finalProj?.area ?? areaId
    setSaving(true); setError('')
    try {
      const task = await createTask({
        title: title.trim(),
        project: finalProjectId,
        area:    finalArea,
        assignee,
        due,
        priority,
        description: desc || undefined,
        helper: helper || undefined,
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

  const areaProjects = areaId ? projects.filter(p => p.area === areaId) : projects
  const hasGenerales = !!getGeneralesProject(areaId)

  return (
    <>
      <div className="modal-bd" onClick={closeNewTask} />
      <div className="modal" style={{ maxWidth: 540 }}>
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

          {/* Área + Proyecto */}
          <div className="row gap-12 mt-16">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Área</label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={areaId}
                  onChange={e => handleAreaChange(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">Todas</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">
                Proyecto <span style={{ color: 'var(--red)' }}>*</span>
                {hasGenerales && !projectId && (
                  <span className="micro" style={{ marginLeft: 6, color: 'var(--teal)' }}>→ Generales</span>
                )}
              </label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={projectId}
                  onChange={e => handleProjectChange(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">Seleccionar...</option>
                  {areaProjects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name === 'Generales' ? '📋 ' : ''}{p.name}
                    </option>
                  ))}
                </select>
              </div>
              {areaId && areaProjects.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4 }}>
                  Sin proyectos en esta área. Crea uno primero.
                </div>
              )}
            </div>
          </div>

          {/* Asignado + Ayudante */}
          <div className="row gap-12 mt-16">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Responsable</label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer' }}
                >
                  {memberList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Auxiliar / Ayudante <span className="micro" style={{ color: 'var(--text-3)', marginLeft: 4 }}>opcional</span></label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={helper}
                  onChange={e => setHelper(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: helper ? 'var(--text-1)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">Sin auxiliar</option>
                  {memberList.filter(m => m.id !== assignee).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fecha */}
          <div className="form-group mt-16">
            <label className="form-label">Fecha límite <span style={{ color: 'var(--red)' }}>*</span></label>
            <div className="input">
              <Calendar size={13} color="var(--text-3)" />
              <input type="date" value={due} onChange={e => setDue(e.target.value)} style={{ colorScheme: 'dark' }} />
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
