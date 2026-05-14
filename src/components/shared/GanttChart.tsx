import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Plus, ZoomIn, ZoomOut, Target, Printer, AlertTriangle, ChevronDown, ChevronRight, X, Calendar, Milestone } from 'lucide-react'
import type { Task, TaskDependency, GanttTask } from '@/types'
import { fetchTaskDependencies, createTaskDependency, deleteTaskDependency, updateTaskGantt } from '@/lib/db'
import { format, addDays, differenceInCalendarDays, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Constants ────────────────────────────────────────────
const ROW_H   = 36
const ZOOM_LEVELS = [16, 28, 44] as const
type ZoomLevel = typeof ZOOM_LEVELS[number]

const COLORS = {
  critical:  '#E24B4A',
  normal:    '#378ADD',
  done:      '#639922',
  float:     '#B5D4F4',
  milestone: '#854F0B',
}

// ── CPM Algorithm ────────────────────────────────────────
function calcCriticalPath(tasks: GanttTask[]): GanttTask[] {
  if (tasks.length === 0) return tasks
  const map = new Map(tasks.map(t => [t.id, t]))

  // Topological sort
  const inDegree = new Map(tasks.map(t => [t.id, 0]))
  tasks.forEach(t => t.deps.forEach(() => inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1)))

  const queue: string[] = []
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id) })
  const sorted: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    sorted.push(id)
    tasks.forEach(t => {
      if (t.deps.includes(id)) {
        inDegree.set(t.id, (inDegree.get(t.id) ?? 1) - 1)
        if (inDegree.get(t.id) === 0) queue.push(t.id)
      }
    })
  }

  // Forward pass
  sorted.forEach(id => {
    const t = map.get(id)!
    t.es = t.deps.length === 0
      ? 0
      : Math.max(...t.deps.map(depId => (map.get(depId)?.ef ?? 0)))
    t.ef = t.es + t.duration
  })

  const projectEnd = Math.max(...tasks.map(t => t.ef), 0)

  // Backward pass
  tasks.forEach(t => { t.lf = projectEnd; t.ls = projectEnd - t.duration })
  ;[...sorted].reverse().forEach(id => {
    const t = map.get(id)!
    tasks.forEach(s => {
      if (s.deps.includes(id)) {
        t.lf = Math.min(t.lf, s.ls)
        t.ls = t.lf - t.duration
      }
    })
    t.float    = t.ls - t.es
    t.critical = t.float <= 0 && t.duration > 0
  })

  return tasks
}

function wouldCreateCycle(tasks: GanttTask[], fromId: string, toId: string): boolean {
  const visited = new Set<string>()
  function dfs(id: string): boolean {
    if (id === fromId) return true
    if (visited.has(id)) return false
    visited.add(id)
    return tasks.find(t => t.id === id)?.deps.some(dfs) ?? false
  }
  return dfs(toId)
}

// ── Task-to-GanttTask conversion ─────────────────────────
function taskToGantt(task: Task, deps: string[], projectStart: Date): GanttTask {
  const s = task.start_date && isValid(parseISO(task.start_date))
    ? parseISO(task.start_date)
    : parseISO(task.due)
  const e = task.end_date && isValid(parseISO(task.end_date))
    ? parseISO(task.end_date)
    : parseISO(task.due)

  const start    = Math.max(0, differenceInCalendarDays(s, projectStart))
  const duration = task.is_milestone ? 0 : Math.max(1, differenceInCalendarDays(e, s))

  return {
    id: task.id,
    name: task.title,
    start,
    duration,
    deps,
    es: start, ef: start + duration,
    ls: start, lf: start + duration,
    float: 0, critical: false,
    originalTask: task,
  }
}

