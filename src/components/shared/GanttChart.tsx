import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Plus, ZoomIn, ZoomOut, Target, Printer, AlertTriangle, ChevronDown, ChevronRight, X, Calendar, Milestone } from 'lucide-react'
import type { Task, TaskDependency, GanttTask } from '@/types'
import { fetchTaskDependencies, createTaskDependency, deleteTaskDependency, updateTaskGantt } from '@/lib/db'
import { format, addDays, differenceInCalendarDays, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Constants ────────────────────────────────────────────
const ROW_H = 40
const HEADER_H = 52          // total header height (month row + day row)
const MONTH_ROW_H = 22
const DAY_ROW_H = 30
const ZOOM_LEVELS = [20, 32, 48] as const
type ZoomLevel = typeof ZOOM_LEVELS[number]

const COLORS = {
  critical:  '#E24B4A',
  normal:    '#378ADD',
  done:      '#52A534',
  float:     '#B5D4F4',
  milestone: '#C17F24',
}

// ── CPM Algorithm ────────────────────────────────────────
function calcCriticalPath(tasks: GanttTask[]): GanttTask[] {
  if (tasks.length === 0) return tasks
  const map = new Map(tasks.map(t => [t.id, t]))

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
    t.es = t.deps.length === 0 ? 0 : Math.max(...t.deps.map(depId => (map.get(depId)?.ef ?? 0)))
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
  const startLabel = orig.start_date ? format(parseISO(orig.start_date), 'd MMM yyyy', { locale: es }) : '—'
  const endLabel   = orig.end_date   ? format(parseISO(orig.end_date),   'd MMM yyyy', { locale: es }) : orig.due
  return (
    <div style={{
      position: 'fixed', left: x + 14, top: y - 12,
      background: '#1C1C22', border: '1px solid #2E2E38',
      borderRadius: 10, padding: '12px 16px', zIndex: 1000,
      minWidth: 240, maxWidth: 300, fontSize: 12.5,
      boxShadow: '0 12px 32px rgba(0,0,0,.6)',
      pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10, color: '#E8E8EA', lineHeight: 1.3 }}>{orig.title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 5, columnGap: 14, color: '#8B8B92', fontSize: 12 }}>
        <span>Inicio</span>      <span style={{ color: '#E8E8EA' }}>{startLabel}</span>
        <span>Fin</span>         <span style={{ color: '#E8E8EA' }}>{endLabel}</span>
        <span>Duración</span>    <span style={{ color: '#E8E8EA' }}>{task.duration}d</span>
        <span>Holgura</span>
        <span style={{ color: task.float > 0 ? COLORS.done : COLORS.critical, fontWeight: 600 }}>
          {task.float > 0 ? `${task.float}d disponibles` : 'Sin holgura'}
        </span>
        <span>Avance</span>      <span style={{ color: '#E8E8EA' }}>{orig.progress}%</span>
        <span>Ruta crítica</span>
        <span style={{ color: task.critical ? COLORS.critical : COLORS.done, fontWeight: 700 }}>
          {task.critical ? '● Sí' : '○ No'}
        </span>
      </div>
      {predecessors.length > 0 && (
        <div style={{ marginTop: 10, borderTop: '1px solid #2E2E38', paddingTop: 8, color: '#8B8B92', fontSize: 12 }}>
          Depende de: <span style={{ color: '#E8E8EA' }}>{predecessors.map(p => p.name).join(', ')}</span>
        </div>
      )}
    </div>
  )
}

