import { useState, useEffect } from 'react'
import { X, Calendar, Flag, List } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { createTask } from '@/lib/db'
import { useMembers } from '@/hooks/useSupabase'
import { APP_USERS, APP_USER_IDS, sortedMembers } from '@/lib/auth'
import type { TaskPriority } from '@/types'

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urg',  label: 'Urgente', color: 'var(--red)'    },
  { value: 'alta', label: 'Alta',    color: 'var(--amber)'  },
  { value: 'med',  label: 'Media',   color: 'var(--blue)'   },
  { value: 'baja', label: 'Baja',    color: 'var(--text-3)' },
]

export function NewTaskModal() {
  const { newTaskOpen, newTaskProjectId, newTaskAreaId, newTaskDate, closeNewTask, areas, projects, addTask, refreshAll, currentUser } = useAppStore()
  const { data: members = [] } = useMembers()
  const rawList = members.length > 0
    ? members
    : APP_USERS.map(u => ({ id: u.id, name: u.name, role: u.role, short: u.short }))
  const memberList = sortedMembers(rawList)

  const [title,     setTitle]     = useState('')
  const [areaId,    setAreaId]    = useState('')
  const [projectId, setProjectId] = useState('')
  const [assignee,  setAssignee]  = useState(currentUser.id)
  const [helper,    setHelper]    = useState('')
  const [startDate, setStartDate] = useState('')
  const [duration,  setDuration]  = useState('')
  const [due,       setDue]       = useState('')
  const [priority,  setPriority]  = useState<TaskPriority>('med')
  const [desc,      setDesc]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [bulkMode,  setBulkMode]  = useState(false)
  const [bulkText,  setBulkText]  = useState('')

  // Auto-calc due from startDate + duration, or startDate from due - duration
  const handleStartChange = (v: string) => {
    setStartDate(v)
    if (v && duration) {
      const d = new Date(v + 'T12:00:00')
      d.setDate(d.getDate() + Number(duration))
      setDue(d.toISOString().slice(0, 10))
    }
  }
  const handleDurationChange = (v: string) => {
    setDuration(v)
    if (startDate && v) {
      const d = new Date(startDate + 'T12:00:00')
      d.setDate(d.getDate() + Number(v))
      setDue(d.toISOString().slice(0, 10))
    } else if (due && v) {
      const d = new Date(due + 'T12:00:00')
      d.setDate(d.getDate() - Number(v))
      setStartDate(d.toISOString().slice(0, 10))
    }
  }
  const handleDueChange = (v: string) => {
    setDue(v)
    if (startDate && v) {
      const diff = Math.round((new Date(v + 'T12:00:00').getTime() - new Date(startDate + 'T12:00:00').getTime()) / 86400000)
      if (diff > 0) setDuration(String(diff))
    } else if (duration && v) {
      const d = new Date(v + 'T12:00:00')
      d.setDate(d.getDate() - Number(duration))
      setStartDate(d.toISOString().slice(0, 10))
    }
  }

  // Get "Generales" project for a given area
  const getGeneralesProject = (aid: string) =>
    projects.find(p => p.area === aid && p.name === 'Generales')

  const resolveProject = (aid: string, pid: string) => {
    // Trust explicit pid even if not yet in local store (newly created project)
    if (pid) return pid
    const gen = getGeneralesProject(aid)
    return gen?.id ?? ''
  }

  useEffect(() => {
    if (newTaskOpen) {
      setTitle(''); setDesc(''); setError(''); setHelper(''); setBulkText(''); setBulkMode(false)
      setStartDate(''); setDuration(''); setDue(newTaskDate ?? '')
      setPriority('med')
      setAssignee(currentUser.id)

      const pid = newTaskProjectId ?? ''
      const proj = projects.find(p => p.id === pid)
      const aid = proj?.area ?? newTaskAreaId ?? areas[0]?.id ?? ''
      setAreaId(aid)

      if (pid) {
        // Use the explicit projectId directly — even if not yet in local list
        setProjectId(pid)
      } else {
        const gen = getGeneralesProject(aid)
        setProjectId(gen?.id ?? projects.filter(p => p.area === aid)[0]?.id ?? '')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTaskOpen, newTaskProjectId, newTaskAreaId, newTaskDate, projects, areas, currentUser.id])

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
    if (!finalProjectId) { setError('Seleccioná un proyecto. Si el área no tiene proyectos, crea uno primero desde el área.'); return }
    if (!assignee) { setError('Seleccioná un responsable'); return }
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
        helper:      helper || undefined,
        start_date:  startDate || undefined,
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

  const handleBulkSave = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { setError('Escribí al menos una tarea'); return }
    const finalProjectId = resolveProject(areaId, projectId)
    if (!finalProjectId) { setError('Seleccioná un proyecto. Si el área no tiene proyectos, crea uno primero desde el área.'); return }
    if (!assignee) { setError('Seleccioná un responsable'); return }
    if (!due) { setError('La fecha límite es obligatoria'); return }
    const finalProj = projects.find(p => p.id === finalProjectId)
    const finalArea = finalProj?.area ?? areaId
    setSaving(true); setError('')
    try {
      for (const line of lines) {
        const task = await createTask({
          title: line, project: finalProjectId, area: finalArea,
          assignee, due, priority, helper: helper || undefined,
        })
        addTask(task)
      }
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
          <button
            onClick={() => { setBulkMode(v => !v); setError('') }}
            style={{
              marginLeft: 'auto', marginRight: 8,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: bulkMode ? 'var(--teal)' : 'transparent',
              color: bulkMode ? '#fff' : 'var(--text-2)',
              fontSize: 12, cursor: 'pointer', fontWeight: bulkMode ? 600 : 400,
            }}
          >
            <List size={13} /> {bulkMode ? 'Modo lista' : 'Carga masiva'}
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={closeNewTask}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          {/* Título — solo en modo individual */}
          {!bulkMode && (
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
          )}

          {/* Bulk textarea */}
          {bulkMode && (
          <div className="form-group">
            <label className="form-label">
              Tareas <span style={{ color: 'var(--red)' }}>*</span>
              <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 8, fontSize: 11 }}>una por línea</span>
            </label>
            <div className="input" style={{ height: 'auto', alignItems: 'flex-start', padding: '8px 12px' }}>
              <textarea
                autoFocus
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={"Inspeccionar losa\nLimpiar zona afectada\nAplicar impermeabilizante\nVerificar sellado"}
                style={{ resize: 'vertical', minHeight: 120, background: 'transparent', border: 'none', outline: 'none', width: '100%', color: 'var(--text-1)', fontSize: 13, lineHeight: 1.6 }}
              />
            </div>
            {bulkText.split('\n').filter(l => l.trim()).length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>
                {bulkText.split('\n').filter(l => l.trim()).length} tarea{bulkText.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''} para crear
              </div>
            )}
          </div>
          )}

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
                  {memberList.map((m, i) => {
                    const isApp     = APP_USER_IDS.has(m.id)
                    const prevIsApp = i > 0 && APP_USER_IDS.has(memberList[i - 1].id)
                    const showSep   = !isApp && (i === 0 || prevIsApp)
                    return (
                      <>
                        {showSep && <option disabled>──────────────</option>}
                        <option key={m.id} value={m.id}>{isApp ? `★ ${m.name}` : m.name}</option>
                      </>
                    )
                  })}
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
                  {memberList.filter(m => m.id !== assignee).map((m, i, arr) => {
                    const isApp     = APP_USER_IDS.has(m.id)
                    const prevIsApp = i > 0 && APP_USER_IDS.has(arr[i - 1].id)
                    const showSep   = !isApp && (i === 0 || prevIsApp)
                    return (
                      <>
                        {showSep && <option disabled>──────────────</option>}
                        <option key={m.id} value={m.id}>{isApp ? `★ ${m.name}` : m.name}</option>
                      </>
                    )
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Fechas + Duración */}
          <div className="row gap-12 mt-16">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label"><Calendar size={11} style={{ marginRight: 4 }} />Inicio <span className="micro" style={{ color: 'var(--text-3)', marginLeft: 4 }}>opcional</span></label>
              <div className="input">
                <input type="date" value={startDate} onChange={e => handleStartChange(e.target.value)} style={{ colorScheme: 'dark', width: '100%' }} />
              </div>
            </div>
            <div className="form-group" style={{ width: 90, flexShrink: 0 }}>
              <label className="form-label">Duración <span className="micro" style={{ color: 'var(--text-3)', marginLeft: 4 }}>días</span></label>
              <div className="input">
                <input
                  type="number" min={1} max={365} value={duration} placeholder="—"
                  onChange={e => handleDurationChange(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13 }}
                />
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label"><Calendar size={11} style={{ marginRight: 4 }} />Límite <span style={{ color: 'var(--red)' }}>*</span></label>
              <div className="input">
                <input type="date" value={due} onChange={e => handleDueChange(e.target.value)} style={{ colorScheme: 'dark', width: '100%' }} />
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
          <button
            className="btn btn-primary btn-md"
            onClick={bulkMode ? handleBulkSave : handleSave}
            disabled={saving}
          >
            {saving
              ? 'Creando...'
              : bulkMode
                ? `Crear ${bulkText.split('\n').filter(l => l.trim()).length || ''} tareas`
                : 'Crear tarea'
            }
          </button>
        </div>
      </div>
    </>
  )
}