// ── Tooltip ───────────────────────────────────────────────
function GanttTooltip({ task, predecessors, x, y }: {
  task: GanttTask; predecessors: GanttTask[]; x: number; y: number
}) {
  const orig = task.originalTask
  return (
    <div style={{
      position: 'fixed', left: x + 12, top: y - 8,
      background: 'var(--surface-2)', border: '1px solid var(--border-hover)',
      borderRadius: 8, padding: '10px 14px', zIndex: 1000,
      minWidth: 220, maxWidth: 280, fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,.4)',
      pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-1)' }}>{orig.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', color: 'var(--text-2)' }}>
        <span>Inicio</span>
        <span style={{ color: 'var(--text-1)' }}>{orig.start_date ?? '—'}</span>
        <span>Fin</span>
        <span style={{ color: 'var(--text-1)' }}>{orig.end_date ?? orig.due}</span>
        <span>Duración</span>
        <span style={{ color: 'var(--text-1)' }}>{task.duration}d</span>
        <span>Holgura</span>
        <span style={{ color: task.float > 0 ? '#639922' : COLORS.critical }}>
          {task.float > 0 ? `${task.float}d disponibles` : 'Sin holgura'}
        </span>
        <span>Avance</span>
        <span style={{ color: 'var(--text-1)' }}>{orig.progress}%</span>
        <span>Ruta crítica</span>
        <span style={{ color: task.critical ? COLORS.critical : '#639922', fontWeight: 600 }}>
          {task.critical ? 'Sí' : 'No'}
        </span>
      </div>
      {predecessors.length > 0 && (
        <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8, color: 'var(--text-2)' }}>
          Depende de:{' '}
          <span style={{ color: 'var(--text-1)' }}>{predecessors.map(p => p.name).join(', ')}</span>
        </div>
      )}
    </div>
  )
}

