import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Flag, List } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { createTask } from '@/lib/db'
import { useMembers } from '@/hooks/useSupabase'
import { sortedMembers } from '@/lib/auth'
import type { TaskPriority } from '@/types'

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urg',  label: 'Urgente', color: 'var(--red)'    },
  { value: 'alta', label: 'Alta',    color: 'var(--amber)'  },
  { value: 'med',  label: 'Media',   color: 'var(--blue)'   },
  { value: 'baja', label: 'Baja',    color: 'var(--text-3)' },
]

export function NewTaskModal() {
  const { newTaskOpen, newTaskProjectId, newTaskAreaId, newTaskDate, closeNewTask, areas, subareas, projects, addTask, refreshAll, currentUser } = useAppStore()
  const { data: members = [] } = useMembers()
  const memberList = sortedMembers(members)

  const [title,     setTitle]     = useState('')
  const [areaId,    setAreaId]    = useState('')
  const [subareaId, setSubareaId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [assignee,  setAssignee]  = useState(currentUser.memberId)
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

  const isEdificioArea = (aid: string) =>
    areas.find(a => a.id === aid)?.type === 'edificio'

  // Get "Generales" project for a given area
  const getGeneralesProject = (aid: string) =>
    projects.find(p => p.area === aid && p.name === 'Generales')

  const resolveProject = (aid: string, pid: string) => {
    // Trust explicit pid even if not yet in local store (newly created project)
    if (pid) return pid
    const gen = getGeneralesProject(aid)
    return gen?.id ?? ''
  }

  // Keep a ref to the latest projects/areas so the effect can read them
  // without listing them as dependencies (avoids resetting the form on store updates)
  const projectsRef = useRef(projects)
  const areasRef    = useRef(areas)
  useEffect(() => { projectsRef.current = projects }, [projects])
  useEffect(() => { areasRef.current   = areas    }, [areas])

  useEffect(() => {
    if (!newTaskOpen) return;
    const _projects = projectsRef.current
    const _areas    = areasRef.current

    setTitle(''); setDesc(''); setError(''); setHelper(''); setBulkText(''); setBulkMode(false)
    setStartDate(''); setDuration(''); setDue(newTaskDate ?? '')
    setPriority('med')
    setAssignee(currentUser.memberId)

    const pid  = newTaskProjectId ?? ''
    const proj = _projects.find(p => p.id === pid)
    const aid  = proj?.area ?? newTaskAreaId ?? _areas[0]?.id ?? ''
    setAreaId(aid)

    // Sub-area: only relevant for edificio. If the preselected project has a
    // subarea, use it; otherwise leave blank so the user picks one.
    if (_areas.find(a => a.id === aid)?.type === 'edificio') {
      setSubareaId(proj?.subarea ?? '')
    } else {
      setSubareaId('')
    }

    if (pid) {
      setProjectId(pid)
    } else {
      const gen = _projects.find(p => p.area === aid && p.name === 'Generales')
      setProjectId(gen?.id ?? _projects.filter(p => p.area === aid)[0]?.id ?? '')
    }
  // Only re-initialize when the modal opens or its pre-filled values change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTaskOpen, newTaskProjectId, newTaskAreaId, newTaskDate, currentUser.memberId])

  const handleAreaChange = (aid: string) => {
    setAreaId(aid)
    // Reset subarea when area changes. If edificio with a single subarea, autoselect.
    if (isEdificioArea(aid)) {
      const subs = subareas.filter(sa => sa.area === aid)
      setSubareaId(subs.length === 1 ? subs[0].id : '')
    } else {
      setSubareaId('')
    }
    // Auto-select Generales for the new area, or first project
    const gen = getGeneralesProject(aid)
    setProjectId(gen?.id ?? projects.filter(p => p.area === aid)[0]?.id ?? '')
  }

  const handleSubareaChange = (sid: string) => {
    setSubareaId(sid)
    // If the currently selected project doesn't belong to the new subarea
    // (and isn't Generales), reset to Generales or empty.
    const proj = projects.find(p => p.id === projectId)
    if (proj && proj.subarea !== sid && proj.name !== 'Generales') {
      const gen = getGeneralesProject(areaId)
      setProjectId(gen?.id ?? '')
    }
  }

  const handleProjectChange = (pid: string) => {
    setProjectId(pid)
    const proj = projects.find(p => p.id === pid)
    if (proj) {
      setAreaId(proj.area)
      if (isEdificioArea(proj.area)) setSubareaId(proj.subarea ?? '')
    }
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('El título es obligatorio'); return }
    if (isEdificioArea(areaId) && !subareaId && subareas.filter(sa => sa.area === areaId).length > 0) {
      setError('Seleccioná una sub-área'); return
    }
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
    if (isEdificioArea(areaId) && !subareaId && subareas.filter(sa => sa.area === areaId).length > 0) {
      setError('Seleccioná una sub-área'); return
    }
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

  const needsSubArea = isEdificioArea(areaId)
  const areaSubAreas = subareas.filter(sa => sa.area === areaId)
  // Edificio: filter projects by subarea (Generales always shown as fallback).
  // Other areas: show all projects for the area.
  const areaProjects = areaId
    ? projects.filter(p => {
        if (p.area !== areaId) return false
        if (!needsSubArea) return true
        if (!subareaId) return true
        return p.subarea === subareaId || p.name === 'Generales'
      })
    : projects
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

          {/* Jerarquía: Área → Sub-área → Proyecto */}
          <div className="form-group mt-16" style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}>
            {/* Área */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: areas.find(a => a.id === areaId)?.color ?? 'var(--text-3)', flexShrink: 0 }} />
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', width: 72, flexShrink: 0 }}>Área</label>
              <div style={{ flex: 1, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                <select
                  value={areaId}
                  onChange={e => handleAreaChange(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 10px', height: 32, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', colorScheme: 'dark' }}
                >
                  <option value="" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Seleccionar área...</option>
                  {areas.map(a => <option key={a.id} value={a.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{a.name}</option>)}
                </select>
              </div>
            </div>

            {/* Conector visual */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, paddingLeft: 3 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 6, flexShrink: 0 }}>
                <div style={{ width: 1, flex: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ flex: 1 }} />
            </div>

            {/* Sub-área (solo edificio) */}
            {needsSubArea && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, paddingTop: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 2, background: areaSubAreas.find(sa => sa.id === subareaId)?.color ?? 'var(--border)', flexShrink: 0 }} />
                  <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', width: 72, flexShrink: 0 }}>
                    Sub-área <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <div style={{ flex: 1, background: 'var(--surface-1)', border: `1px solid ${!subareaId && areaSubAreas.length > 0 ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 6, overflow: 'hidden' }}>
                    {areaSubAreas.length === 0 ? (
                      <div style={{ padding: '0 10px', height: 32, display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--amber)' }}>
                        Sin sub-áreas — creá una primero
                      </div>
                    ) : (
                      <select
                        value={subareaId}
                        onChange={e => handleSubareaChange(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 10px', height: 32, color: subareaId ? 'var(--text-1)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer', colorScheme: 'dark' }}
                      >
                        <option value="" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Seleccionar sub-área...</option>
                        {areaSubAreas.map(sa => (
                          <option key={sa.id} value={sa.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{sa.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, paddingLeft: 3 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 6, flexShrink: 0 }}>
                    <div style={{ width: 1, flex: 1, background: 'var(--border)' }} />
                  </div>
                  <div style={{ flex: 1 }} />
                </div>
              </>
            )}

            {/* Proyecto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: 'var(--teal)', flexShrink: 0, opacity: projectId ? 1 : 0.3 }} />
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', width: 72, flexShrink: 0 }}>
                Proyecto <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <div style={{ flex: 1, background: 'var(--surface-1)', border: `1px solid ${areaId && areaProjects.length === 0 ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 6, overflow: 'hidden' }}>
                {areaId && areaProjects.length === 0 ? (
                  <div style={{ padding: '0 10px', height: 32, display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--amber)' }}>
                    Sin proyectos — creá uno primero
                  </div>
                ) : (
                  <select
                    value={projectId}
                    onChange={e => handleProjectChange(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 10px', height: 32, color: projectId ? 'var(--text-1)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer', colorScheme: 'dark' }}
                  >
                    <option value="" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Seleccionar proyecto...</option>
                    {areaProjects.map(p => (
                      <option key={p.id} value={p.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>
                        {p.name === 'Generales' ? '📋 ' : ''}{p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {hasGenerales && !projectId && areaProjects.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--teal)', whiteSpace: 'nowrap' }}>→ Generales</span>
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
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', colorScheme: 'dark' }}
                >
                  {memberList.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Auxiliar / Ayudante <span className="micro" style={{ color: 'var(--text-3)', marginLeft: 4 }}>opcional</span></label>
              <div className="input" style={{ padding: 0 }}>
                <select
                  value={helper}
                  onChange={e => setHelper(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: helper ? 'var(--text-1)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer', colorScheme: 'dark' }}
                >
                  <option value="" style={{ background: '#1e1e2e', color: '#cdd6f4' }}>Sin auxiliar</option>
                  {memberList.filter(m => m.id !== assignee).map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#1e1e2e', color: '#cdd6f4' }}>{m.name}</option>
                  ))}
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