// ── GanttTaskPanel (side panel, fixed width 460px) ────────
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

  // Reset when task changes
  useEffect(() => {
    setTitle(orig.title)
    setStartDate(orig.start_date ?? orig.due)
    setEndDate(orig.end_date ?? orig.due)
    setProgress(orig.progress)
    setIsMilestone(orig.is_milestone)
  }, [task.id, orig.title, orig.start_date, orig.end_date, orig.due, orig.progress, orig.is_milestone])

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
      await onUpdate(task.id, { title, start_date: startDate, end_date: endDate, progress, is_milestone: isMilestone })
    } finally {
      setSaving(false)
    }
  }

  const durDays = isValid(parseISO(endDate)) && isValid(parseISO(startDate))
    ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
    : 0

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text-1)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase',
    letterSpacing: '.07em', fontWeight: 600, display: 'block', marginBottom: 5,
  }

  return (
    <div style={{
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 460,
      background: 'var(--surface-1)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 50,
      boxShadow: '-12px 0 40px rgba(0,0,0,.45)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: task.critical ? COLORS.critical : COLORS.normal,
          boxShadow: `0 0 6px ${task.critical ? COLORS.critical : COLORS.normal}80`,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Editar tarea</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            {task.critical ? '● Ruta crítica' : `Holgura: ${task.float}d`}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={15} /></button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* Title */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Nombre de la tarea</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Milestone toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
          padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 8,
          border: '1px solid var(--border)',
        }}>
          <Milestone size={15} color='var(--text-2)' />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>Es hito</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Aparece como ◆ en el diagrama</div>
          </div>
          <button
            onClick={() => setIsMilestone(v => !v)}
            style={{
              width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: isMilestone ? 'var(--teal)' : 'var(--border-hover)',
              position: 'relative', transition: 'background .2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: isMilestone ? 21 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left .18s',
              boxShadow: '0 1px 4px rgba(0,0,0,.3)',
            }} />
          </button>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Fecha inicio</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Fecha fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {!isMilestone && (
          <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-2)' }}>
            <Calendar size={13} />
            Duración calculada:
            <strong style={{ color: durDays >= 0 ? 'var(--text-1)' : COLORS.critical }}>
              {durDays >= 0 ? `${durDays} días` : 'Fechas inválidas'}
            </strong>
          </div>
        )}

        {/* Progress */}
        {!isMilestone && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>% Avance — {progress}%</label>
            <div style={{ position: 'relative', height: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range" min={0} max={100} value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--teal)' }}
              />
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--text-1)',
                fontFamily: 'JetBrains Mono, monospace', minWidth: 36, textAlign: 'right',
              }}>{progress}%</span>
            </div>
            {/* Progress bar visual */}
            <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', marginTop: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--teal)', borderRadius: 2, transition: 'width .15s' }} />
            </div>
          </div>
        )}

        {/* CPM Info box */}
        <div style={{
          marginBottom: 20, padding: '12px 14px',
          background: task.critical ? `${COLORS.critical}10` : 'var(--surface-2)',
          border: `1px solid ${task.critical ? COLORS.critical + '30' : 'var(--border)'}`,
          borderRadius: 8, fontSize: 13,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            Análisis CPM
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Ruta crítica</div>
              <div style={{ fontWeight: 700, color: task.critical ? COLORS.critical : COLORS.done }}>
                {task.critical ? '● Sí' : '○ No'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Holgura total</div>
              <div style={{ fontWeight: 700, color: task.float > 0 ? 'var(--text-1)' : COLORS.critical }}>
                {task.float}d
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Inicio más temprano</div>
              <div style={{ color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>día {task.es}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Fin más tardío</div>
              <div style={{ color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>día {task.lf}</div>
            </div>
          </div>
        </div>

        {/* Predecessors */}
        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Depende de</label>
          {predecessors.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', padding: '6px 0', marginBottom: 6 }}>
              Sin predecesoras
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {predecessors.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8,
                border: '1px solid var(--border)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: p.critical ? COLORS.critical : COLORS.normal,
                }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{p.duration}d</span>
                <button
                  onClick={() => onRemoveDep(p.id, task.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 4px', borderRadius: 4, lineHeight: 1 }}
                  title="Eliminar dependencia"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          {availablePreds.length > 0 && (
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) { onAddDep(e.target.value, task.id); e.target.value = '' } }}
              style={{ ...inputStyle, color: 'var(--text-2)' }}
            >
              <option value="">+ Agregar predecesora…</option>
              {availablePreds.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={save}
          disabled={saving}
          className="btn btn-primary"
          style={{ width: '100%', height: 40, fontSize: 14, fontWeight: 600 }}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ── SVG Dependency Arrows ─────────────────────────────────
type Arrow = {
  x1: number; y1: number; x2: number; y2: number
  cx1: number; cx2: number; color: string; dashed: boolean; id: string
}

function DependencyArrows({ ganttTasks, deps, dayW, rowH }: {
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
    const color = bothCritical ? COLORS.critical : '#606070'
    const dashed = !bothCritical

    const dx = Math.abs(x2 - x1)
    const cx1 = x1 + Math.min(32, dx / 2)
    const cx2 = x2 - Math.min(32, dx / 2)

    return { x1, y1, x2, y2, cx1, cx2, color, dashed, id: dep.id }
  }).filter((a): a is Arrow => a !== null)

  const totalH = ganttTasks.length * rowH

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: totalH, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="arr-n" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#606070" />
        </marker>
        <marker id="arr-c" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill={COLORS.critical} />
        </marker>
      </defs>
      {arrows.map(a => (
        <path
          key={a.id}
          d={`M ${a.x1} ${a.y1} C ${a.cx1} ${a.y1}, ${a.cx2} ${a.y2}, ${a.x2} ${a.y2}`}
          fill="none"
          stroke={a.color}
          strokeWidth={a.dashed ? 1.5 : 2}
          strokeDasharray={a.dashed ? '6 4' : undefined}
          markerEnd={a.dashed ? 'url(#arr-n)' : 'url(#arr-c)'}
          opacity={0.9}
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
  const daysLate      = differenceInCalendarDays(new Date(), projEndDate)

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-1)', flexShrink: 0 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', cursor: 'pointer', userSelect: 'none' }}
        onClick={onToggle}
      >
        {collapsed ? <ChevronRight size={13} color="var(--text-3)" /> : <ChevronDown size={13} color="var(--text-3)" />}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
          Ruta Crítica
        </span>
        <span style={{
          background: COLORS.critical + '22', color: COLORS.critical,
          borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 700,
        }}>
          {criticalTasks.length} tareas
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-2)', marginLeft: 4 }}>
          Fin proyectado:&nbsp;
          <strong style={{ color: 'var(--text-1)' }}>
            {format(projEndDate, 'd MMM yyyy', { locale: es })}
          </strong>
        </span>
        {daysLate > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: COLORS.critical, marginLeft: 4 }}>
            <AlertTriangle size={12} /> {daysLate}d de retraso
          </span>
        )}
      </div>
      {!collapsed && criticalTasks.length > 0 && (
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 8px', flexWrap: 'wrap' }}>
          {criticalTasks.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', background: COLORS.critical + '18',
              border: `1px solid ${COLORS.critical}30`, borderRadius: 5, fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{i + 1}.</span>
              <span style={{ color: 'var(--text-1)' }}>{t.name}</span>
              <span style={{ color: COLORS.critical, fontSize: 11, fontWeight: 600 }}>{t.duration}d</span>
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

export function GanttChart({ tasks, projectId, projectName = '', onTaskCreated }: GanttChartProps) {
  const [dayW,          setDayW]          = useState<ZoomLevel>(32)
  const [deps,          setDeps]          = useState<TaskDependency[]>([])
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [tooltip,       setTooltip]       = useState<{ task: GanttTask; x: number; y: number } | null>(null)
  const [critCollapsed, setCritCollapsed] = useState(false)
  const [dragState,     setDragState]     = useState<{
    taskId: string; startX: number; origDuration: number; currentDuration: number
  } | null>(null)
  const [localDurations, setLocalDurations] = useState<Record<string, number>>({})
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const leftRowsRef   = useRef<HTMLDivElement>(null)

  const LEFT_W = 300

  // Load dependencies
  useEffect(() => {
    if (!projectId) return
    fetchTaskDependencies(projectId).then(setDeps).catch(console.error)
  }, [projectId])

  // Project start: earliest start_date across tasks
  const projectStart = useMemo(() => {
    const dates = tasks.filter(t => t.start_date).map(t => parseISO(t.start_date!)).filter(isValid)
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
  const totalDays = useMemo(() => Math.max(...ganttTasks.map(t => t.ef), 60) + 14, [ganttTasks])
  const totalW    = totalDays * dayW

  // Build header day entries (every 7 days show "dd MMM" label)
  const headerDays = useMemo(() => {
    const days: { date: Date; isMonthStart: boolean; isWeekStart: boolean }[] = []
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(projectStart, i)
      days.push({ date: d, isMonthStart: d.getDate() === 1, isWeekStart: d.getDay() === 1 })
    }
    return days
  }, [totalDays, projectStart])

  // Month label spans
  const monthHeaders = useMemo(() => {
    const months: { label: string; startDay: number; spanDays: number }[] = []
    let cur = { label: '', startDay: 0, spanDays: 0 }
    headerDays.forEach(({ date }, i) => {
      const label = format(date, 'MMM yyyy', { locale: es })
      if (label !== cur.label) {
        if (cur.label) months.push(cur)
        cur = { label, startDay: i, spanDays: 1 }
      } else {
        cur.spanDays++
      }
    })
    if (cur.label) months.push(cur)
    return months
  }, [headerDays])

  // Week spans (for "dd MMM" labels in day row)
  const weekLabels = useMemo(() => {
    const labels: { label: string; startDay: number }[] = []
    for (let i = 0; i < totalDays; i += 7) {
      const d = addDays(projectStart, i)
      labels.push({ label: format(d, 'd MMM', { locale: es }), startDay: i })
    }
    return labels
  }, [totalDays, projectStart])

  const todayOffset = differenceInCalendarDays(new Date(), projectStart)
  const todayX      = todayOffset * dayW

  // Sync left/right vertical scroll
  const onRightScroll = useCallback(() => {
    if (rightPanelRef.current && leftRowsRef.current) {
      leftRowsRef.current.scrollTop = rightPanelRef.current.scrollTop
    }
  }, [])

  // Scroll to today on mount
  useEffect(() => {
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollLeft = Math.max(0, todayX - 300)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Resize drag
  const onResizeStart = useCallback((e: React.MouseEvent, taskId: string, currentDuration: number) => {
    e.stopPropagation(); e.preventDefault()
    const startX = e.clientX
    setDragState({ taskId, startX, origDuration: currentDuration, currentDuration })

    const move = (ev: MouseEvent) => {
      const deltaDays = Math.round((ev.clientX - startX) / dayW)
      const newDur = Math.max(1, currentDuration + deltaDays)
      setDragState(prev => prev ? { ...prev, currentDuration: newDur } : null)
      setLocalDurations(prev => ({ ...prev, [taskId]: newDur }))
    }
    const up = () => {
      setDragState(prev => {
        if (prev) {
          const task = tasks.find(t => t.id === prev.taskId)
          if (task && task.start_date) {
            const newEnd = format(addDays(parseISO(task.start_date), prev.currentDuration), 'yyyy-MM-dd')
            updateTaskGantt(prev.taskId, { end_date: newEnd }).catch(console.error)
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

  const handleTaskUpdate = useCallback(async (id: string, patch: Partial<Task>) => {
    await updateTaskGantt(id, {
      start_date: patch.start_date ?? undefined,
      end_date:   patch.end_date   ?? undefined,
      progress:   patch.progress,
      is_milestone: patch.is_milestone,
    })
    if (patch.end_date && patch.start_date) {
      const dur = differenceInCalendarDays(parseISO(patch.end_date), parseISO(patch.start_date))
      setLocalDurations(prev => ({ ...prev, [id]: Math.max(1, dur) }))
    }
    setTimeout(() => setLocalDurations(prev => { const n = { ...prev }; delete n[id]; return n }), 600)
  }, [])

  const handleAddDep = useCallback(async (predId: string, succId: string) => {
    try {
      const newDep = await createTaskDependency(projectId, predId, succId)
      setDeps(prev => [...prev, newDep])
    } catch (e) { console.error(e) }
  }, [projectId])

  const handleRemoveDep = useCallback(async (predId: string, succId: string) => {
    try {
      await deleteTaskDependency(predId, succId)
      setDeps(prev => prev.filter(d => !(d.predecessor_id === predId && d.successor_id === succId)))
    } catch (e) { console.error(e) }
  }, [])

  const selectedTask = ganttTasks.find(t => t.id === selectedId) ?? null

  const barColor = (gt: GanttTask) => {
    if (gt.originalTask.status === 'done') return COLORS.done
    if (gt.critical) return COLORS.critical
    return COLORS.normal
  }

  if (tasks.length === 0) {
    return (
      <div className="empty" style={{ marginTop: 64 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
        <p className="t">Sin tareas para mostrar</p>
        <p className="d">Agregá tareas al proyecto para visualizarlas en el Gantt.</p>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => onTaskCreated?.()}>
          <Plus size={14} /> Agregar primera tarea
        </button>
      </div>
    )
  }

  const totalBodyH = ganttTasks.length * ROW_H

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, background: 'var(--surface-1)',
      }} className="no-print">
        <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 500, marginRight: 4 }}>{projectName}</span>
        <div style={{ width: 1, height: 16, background: 'var(--border)', marginRight: 2 }} />

        <button className="btn btn-secondary btn-sm btn-icon" title="Reducir zoom"
          onClick={() => setDayW(w => { const i = ZOOM_LEVELS.indexOf(w); return i > 0 ? ZOOM_LEVELS[i - 1] : w })}>
          <ZoomOut size={13} />
        </button>
        <button className="btn btn-secondary btn-sm btn-icon" title="Aumentar zoom"
          onClick={() => setDayW(w => { const i = ZOOM_LEVELS.indexOf(w); return i < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[i + 1] : w })}>
          <ZoomIn size={13} />
        </button>
        <button className="btn btn-secondary btn-sm"
          onClick={() => { if (rightPanelRef.current) rightPanelRef.current.scrollLeft = Math.max(0, todayX - 300) }}>
          <Target size={13} /> Hoy
        </button>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, marginLeft: 8 }}>
          {([
            { color: COLORS.critical, label: 'Ruta crítica' },
            { color: COLORS.normal,   label: 'Tarea normal' },
            { color: COLORS.done,     label: 'Completada' },
            { color: COLORS.float,    label: 'Holgura disponible' },
            { color: COLORS.milestone, label: 'Hito' },
          ]).map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-3)' }}>
              {l.label === 'Hito'
                ? <span style={{ width: 10, height: 10, background: l.color, transform: 'rotate(45deg)', display: 'inline-block', borderRadius: 1 }} />
                : <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              }
              {l.label}
            </span>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            <Printer size={13} /> Exportar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onTaskCreated?.()}>
            <Plus size={13} /> Agregar tarea
          </button>
        </div>
      </div>

      {/* ── Critical path summary ── */}
      <CriticalPathSummary
        ganttTasks={ganttTasks}
        projectStart={projectStart}
        collapsed={critCollapsed}
        onToggle={() => setCritCollapsed(v => !v)}
      />

      {/* ── Gantt body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Left panel */}
        <div style={{
          width: LEFT_W, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Left header — aligned with month+day rows */}
          <div style={{
            height: HEADER_H, display: 'flex', alignItems: 'flex-end', flexShrink: 0,
            padding: '0 14px 8px', background: 'var(--surface-1)', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>Tarea</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>Días</span>
          </div>
          {/* Task rows */}
          <div ref={leftRowsRef} style={{ overflowY: 'hidden', flex: 1 }}>
            {ganttTasks.map(gt => (
              <div
                key={gt.id}
                style={{
                  height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 14px',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer', gap: 9,
                  background: selectedId === gt.id ? 'var(--surface-2)' : 'transparent',
                  transition: 'background .1s',
                }}
                onClick={() => setSelectedId(id => id === gt.id ? null : gt.id)}
                onMouseEnter={e => { if (selectedId !== gt.id) (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)' }}
                onMouseLeave={e => { if (selectedId !== gt.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: gt.critical ? COLORS.critical : 'transparent',
                  border: gt.critical ? 'none' : '1.5px solid var(--border-hover)',
                  boxShadow: gt.critical ? `0 0 4px ${COLORS.critical}80` : 'none',
                }} />
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--text-1)',
                }}>
                  {gt.originalTask.is_milestone ? '◆ ' : ''}{gt.name}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                  {gt.originalTask.is_milestone ? '◈' : `${gt.duration}d`}
                </span>
              </div>
            ))}
            {/* Add task row */}
            <div
              style={{
                height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 14px',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', gap: 8,
                color: 'var(--text-3)', fontSize: 13,
              }}
              onClick={() => onTaskCreated?.()}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <Plus size={13} />
              <span>Agregar tarea</span>
            </div>
          </div>
        </div>

        {/* Right panel — scrollable timeline */}
        <div
          ref={rightPanelRef}
          onScroll={onRightScroll}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
          className="gantt-right-scroll"
        >
          <div style={{ width: totalW, position: 'relative', minHeight: totalBodyH + HEADER_H + ROW_H }}>

            {/* ── Header: month row + week/day row ── */}
            <div style={{
              position: 'sticky', top: 0, height: HEADER_H,
              background: 'var(--surface-1)', borderBottom: '1px solid var(--border)',
              zIndex: 10, display: 'flex', flexDirection: 'column',
            }}>
              {/* Month row */}
              <div style={{ display: 'flex', height: MONTH_ROW_H, borderBottom: '1px solid var(--border)' }}>
                {monthHeaders.map((m, i) => (
                  <div key={i} style={{
                    width: m.spanDays * dayW, flexShrink: 0, padding: '0 10px',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    color: 'var(--text-2)', letterSpacing: '.06em',
                    display: 'flex', alignItems: 'center',
                    borderRight: '1px solid var(--border)',
                    background: 'var(--surface-1)',
                  }}>
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Week/day row — shows "dd MMM" every 7 days */}
              <div style={{ height: DAY_ROW_H, position: 'relative', overflow: 'hidden' }}>
                {weekLabels.map((wk, i) => {
                  const isThisWeekToday = todayOffset >= wk.startDay && todayOffset < wk.startDay + 7
                  return (
                    <div key={i} style={{
                      position: 'absolute', left: wk.startDay * dayW,
                      width: 7 * dayW, height: DAY_ROW_H,
                      display: 'flex', alignItems: 'center',
                      paddingLeft: 6, fontSize: 11,
                      color: isThisWeekToday ? 'var(--teal)' : 'var(--text-3)',
                      fontWeight: isThisWeekToday ? 700 : 500,
                      borderRight: '1px solid var(--border)',
                      boxSizing: 'border-box',
                    }}>
                      {wk.label}
                    </div>
                  )
                })}

                {/* Individual day tick marks (small) */}
                {headerDays.map(({ date, isMonthStart }, i) => {
                  const isToday   = i === todayOffset
                  const isWeekend = [0, 6].includes(date.getDay())
                  return (
                    <div key={`tick-${i}`} style={{
                      position: 'absolute', left: i * dayW, bottom: 0,
                      width: dayW, height: 8,
                      borderRight: isMonthStart ? '2px solid var(--border)' : '1px solid rgba(255,255,255,.04)',
                      background: isToday ? 'rgba(20,184,166,.15)' : isWeekend ? 'rgba(255,255,255,.015)' : 'transparent',
                      pointerEvents: 'none',
                    }} />
                  )
                })}
              </div>
            </div>

            {/* Weekend shading on body */}
            {headerDays.map(({ date }, i) => {
              const isWeekend = [0, 6].includes(date.getDay())
              return isWeekend ? (
                <div key={`wk-${i}`} style={{
                  position: 'absolute', left: i * dayW, top: HEADER_H,
                  width: dayW, height: totalBodyH,
                  background: 'rgba(255,255,255,.014)', pointerEvents: 'none',
                }} />
              ) : null
            })}

            {/* Today vertical line */}
            {todayOffset >= 0 && todayOffset <= totalDays && (
              <div style={{
                position: 'absolute', left: todayX + dayW / 2, top: 0, bottom: 0,
                width: 2, background: 'var(--teal)', zIndex: 5, pointerEvents: 'none',
              }}>
                <span style={{
                  position: 'absolute', top: HEADER_H + 4, left: 4,
                  fontSize: 9, fontWeight: 700, color: 'var(--teal)',
                  fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.06em',
                }}>HOY</span>
              </div>
            )}

            {/* Row backgrounds */}
            {ganttTasks.map((_, i) => (
              <div key={`row-bg-${i}`} style={{
                position: 'absolute', left: 0, top: HEADER_H + i * ROW_H,
                width: '100%', height: ROW_H,
                background: i % 2 === 1 ? 'rgba(255,255,255,.007)' : 'transparent',
                borderBottom: '1px solid var(--border)',
                pointerEvents: 'none',
              }} />
            ))}

            {/* Dependency arrows */}
            <div style={{ position: 'absolute', top: HEADER_H, left: 0, right: 0, pointerEvents: 'none' }}>
              <DependencyArrows ganttTasks={ganttTasks} deps={deps} dayW={dayW} rowH={ROW_H} />
            </div>

            {/* Task bars */}
            {ganttTasks.map((gt, rowIdx) => {
              const x    = gt.es * dayW
              const barW = Math.max(gt.duration * dayW, gt.originalTask.is_milestone ? 0 : dayW)
              const color = barColor(gt)
              const floatW = gt.float * dayW
              const progressW = (gt.originalTask.progress / 100) * barW
              const isDraggingThis = dragState?.taskId === gt.id
              const top = HEADER_H + rowIdx * ROW_H

              return (
                <div key={gt.id} style={{
                  position: 'absolute', top, height: ROW_H, left: 0, width: totalW, pointerEvents: 'none',
                }}>
                  {/* Float ghost bar */}
                  {gt.float > 0 && !gt.originalTask.is_milestone && (
                    <div style={{
                      position: 'absolute', left: x + barW, top: ROW_H / 2 - 7,
                      width: floatW, height: 14, borderRadius: 3,
                      background: COLORS.float + '30',
                      border: `1.5px dashed ${COLORS.float}80`,
                      pointerEvents: 'none',
                    }} />
                  )}

                  {/* Milestone diamond */}
                  {gt.originalTask.is_milestone ? (
                    <div
                      style={{
                        position: 'absolute', left: x - 10, top: ROW_H / 2 - 10,
                        width: 20, height: 20, transform: 'rotate(45deg)',
                        background: COLORS.milestone, borderRadius: 3,
                        pointerEvents: 'all', cursor: 'pointer',
                        boxShadow: `0 2px 8px ${COLORS.milestone}60`,
                      }}
                      onClick={() => setSelectedId(id => id === gt.id ? null : gt.id)}
                      onMouseEnter={e => { setTooltip({ task: gt, x: e.clientX, y: e.clientY }) }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ) : (
                    /* Task bar */
                    <div
                      style={{
                        position: 'absolute', left: x, top: 7, height: ROW_H - 14,
                        width: barW, borderRadius: 5,
                        background: gt.originalTask.status === 'done'
                          ? COLORS.done + 'CC'
                          : color + '28',
                        border: `1.5px solid ${color}`,
                        pointerEvents: 'all',
                        cursor: isDraggingThis ? 'col-resize' : 'pointer',
                        overflow: 'hidden', display: 'flex', alignItems: 'center',
                        boxShadow: isDraggingThis
                          ? `0 0 0 2px ${color}50`
                          : selectedId === gt.id
                          ? `0 0 0 2px ${color}60, 0 2px 8px ${color}30`
                          : 'none',
                        transition: 'box-shadow .1s',
                      }}
                      onClick={() => { if (!dragState) setSelectedId(id => id === gt.id ? null : gt.id) }}
                      onMouseEnter={e => setTooltip({ task: gt, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {/* Progress fill */}
                      {gt.originalTask.progress > 0 && (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: progressW, background: color + '55',
                          borderRadius: '4px 0 0 4px', pointerEvents: 'none',
                        }} />
                      )}
                      {/* Label */}
                      {barW > 36 && (
                        <span style={{
                          position: 'relative', paddingLeft: 8, paddingRight: 10,
                          fontSize: 12, fontWeight: 600,
                          color: gt.originalTask.status === 'done' ? '#fff' : 'var(--text-1)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                          pointerEvents: 'none',
                        }}>
                          {gt.name}
                        </span>
                      )}
                      {/* Resize handle */}
                      <div
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: 8,
                          cursor: 'col-resize',
                          background: `linear-gradient(to right, transparent, ${color}50)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseDown={e => onResizeStart(e, gt.id, gt.duration)}
                        onMouseEnter={() => setTooltip(null)}
                      >
                        <span style={{ width: 2, height: 12, borderRadius: 1, background: color, opacity: 0.9 }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add task row at bottom */}
            <div
              style={{
                position: 'absolute', top: HEADER_H + ganttTasks.length * ROW_H, left: 0, width: '100%', height: ROW_H,
                display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 8,
                color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
              onClick={() => onTaskCreated?.()}
            />
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

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .gantt-right-scroll { overflow: visible !important; }
        }
      `}</style>
    </div>
  )
}