// ── GanttTaskPanel (side panel) ───────────────────────────
function GanttTaskPanel({
  task, allTasks, deps, onClose, onUpdate, onAddDep, onRemoveDep,
}: {
  task: GanttTask
  allTasks: GanttTask[]
  deps: TaskDependency[]
  onClose: () => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onAddDep: (predId: string, succId: string) => void
  onRemoveDep: (predId: string, succId: string) => void
}) {
  const orig = task.originalTask
  const [title,       setTitle]       = useState(orig.title)
  const [startDate,   setStartDate]   = useState(orig.start_date ?? orig.due)
  const [endDate,     setEndDate]     = useState(orig.end_date ?? orig.due)
  const [progress,    setProgress]    = useState(orig.progress)
  const [isMilestone, setIsMilestone] = useState(orig.is_milestone)
  const [saving,      setSaving]      = useState(false)

  const predecessors = deps
    .filter(d => d.successor_id === task.id)
    .map(d => allTasks.find(t => t.id === d.predecessor_id))
    .filter(Boolean) as GanttTask[]

  const availablePreds = allTasks.filter(t =>
    t.id !== task.id &&
    !predecessors.some(p => p.id === t.id) &&
    !wouldCreateCycle(allTasks, task.id, t.id)
  )

  async function save() {
    setSaving(true)
    try {
      await onUpdate(task.id, {
        title, start_date: startDate, end_date: endDate,
        progress, is_milestone: isMilestone,
      })
    } finally {
      setSaving(false)
    }
  }

  const durDays = differenceInCalendarDays(parseISO(endDate), parseISO(startDate))

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 340,
      background: 'var(--surface-1)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 50,
      boxShadow: '-8px 0 32px rgba(0,0,0,.3)',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: task.critical ? COLORS.critical : COLORS.normal, flexShrink: 0,
        }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Editar tarea</span>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Title */}
        <label style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Nombre</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', marginTop: 4, marginBottom: 12, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 13 }}
        />

        {/* Dates row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Inicio</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', marginTop: 4, padding: '6px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 12 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', marginTop: 4, padding: '6px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-1)', fontSize: 12 }} />
          </div>
        </div>

        {!isMilestone && (
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-2)' }}>
            <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Duración: <strong style={{ color: 'var(--text-1)' }}>{durDays} días</strong>
          </div>
        )}

        {/* Progress */}
        {!isMilestone && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Avance — {progress}%
            </label>
            <input type="range" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))}
              style={{ width: '100%', marginTop: 6 }} />
          </div>
        )}

        {/* Milestone toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6 }}>
          <Milestone size={14} color='var(--text-2)' />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>Es hito</span>
          <button
            onClick={() => setIsMilestone(v => !v)}
            style={{
              width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: isMilestone ? 'var(--teal)' : 'var(--border)',
              position: 'relative', transition: 'background .2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 2,
              left: isMilestone ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
            }} />
          </button>
        </div>

        {/* CPM info */}
        <div style={{ marginBottom: 16, padding: '10px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-2)' }}>Ruta crítica</span>
            <span style={{ color: task.critical ? COLORS.critical : '#639922', fontWeight: 600 }}>
              {task.critical ? '● Sí' : '○ No'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-2)' }}>Holgura</span>
            <span style={{ color: 'var(--text-1)' }}>{task.float > 0 ? `${task.float}d` : '0d'}</span>
          </div>
        </div>

        {/* Predecessors */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Depende de
          </label>
          <div style={{ marginTop: 6 }}>
            {predecessors.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.critical ? COLORS.critical : COLORS.normal, flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--text-1)' }}>{p.name}</span>
                <button
                  onClick={() => onRemoveDep(p.id, task.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {availablePreds.length > 0 && (
              <select
                defaultValue=""
                onChange={e => { if (e.target.value) { onAddDep(e.target.value, task.id); e.target.value = '' } }}
                style={{ width: '100%', marginTop: 4, padding: '6px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-2)', fontSize: 12 }}
              >
                <option value="">+ Agregar predecesora…</option>
                {availablePreds.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={save}
          disabled={saving}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ── SVG Dependency Arrows ────────────────────────────────
type Arrow = { x1: number; y1: number; x2: number; y2: number; cx1: number; cx2: number; color: string; dashed: boolean; id: string }

function DependencyArrows({
  ganttTasks, deps, dayW, rowH,
}: {
  ganttTasks: GanttTask[]
  deps: TaskDependency[]
  dayW: number
  rowH: number
}) {
  const taskIndex = useMemo(() => new Map(ganttTasks.map((t, i) => [t.id, i])), [ganttTasks])

  const arrows: Arrow[] = deps.map(dep => {
    const predIdx = taskIndex.get(dep.predecessor_id)
    const succIdx = taskIndex.get(dep.successor_id)
    if (predIdx === undefined || succIdx === undefined) return null
    const pred = ganttTasks[predIdx]
    const succ = ganttTasks[succIdx]

    const x1 = (pred.es + pred.duration) * dayW
    const y1 = predIdx * rowH + rowH / 2
    const x2 = succ.es * dayW
    const y2 = succIdx * rowH + rowH / 2

    const bothCritical = pred.critical && succ.critical
    const color  = bothCritical ? COLORS.critical : '#555'
    const dashed = !bothCritical

    const cx1 = x1 + Math.min(20, Math.abs(x2 - x1) / 2)
    const cx2 = x2 - Math.min(20, Math.abs(x2 - x1) / 2)

    return { x1, y1, x2, y2, cx1, cx2, color, dashed, id: dep.id }
  }).filter((a): a is Arrow => a !== null)

  const totalH = ganttTasks.length * rowH

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: totalH, pointerEvents: 'none', overflow: 'visible' }}
    >
      <defs>
        <marker id="arrow-normal" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#555" />
        </marker>
        <marker id="arrow-critical" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={COLORS.critical} />
        </marker>
      </defs>
      {arrows.map(a => (
        <path
          key={a.id}
          d={`M ${a.x1} ${a.y1} C ${a.cx1} ${a.y1}, ${a.cx2} ${a.y2}, ${a.x2} ${a.y2}`}
          fill="none"
          stroke={a.color}
          strokeWidth={a.dashed ? 1.5 : 2}
          strokeDasharray={a.dashed ? '5 3' : undefined}
          markerEnd={a.dashed ? 'url(#arrow-normal)' : 'url(#arrow-critical)'}
          opacity={0.85}
        />
      ))}
    </svg>
  )
}

// ── Critical Path Summary ─────────────────────────────────
function CriticalPathSummary({ ganttTasks, projectStart, collapsed, onToggle }: {
  ganttTasks: GanttTask[]
  projectStart: Date
  collapsed: boolean
  onToggle: () => void
}) {
  const criticalTasks = ganttTasks.filter(t => t.critical)
  const projectEnd    = Math.max(...ganttTasks.map(t => t.ef), 0)
  const projEndDate   = addDays(projectStart, projectEnd)
  const today         = new Date()
  const daysLate      = differenceInCalendarDays(today, projEndDate)

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-1)', flexShrink: 0 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', cursor: 'pointer' }}
        onClick={onToggle}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Ruta Crítica
        </span>
        <span style={{
          background: COLORS.critical + '20', color: COLORS.critical,
          borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 700,
        }}>
          {criticalTasks.length} tareas
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 8 }}>
          Fin proyectado: <strong style={{ color: 'var(--text-1)' }}>
            {format(projEndDate, 'd MMM yyyy', { locale: es })}
          </strong>
        </span>
        {daysLate > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: COLORS.critical }}>
            <AlertTriangle size={12} /> {daysLate}d de retraso
          </span>
        )}
      </div>
      {!collapsed && criticalTasks.length > 0 && (
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 8px', flexWrap: 'wrap' }}>
          {criticalTasks.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: COLORS.critical + '15', borderRadius: 4, fontSize: 11.5 }}>
              <span style={{ color: 'var(--text-3)' }}>{i + 1}.</span>
              <span style={{ color: 'var(--text-1)' }}>{t.name}</span>
              <span style={{ color: 'var(--text-3)' }}>{t.duration}d</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main GanttChart Component ─────────────────────────────
interface GanttChartProps {
  tasks: Task[]
  projectId: string
  projectName?: string
  projectDue?: string
  onOpenTask?: (id: string) => void
  onTaskCreated?: () => void
}

export function GanttChart({
  tasks, projectId, projectName = '', onTaskCreated,
}: GanttChartProps) {
  const [dayW,        setDayW]        = useState<ZoomLevel>(28)
  const [deps,        setDeps]        = useState<TaskDependency[]>([])
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [tooltip,     setTooltip]     = useState<{ task: GanttTask; x: number; y: number } | null>(null)
  const [critCollapsed, setCritCollapsed] = useState(false)
  const [dragState,   setDragState]   = useState<{
    taskId: string; startX: number; origDuration: number; currentDuration: number
  } | null>(null)
  const [localDurations, setLocalDurations] = useState<Record<string, number>>({})
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const LEFT_W = 280
  const HEADER_H = 48

  // Load dependencies
  useEffect(() => {
    if (!projectId) return
    fetchTaskDependencies(projectId)
      .then(setDeps)
      .catch(console.error)
  }, [projectId])

  // Derive project start date from earliest task
  const projectStart = useMemo(() => {
    const dates = tasks
      .filter(t => t.start_date)
      .map(t => parseISO(t.start_date!))
      .filter(isValid)
    if (dates.length === 0) {
      const dueDates = tasks.map(t => parseISO(t.due)).filter(isValid)
      return dueDates.length > 0 ? new Date(Math.min(...dueDates.map(d => d.getTime()))) : new Date()
    }
    return new Date(Math.min(...dates.map(d => d.getTime())))
  }, [tasks])

  // Build GanttTasks with CPM
  const ganttTasks = useMemo(() => {
    const depMap = new Map<string, string[]>()
    deps.forEach(d => {
      const list = depMap.get(d.successor_id) ?? []
      list.push(d.predecessor_id)
      depMap.set(d.successor_id, list)
    })

    const gTasks = tasks
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.due.localeCompare(b.due))
      .map(t => {
        const gt = taskToGantt(t, depMap.get(t.id) ?? [], projectStart)
        if (localDurations[t.id] !== undefined) {
          gt.duration = localDurations[t.id]
          gt.ef = gt.es + gt.duration
        }
        return gt
      })

    return calcCriticalPath(gTasks)
  }, [tasks, deps, projectStart, localDurations])

  // Timeline bounds
  const totalDays = useMemo(() => {
    const maxDay = Math.max(...ganttTasks.map(t => t.ef), 60)
    return maxDay + 14
  }, [ganttTasks])

  const totalW = totalDays * dayW

  // Header: build day/week labels
  const headerDays = useMemo(() => {
    const days: { label: string; iso: string; isMonthStart: boolean }[] = []
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(projectStart, i)
      days.push({
        label: format(d, 'd', { locale: es }),
        iso: format(d, 'yyyy-MM-dd'),
        isMonthStart: d.getDate() === 1,
      })
    }
    return days
  }, [totalDays, projectStart])

  // Month header labels
  const monthHeaders = useMemo(() => {
    const months: { label: string; startDay: number; spanDays: number }[] = []
    let cur = { label: '', startDay: 0, spanDays: 0 }
    headerDays.forEach((_d, i) => {
      const label = format(addDays(projectStart, i), 'MMM yyyy', { locale: es })
      if (label !== cur.label) {
        if (cur.label) months.push(cur)
        cur = { label, startDay: i, spanDays: 1 }
      } else {
        cur.spanDays++
      }
    })
    if (cur.label) months.push(cur)
    return months
  }, [headerDays, projectStart])

  // Today position
  const todayOffset = differenceInCalendarDays(new Date(), projectStart)
  const todayX = todayOffset * dayW

  // Scroll to today on mount
  useEffect(() => {
    if (rightPanelRef.current) {
      const scrollX = Math.max(0, todayX - 200)
      rightPanelRef.current.scrollLeft = scrollX
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resize drag handlers
  const onResizeStart = useCallback((e: React.MouseEvent, taskId: string, currentDuration: number) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    setDragState({ taskId, startX, origDuration: currentDuration, currentDuration })

    const move = (ev: MouseEvent) => {
      const deltaX = ev.clientX - startX
      const deltaDays = Math.round(deltaX / dayW)
      const newDur = Math.max(1, currentDuration + deltaDays)
      setDragState(prev => prev ? { ...prev, currentDuration: newDur } : null)
      setLocalDurations(prev => ({ ...prev, [taskId]: newDur }))
    }

    const up = async () => {
      setDragState(prev => {
        if (prev) {
          const task = tasks.find(t => t.id === prev.taskId)
          if (task && task.start_date) {
            const newEndDate = format(
              addDays(parseISO(task.start_date), prev.currentDuration),
              'yyyy-MM-dd'
            )
            updateTaskGantt(prev.taskId, { end_date: newEndDate }).catch(console.error)
          }
        }
        return null
      })
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }, [dayW, tasks])

  // Task update from panel
  const handleTaskUpdate = useCallback(async (id: string, patch: Partial<Task>) => {
    await updateTaskGantt(id, {
      start_date:   patch.start_date   ?? undefined,
      end_date:     patch.end_date     ?? undefined,
      progress:     patch.progress,
      is_milestone: patch.is_milestone,
    })
    if (patch.end_date && patch.start_date) {
      const newDur = differenceInCalendarDays(parseISO(patch.end_date), parseISO(patch.start_date))
      setLocalDurations(prev => ({ ...prev, [id]: Math.max(1, newDur) }))
    }
    // Refresh by clearing local overrides for this task
    setTimeout(() => setLocalDurations(prev => { const n = { ...prev }; delete n[id]; return n }), 500)
  }, [])

  const handleAddDep = useCallback(async (predId: string, succId: string) => {
    try {
      const newDep = await createTaskDependency(projectId, predId, succId)
      setDeps(prev => [...prev, newDep])
    } catch (e) {
      console.error('Failed to create dependency:', e)
    }
  }, [projectId])

  const handleRemoveDep = useCallback(async (predId: string, succId: string) => {
    try {
      await deleteTaskDependency(predId, succId)
      setDeps(prev => prev.filter(d => !(d.predecessor_id === predId && d.successor_id === succId)))
    } catch (e) {
      console.error('Failed to delete dependency:', e)
    }
  }, [])

  const selectedTask = ganttTasks.find(t => t.id === selectedId) ?? null

  const barColor = (gt: GanttTask) => {
    if (gt.originalTask.status === 'done') return COLORS.done
    if (gt.critical) return COLORS.critical
    return COLORS.normal
  }

  if (tasks.length === 0) {
    return (
      <div className="empty" style={{ marginTop: 48 }}>
        <div className="ill" style={{ fontSize: 32 }}>📊</div>
        <p className="t">Sin tareas para mostrar</p>
        <p className="d">Agregá tareas al proyecto para visualizarlas en el Gantt.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface-1)' }} className="gantt-toolbar no-print">
        <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{projectName}</span>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />

        {/* Zoom controls */}
        <button className="btn btn-secondary btn-sm btn-icon" title="Reducir zoom"
          onClick={() => setDayW(w => { const i = ZOOM_LEVELS.indexOf(w); return i > 0 ? ZOOM_LEVELS[i - 1] : w })}>
          <ZoomOut size={13} />
        </button>
        <button className="btn btn-secondary btn-sm btn-icon" title="Aumentar zoom"
          onClick={() => setDayW(w => { const i = ZOOM_LEVELS.indexOf(w); return i < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[i + 1] : w })}>
          <ZoomIn size={13} />
        </button>

        {/* Go to today */}
        <button className="btn btn-secondary btn-sm" title="Ir a hoy"
          onClick={() => { if (rightPanelRef.current) rightPanelRef.current.scrollLeft = Math.max(0, todayX - 200) }}>
          <Target size={13} /> Hoy
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Legend */}
          {([
            { color: COLORS.critical, label: 'Ruta crítica' },
            { color: COLORS.normal,   label: 'Normal' },
            { color: COLORS.done,     label: 'Completada' },
          ] as const).map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              {l.label}
            </span>
          ))}

          <button className="btn btn-secondary btn-sm" onClick={() => window.print()} title="Imprimir Gantt">
            <Printer size={13} /> Exportar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onTaskCreated?.()}>
            <Plus size={13} /> Agregar tarea
          </button>
        </div>
      </div>

      {/* Critical path summary */}
      <CriticalPathSummary
        ganttTasks={ganttTasks}
        projectStart={projectStart}
        collapsed={critCollapsed}
        onToggle={() => setCritCollapsed(v => !v)}
      />

      {/* Gantt body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left panel */}
        <div style={{ width: LEFT_W, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{ height: HEADER_H, display: 'flex', alignItems: 'flex-end', padding: '0 12px 8px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tarea</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Días</span>
          </div>
          {/* Task rows */}
          <div style={{ overflowY: 'auto', flex: 1 }} className="gantt-left-rows">
            {ganttTasks.map(gt => (
              <div
                key={gt.id}
                style={{
                  height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 12px',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer', gap: 8,
                  background: selectedId === gt.id ? 'var(--surface-2)' : 'transparent',
                }}
                onClick={() => setSelectedId(id => id === gt.id ? null : gt.id)}
                onMouseEnter={e => { if (selectedId !== gt.id) (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)' }}
                onMouseLeave={e => { if (selectedId !== gt.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {/* Critical indicator */}
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: gt.critical ? COLORS.critical : 'transparent',
                  border: gt.critical ? 'none' : '1.5px solid var(--border-hover)',
                }} />
                {/* Name */}
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-1)' }}>
                  {gt.originalTask.is_milestone && '◆ '}
                  {gt.name}
                </span>
                {/* Duration */}
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                  {gt.duration}d
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — scrollable timeline */}
        <div
          ref={rightPanelRef}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
          className="gantt-right-scroll"
        >
          <div style={{ width: totalW, position: 'relative', minHeight: ganttTasks.length * ROW_H + HEADER_H }}>
            {/* Month + Day header */}
            <div style={{ position: 'sticky', top: 0, height: HEADER_H, background: 'var(--surface-1)', borderBottom: '1px solid var(--border)', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
              {/* Month row */}
              <div style={{ display: 'flex', height: 20, borderBottom: '1px solid var(--border)' }}>
                {monthHeaders.map((m, i) => (
                  <div key={i} style={{
                    width: m.spanDays * dayW, flexShrink: 0, padding: '0 8px',
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    color: 'var(--text-3)', letterSpacing: '.06em',
                    display: 'flex', alignItems: 'center',
                    borderRight: '1px solid var(--border)',
                  }}>
                    {m.label}
                  </div>
                ))}
              </div>
              {/* Day row */}
              <div style={{ display: 'flex', height: 28 }}>
                {headerDays.map((d, i) => {
                  const isToday = i === todayOffset
                  const isWeekend = [0, 6].includes(addDays(projectStart, i).getDay())
                  return (
                    <div key={i} style={{
                      width: dayW, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: dayW >= 28 ? 10 : 8,
                      color: isToday ? 'var(--teal)' : isWeekend ? 'var(--text-3)' : 'var(--text-3)',
                      fontWeight: isToday ? 700 : 400,
                      background: isToday ? 'rgba(20,184,166,.08)' : d.isMonthStart ? 'rgba(255,255,255,.02)' : 'transparent',
                      borderRight: d.isMonthStart ? '1px solid var(--border)' : i % 7 === 6 ? '1px solid rgba(255,255,255,.04)' : 'none',
                    }}>
                      {dayW >= 16 ? d.label : ''}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Weekend shading */}
            {headerDays.map((_d, i) => {
              const isWeekend = [0, 6].includes(addDays(projectStart, i).getDay())
              return isWeekend ? (
                <div key={i} style={{
                  position: 'absolute', left: i * dayW, top: HEADER_H,
                  width: dayW, bottom: 0,
                  background: 'rgba(255,255,255,.012)', pointerEvents: 'none',
                }} />
              ) : null
            })}

            {/* Today marker */}
            {todayOffset >= 0 && todayOffset <= totalDays && (
              <div style={{ position: 'absolute', left: todayX + dayW / 2, top: 0, bottom: 0, width: 2, background: 'var(--teal)', zIndex: 5, pointerEvents: 'none' }}>
                <span style={{ position: 'absolute', top: HEADER_H + 4, left: 4, fontSize: 9, fontWeight: 700, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.05em' }}>HOY</span>
              </div>
            )}

            {/* Row backgrounds */}
            {ganttTasks.map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: 0, top: HEADER_H + i * ROW_H, width: '100%', height: ROW_H,
                background: i % 2 === 1 ? 'rgba(255,255,255,.008)' : 'transparent',
                borderBottom: '1px solid var(--border)',
                pointerEvents: 'none',
              }} />
            ))}

            {/* Dependency arrows overlay */}
            <div style={{ position: 'absolute', top: HEADER_H, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
              <DependencyArrows
                ganttTasks={ganttTasks}
                deps={deps}
                dayW={dayW}
                rowH={ROW_H}
              />
            </div>

            {/* Task bars */}
            {ganttTasks.map((gt, rowIdx) => {
              const x       = gt.es * dayW
              const barW    = Math.max(gt.duration * dayW, gt.originalTask.is_milestone ? 0 : dayW)
              const color   = barColor(gt)
              const floatW  = gt.float * dayW
              const progressW = (gt.originalTask.progress / 100) * barW
              const isDraggingThis = dragState?.taskId === gt.id

              return (
                <div
                  key={gt.id}
                  style={{ position: 'absolute', top: HEADER_H + rowIdx * ROW_H, height: ROW_H, left: 0, width: totalW, pointerEvents: 'none' }}
                >
                  {/* Float ghost bar */}
                  {gt.float > 0 && !gt.originalTask.is_milestone && (
                    <div style={{
                      position: 'absolute', left: x + barW, top: ROW_H / 2 - 6,
                      width: floatW, height: 12, borderRadius: 2,
                      background: COLORS.float + '40', border: `1px dashed ${COLORS.float}`,
                      pointerEvents: 'none',
                    }} />
                  )}

                  {/* Milestone diamond */}
                  {gt.originalTask.is_milestone ? (
                    <div
                      style={{
                        position: 'absolute', left: x - 8, top: ROW_H / 2 - 8,
                        width: 16, height: 16, transform: 'rotate(45deg)',
                        background: COLORS.milestone, borderRadius: 2,
                        pointerEvents: 'all', cursor: 'pointer',
                      }}
                      onClick={() => setSelectedId(id => id === gt.id ? null : gt.id)}
                      onMouseEnter={e => setTooltip({ task: gt, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ) : (
                    /* Task bar */
                    <div
                      style={{
                        position: 'absolute', left: x, top: 6, height: ROW_H - 12,
                        width: barW, borderRadius: 4,
                        background: color + (gt.originalTask.status === 'done' ? 'ff' : '30'),
                        border: `1.5px solid ${color}`,
                        pointerEvents: 'all', cursor: isDraggingThis ? 'col-resize' : 'pointer',
                        overflow: 'hidden', display: 'flex', alignItems: 'center',
                        boxShadow: isDraggingThis ? `0 0 0 2px ${color}60` : 'none',
                      }}
                      onClick={() => { if (!dragState) setSelectedId(id => id === gt.id ? null : gt.id) }}
                      onMouseEnter={e => setTooltip({ task: gt, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {/* Progress fill */}
                      {gt.originalTask.progress > 0 && (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: progressW, background: color + '60', borderRadius: '3px 0 0 3px',
                          pointerEvents: 'none',
                        }} />
                      )}
                      {/* Label */}
                      {barW > 40 && (
                        <span style={{
                          position: 'relative', paddingLeft: 6, fontSize: 11, fontWeight: 600,
                          color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1, pointerEvents: 'none',
                        }}>
                          {gt.name}
                        </span>
                      )}
                      {/* Resize handle */}
                      <div
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: 8,
                          cursor: 'col-resize', background: color + '40',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseDown={e => onResizeStart(e, gt.id, gt.duration)}
                        onMouseEnter={() => setTooltip(null)}
                      >
                        <span style={{ width: 2, height: 10, borderRadius: 1, background: color, opacity: 0.8 }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Task side panel */}
        {selectedTask && (
          <GanttTaskPanel
            task={selectedTask}
            allTasks={ganttTasks}
            deps={deps}
            onClose={() => setSelectedId(null)}
            onUpdate={handleTaskUpdate}
            onAddDep={handleAddDep}
            onRemoveDep={handleRemoveDep}
          />
        )}
      </div>

      {/* Tooltip */}
      {tooltip && !dragState && (
        <GanttTooltip
          task={tooltip.task}
          predecessors={deps
            .filter(d => d.successor_id === tooltip.task.id)
            .map(d => ganttTasks.find(t => t.id === d.predecessor_id))
            .filter(Boolean) as GanttTask[]}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .gantt-toolbar, .no-print { display: none !important; }
          body { background: white; }
          .gantt-right-scroll { overflow: visible !important; }
        }
      `}</style>
    </div>
  )
}
