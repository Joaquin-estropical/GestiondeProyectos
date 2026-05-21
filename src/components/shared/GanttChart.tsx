import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Plus, ZoomIn, ZoomOut, Target, Printer, AlertTriangle, ChevronDown, ChevronRight, GripVertical, Eye, EyeOff } from 'lucide-react'
import type { Task, TaskDependency, GanttTask } from '@/types'
import { fetchTaskDependencies, updateTaskGantt } from '@/lib/db'
import { useAppStore } from '@/stores/app'
import { format, addDays, differenceInCalendarDays, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Constants ────────────────────────────────────────────
const ROW_H      = 40
const HEADER_H   = 52   // total: 22 (month) + 30 (weeks)
const MONTH_H    = 22
const WEEK_H     = 30
const LEFT_W     = 320

const ZOOM_LEVELS = [18, 28, 44] as const
type ZoomLevel = typeof ZOOM_LEVELS[number]

const C = {
  critical:  '#E04444',
  normal:    '#3B82F6',
  done:      '#22C55E',
  float:     '#93C5FD',
  milestone: '#D97706',
  noScope:   '#6B6B7A',
}

const PLACEHOLDER_DUE = '2099-12-31'

// ─── CPM ─────────────────────────────────────────────────
function calcCPM(tasks: GanttTask[], allDeps: TaskDependency[]): GanttTask[] {
  if (!tasks.length) return tasks
  const m = new Map(tasks.map(t => [t.id, t]))

  // topo sort
  const deg = new Map(tasks.map(t => [t.id, 0]))
  tasks.forEach(t => t.deps.forEach(() => deg.set(t.id, (deg.get(t.id) ?? 0) + 1)))
  const q: string[] = []; deg.forEach((v, k) => { if (!v) q.push(k) })
  const ord: string[] = []
  while (q.length) {
    const id = q.shift()!; ord.push(id)
    tasks.forEach(t => {
      if (t.deps.includes(id)) {
        deg.set(t.id, (deg.get(t.id) ?? 1) - 1)
        if (!deg.get(t.id)) q.push(t.id)
      }
    })
  }

  // forward pass
  ord.forEach(id => {
    const t = m.get(id)!
    t.es = t.deps.length ? Math.max(...t.deps.map(d => m.get(d)?.ef ?? 0)) : 0
    t.ef = t.es + t.duration
  })
  const end = Math.max(...tasks.map(t => t.ef), 0)

  // backward pass
  tasks.forEach(t => { t.lf = end; t.ls = end - t.duration })
  ;[...ord].reverse().forEach(id => {
    const t = m.get(id)!
    tasks.forEach(s => {
      if (s.deps.includes(id)) { t.lf = Math.min(t.lf, s.ls); t.ls = t.lf - t.duration }
    })
    t.float    = t.ls - t.es
  })

  // Criticality: only tasks with real scope, not done, and in a dependency chain
  const inChain = new Set<string>()
  allDeps.forEach(d => { inChain.add(d.predecessor_id); inChain.add(d.successor_id) })
  tasks.forEach(t => {
    if (t.noScope || t.originalTask.status === 'done') {
      t.critical = false
      return
    }
    t.critical = t.float <= 0 && t.duration > 0 && inChain.has(t.id)
  })
  return tasks
}


function toGantt(task: Task, deps: string[], origin: Date): GanttTask {
  const hasStart   = !!(task.start_date && isValid(parseISO(task.start_date)))
  const hasEndDate = !!(task.end_date   && isValid(parseISO(task.end_date)))
  const hasRealDue = !!(task.due && task.due !== PLACEHOLDER_DUE && isValid(parseISO(task.due)))
  const hasRealEnd = hasEndDate || hasRealDue
  const noScope    = hasStart && !hasRealEnd

  const s = hasStart
    ? parseISO(task.start_date!)
    : (hasRealDue ? parseISO(task.due) : parseISO(task.due))
  const e = hasEndDate
    ? parseISO(task.end_date!)
    : hasRealDue
      ? parseISO(task.due)
      : addDays(s, 1)  // noScope fallback: 1-day stub
  const start    = Math.max(0, differenceInCalendarDays(s, origin))
  const duration = task.is_milestone ? 0 : Math.max(1, differenceInCalendarDays(e, s))
  return { id: task.id, name: task.title, start, duration, deps,
    es: start, ef: start + duration, ls: start, lf: start + duration, float: 0, critical: false,
    noScope,
    originalTask: task }
}

// ─── Tooltip ──────────────────────────────────────────────
function Tooltip({ gt, preds, x, y }: { gt: GanttTask; preds: GanttTask[]; x: number; y: number }) {
  const t = gt.originalTask
  const fmt = (d: string | null) => d && isValid(parseISO(d)) ? format(parseISO(d), 'd MMM yyyy', { locale: es }) : '—'
  return (
    <div style={{
      position: 'fixed', left: Math.min(x + 14, window.innerWidth - 280), top: y - 10,
      background: '#18181F', border: '1px solid #2A2A35',
      borderRadius: 10, padding: '12px 16px', zIndex: 9999,
      width: 260, fontSize: 12.5, boxShadow: '0 16px 40px rgba(0,0,0,.7)',
      pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#E8E8EA', marginBottom: 10, lineHeight: 1.3 }}>
        {t.is_milestone ? '◆ ' : ''}{t.title}
      </div>
      {gt.noScope && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 8px', background: 'rgba(217,119,6,.12)', border: '1px solid rgba(217,119,6,.3)', borderRadius: 5, fontSize: 11.5, color: '#F59E0B' }}>
          <AlertTriangle size={12} /> Sin fecha fin definida — clic para asignar
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 5, columnGap: 16, color: '#6B6B7A' }}>
        <span>Inicio</span>     <span style={{ color: '#C8C8D0' }}>{fmt(t.start_date)}</span>
        <span>Fin</span>
        <span style={{ color: gt.noScope ? '#F59E0B' : '#C8C8D0' }}>
          {gt.noScope ? 'sin definir' : fmt(t.end_date ?? t.due)}
        </span>
        <span>Duración</span>
        <span style={{ color: gt.noScope ? '#F59E0B' : '#C8C8D0' }}>
          {gt.noScope ? 's/f' : `${gt.duration}d`}
        </span>
        <span>Holgura</span>
        <span style={{ color: gt.noScope ? '#6B6B7A' : gt.float > 0 ? C.done : C.critical, fontWeight: 600 }}>
          {gt.noScope ? '—' : gt.float > 0 ? `${gt.float}d libres` : 'Sin holgura'}
        </span>
        <span>Avance</span>     <span style={{ color: '#C8C8D0' }}>{t.progress}%</span>
        <span>Crítica</span>
        <span style={{ color: gt.critical ? C.critical : C.done, fontWeight: 700 }}>
          {gt.critical ? '● Sí' : '○ No'}
        </span>
      </div>
      {preds.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #2A2A35', color: '#6B6B7A', fontSize: 12 }}>
          Depende de: <span style={{ color: '#C8C8D0' }}>{preds.map(p => p.name).join(', ')}</span>
        </div>
      )}
    </div>
  )
}

// ─── SVG Arrows ───────────────────────────────────────────
type Arr = { x1:number; y1:number; x2:number; y2:number; cx1:number; cx2:number; color:string; dashed:boolean; id:string }

function Arrows({ tasks, deps, dw, rh }: { tasks: GanttTask[]; deps: TaskDependency[]; dw: number; rh: number }) {
  const idx = useMemo(() => new Map(tasks.map((t, i) => [t.id, i])), [tasks])

  const arrows: Arr[] = deps.map(d => {
    const pi = idx.get(d.predecessor_id), si = idx.get(d.successor_id)
    if (pi === undefined || si === undefined) return null
    const pred = tasks[pi], succ = tasks[si]
    const x1 = (pred.es + pred.duration) * dw, y1 = pi * rh + rh / 2
    const x2 = succ.es * dw,                   y2 = si * rh + rh / 2
    const both = pred.critical && succ.critical
    const color = both ? C.critical : '#484858'
    const dx = Math.abs(x2 - x1)
    return { x1, y1, x2, y2, cx1: x1 + Math.min(36, dx / 2), cx2: x2 - Math.min(36, dx / 2), color, dashed: !both, id: d.id }
  }).filter((a): a is Arr => !!a)

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: tasks.length * rh, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="mn" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0.5 L6,3.5 L0,6.5Z" fill="#484858" /></marker>
        <marker id="mc" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0.5 L6,3.5 L0,6.5Z" fill={C.critical} /></marker>
      </defs>
      {arrows.map(a => (
        <path key={a.id}
          d={`M${a.x1} ${a.y1} C${a.cx1} ${a.y1},${a.cx2} ${a.y2},${a.x2} ${a.y2}`}
          fill="none" stroke={a.color} strokeWidth={a.dashed ? 1.5 : 2}
          strokeDasharray={a.dashed ? '6 4' : undefined}
          markerEnd={a.dashed ? 'url(#mn)' : 'url(#mc)'} />
      ))}
    </svg>
  )
}

// ─── Critical path bar ────────────────────────────────────
function CritBar({ tasks, deps, origin, projectDue, col, onToggle }: { tasks: GanttTask[]; deps: TaskDependency[]; origin: Date; projectDue?: string; col: boolean; onToggle: () => void }) {
  const hasDeps = deps.length > 0
  const crits = tasks.filter(t => t.critical)
  const tasksWithScope = tasks.filter(t => !t.noScope && t.originalTask.status !== 'done')
  const efMax = tasksWithScope.length ? Math.max(...tasksWithScope.map(t => t.ef)) : null
  const end = efMax !== null
    ? addDays(origin, efMax)
    : (projectDue && projectDue !== PLACEHOLDER_DUE && isValid(parseISO(projectDue)) ? parseISO(projectDue) : null)
  const late = end ? differenceInCalendarDays(new Date(), end) : 0

  // Header content varies by state
  const headerContent = !hasDeps ? (
    <>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#5A5A68', textTransform: 'uppercase', letterSpacing: '.08em' }}>Ruta Crítica</span>
      <span style={{ fontSize: 12, color: '#6B6B7A', fontStyle: 'italic' }}>
        Agregá dependencias entre tareas para calcularla
      </span>
      {end && (
        <span style={{ fontSize: 12, color: '#8888A0', marginLeft: 'auto' }}>
          Fin estimado: <strong style={{ color: '#C8C8D0' }}>{format(end, 'd MMM yyyy', { locale: es })}</strong>
        </span>
      )}
    </>
  ) : crits.length === 0 ? (
    <>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#5A5A68', textTransform: 'uppercase', letterSpacing: '.08em' }}>Ruta Crítica</span>
      <span style={{ fontSize: 12, color: '#6B6B7A', fontStyle: 'italic' }}>
        Sin tareas en ruta crítica
      </span>
      {end && (
        <span style={{ fontSize: 12, color: '#8888A0', marginLeft: 'auto' }}>
          Fin: <strong style={{ color: '#C8C8D0' }}>{format(end, 'd MMM yyyy', { locale: es })}</strong>
        </span>
      )}
    </>
  ) : (
    <>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#5A5A68', textTransform: 'uppercase', letterSpacing: '.08em' }}>Ruta Crítica</span>
      <span style={{ background: `${C.critical}20`, color: C.critical, borderRadius: 4, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>
        {crits.length} tareas
      </span>
      {end && (
        <span style={{ fontSize: 12, color: '#8888A0', marginLeft: 4 }}>
          Fin: <strong style={{ color: '#C8C8D0' }}>{format(end, 'd MMM yyyy', { locale: es })}</strong>
        </span>
      )}
      {late > 0 && end && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.critical }}>
          <AlertTriangle size={11} /> {late}d retraso
        </span>
      )}
    </>
  )

  const collapsible = hasDeps && crits.length > 0
  return (
    <div style={{ flexShrink: 0, borderBottom: '1px solid #1E1E28', background: '#0E0E13' }}>
      <div onClick={collapsible ? onToggle : undefined} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', cursor: collapsible ? 'pointer' : 'default', userSelect: 'none' }}>
        {collapsible && (col ? <ChevronRight size={13} color="#5A5A68" /> : <ChevronDown size={13} color="#5A5A68" />)}
        {headerContent}
      </div>
      {collapsible && !col && (
        <div style={{ display: 'flex', gap: 4, padding: '0 16px 8px', flexWrap: 'wrap' }}>
          {crits.map((t, i) => (
            <span key={t.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
              background: `${C.critical}18`, border: `1px solid ${C.critical}30`, borderRadius: 5, fontSize: 12,
            }}>
              <span style={{ color: '#5A5A68', fontSize: 11 }}>{i + 1}.</span>
              <span style={{ color: '#E8E8EA' }}>{t.name}</span>
              <span style={{ color: C.critical, fontWeight: 700, fontSize: 11 }}>{t.duration}d</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────
export interface GanttChartProps {
  tasks: Task[]
  projectId: string
  projectName?: string
  projectDue?: string
  onOpenTask?: (id: string) => void
  onTaskCreated?: () => void
}

export function GanttChart({ tasks, projectId, projectName = '', projectDue, onTaskCreated }: GanttChartProps) {
  const { openTask } = useAppStore()
  const [dw,     setDw]     = useState<ZoomLevel>(28)
  const [deps,   setDeps]   = useState<TaskDependency[]>([])
  const [selId,  setSelId]  = useState<string | null>(null)
  const [tip,    setTip]    = useState<{ gt: GanttTask; x: number; y: number } | null>(null)
  const [critCol, setCritCol] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [drag,   setDrag]   = useState<{ id: string; startX: number; origDur: number; curDur: number } | null>(null)
  const [localDur, setLocalDur] = useState<Record<string, number>>({})
  // Drag-to-reorder
  const [sortOverride, setSortOverride] = useState<string[] | null>(null)
  const dragRowRef = useRef<string | null>(null)
  const dragOverRef = useRef<string | null>(null)

  const rightRef = useRef<HTMLDivElement>(null)
  const leftRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId) return
    fetchTaskDependencies(projectId).then(setDeps).catch(console.error)
  }, [projectId])

  // Filter tasks before plotting:
  //  • require start_date (no temporal anchor → skip)
  //  • hide done tasks unless they are "bridges" (have ≥1 pred AND ≥1 succ in deps)
  //    or showCompleted toggle is on
  const visibleTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.start_date) return false
      if (t.status === 'done' && !showCompleted) {
        const hasPred = deps.some(d => d.successor_id === t.id)
        const hasSucc = deps.some(d => d.predecessor_id === t.id)
        if (!(hasPred && hasSucc)) return false
      }
      return true
    })
  }, [tasks, deps, showCompleted])

  const origin = useMemo(() => {
    const sd = visibleTasks.filter(t => t.start_date).map(t => parseISO(t.start_date!)).filter(isValid)
    if (sd.length) return new Date(Math.min(...sd.map(d => d.getTime())))
    return new Date()
  }, [visibleTasks])

  const ganttTasks = useMemo(() => {
    const dm = new Map<string, string[]>()
    deps.forEach(d => { dm.set(d.successor_id, [...(dm.get(d.successor_id) ?? []), d.predecessor_id]) })
    const taskMap = new Map(visibleTasks.map(t => [t.id, t]))
    let sorted: Task[]
    if (sortOverride) {
      sorted = sortOverride.map(id => taskMap.get(id)).filter(Boolean) as Task[]
      // append any visible tasks not in sortOverride (e.g., newly added)
      visibleTasks.forEach(t => { if (!sortOverride.includes(t.id)) sorted.push(t) })
    } else {
      sorted = visibleTasks.slice().sort((a, b) => a.sort_order - b.sort_order || a.due.localeCompare(b.due))
    }
    const gt = sorted.map(t => {
        const g = toGantt(t, dm.get(t.id) ?? [], origin)
        if (localDur[t.id] !== undefined) { g.duration = localDur[t.id]; g.ef = g.es + g.duration }
        return g
      })
    return calcCPM(gt, deps)
  }, [visibleTasks, deps, origin, localDur, sortOverride])

  const totalDays = useMemo(() => Math.max(...ganttTasks.map(t => t.ef), 60) + 14, [ganttTasks])
  const totalW    = totalDays * dw
  const todayOff  = differenceInCalendarDays(new Date(), origin)
  const todayX    = todayOff * dw

  // Month spans
  const months = useMemo(() => {
    const res: { label: string; start: number; span: number }[] = []
    let cur = { label: '', start: 0, span: 0 }
    for (let i = 0; i < totalDays; i++) {
      const lbl = format(addDays(origin, i), 'MMM yyyy', { locale: es })
      if (lbl !== cur.label) { if (cur.label) res.push(cur); cur = { label: lbl, start: i, span: 1 } }
      else cur.span++
    }
    if (cur.label) res.push(cur)
    return res
  }, [totalDays, origin])

  // Week labels (every 7 days)
  const weeks = useMemo(() => {
    const res: { label: string; start: number }[] = []
    for (let i = 0; i < totalDays; i += 7) res.push({ label: format(addDays(origin, i), 'd MMM', { locale: es }), start: i })
    return res
  }, [totalDays, origin])

  // Sync scroll between left task list and right timeline (vertical)
  const syncScroll = useCallback(() => {
    if (rightRef.current && leftRef.current) leftRef.current.scrollTop = rightRef.current.scrollTop
  }, [])

  useEffect(() => {
    if (rightRef.current) rightRef.current.scrollLeft = Math.max(0, todayX - 280)
  }, []) // eslint-disable-line

  // Resize drag
  const startResize = useCallback((e: React.MouseEvent, taskId: string, dur: number) => {
    e.stopPropagation(); e.preventDefault()
    const sx = e.clientX
    setDrag({ id: taskId, startX: sx, origDur: dur, curDur: dur })
    const mv = (ev: MouseEvent) => {
      const nd = Math.max(1, dur + Math.round((ev.clientX - sx) / dw))
      setDrag(prev => prev ? { ...prev, curDur: nd } : null)
      setLocalDur(prev => ({ ...prev, [taskId]: nd }))
    }
    const up = () => {
      setDrag(prev => {
        if (prev) {
          const t = tasks.find(x => x.id === prev.id)
          if (t?.start_date) {
            const ne = format(addDays(parseISO(t.start_date), prev.curDur), 'yyyy-MM-dd')
            updateTaskGantt(prev.id, { end_date: ne }).catch(console.error)
          }
        }
        return null
      })
      document.removeEventListener('mousemove', mv)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', mv)
    document.addEventListener('mouseup', up)
  }, [dw, tasks])


  // ── Drag-to-reorder handlers ──
  const onRowDragStart = useCallback((id: string) => {
    dragRowRef.current = id
  }, [])

  const onRowDragOver = useCallback((id: string) => {
    if (!dragRowRef.current || dragRowRef.current === id) return
    dragOverRef.current = id
    setSortOverride(prev => {
      const base = prev ?? ganttTasks.map(t => t.id)
      const from = base.indexOf(dragRowRef.current!)
      const to   = base.indexOf(id)
      if (from === -1 || to === -1) return prev
      const next = [...base]
      next.splice(from, 1)
      next.splice(to, 0, dragRowRef.current!)
      return next
    })
  }, [ganttTasks])

  const onRowDrop = useCallback(async () => {
    if (!sortOverride) return
    // Persist new sort_order to DB
    const updates = sortOverride.map((id, i) => updateTaskGantt(id, { sort_order: i }))
    await Promise.all(updates).catch(console.error)
    dragRowRef.current = null
    dragOverRef.current = null
  }, [sortOverride])

  const onRowDragEnd = useCallback(() => {
    dragRowRef.current = null
    dragOverRef.current = null
  }, [])

  const color   = (gt: GanttTask) => gt.originalTask.status === 'done' ? C.done : gt.critical ? C.critical : C.normal

  if (!tasks.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#5A5A68' }}>
        <div style={{ fontSize: 48 }}>📊</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#C8C8D0' }}>Sin tareas para mostrar</div>
        <div style={{ fontSize: 13 }}>Agregá tareas al proyecto para visualizarlas en el Gantt</div>
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => onTaskCreated?.()}>
          <Plus size={14} /> Agregar primera tarea
        </button>
      </div>
    )
  }

  if (!ganttTasks.length) {
    const hiddenDone = tasks.filter(t => t.status === 'done').length
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#5A5A68', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 48 }}>📅</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#C8C8D0' }}>Sin tareas con fechas</div>
        <div style={{ fontSize: 13, maxWidth: 420 }}>
          Ninguna tarea tiene fecha de inicio asignada. Definí la fecha de inicio en las tareas para verlas en el Gantt.
        </div>
        {hiddenDone > 0 && !showCompleted && (
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 4 }} onClick={() => setShowCompleted(true)}>
            <Eye size={13} /> Mostrar {hiddenDone} completada{hiddenDone !== 1 ? 's' : ''}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden', background: '#0A0A0E' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderBottom: '1px solid #1E1E28', flexShrink: 0, background: '#0E0E13' }}>
        <span style={{ fontSize: 13, color: '#8888A0', fontWeight: 600, marginRight: 2 }}>{projectName}</span>
        <div style={{ width: 1, height: 16, background: '#2A2A35' }} />
        <button className="btn btn-secondary btn-sm btn-icon" title="Zoom −"
          onClick={() => setDw(w => { const i = ZOOM_LEVELS.indexOf(w); return i > 0 ? ZOOM_LEVELS[i - 1] : w })}>
          <ZoomOut size={13} />
        </button>
        <button className="btn btn-secondary btn-sm btn-icon" title="Zoom +"
          onClick={() => setDw(w => { const i = ZOOM_LEVELS.indexOf(w); return i < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[i + 1] : w })}>
          <ZoomIn size={13} />
        </button>
        <button className="btn btn-secondary btn-sm"
          onClick={() => { if (rightRef.current) rightRef.current.scrollLeft = Math.max(0, todayX - 280) }}>
          <Target size={13} /> Hoy
        </button>
        <button
          className="btn btn-secondary btn-sm"
          title={showCompleted ? 'Ocultar tareas completadas' : 'Mostrar tareas completadas'}
          onClick={() => setShowCompleted(v => !v)}
        >
          {showCompleted ? <EyeOff size={13} /> : <Eye size={13} />}
          {showCompleted ? 'Ocultar completadas' : 'Mostrar completadas'}
        </button>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: 10, marginLeft: 6 }}>
          {[
            { c: C.critical,  l: 'Ruta crítica',      shape: 'rect' },
            { c: C.normal,    l: 'Normal',             shape: 'rect' },
            { c: C.done,      l: 'Completada',         shape: 'rect' },
            { c: C.float,     l: 'Holgura',            shape: 'rect' },
            { c: C.milestone, l: 'Hito',               shape: 'diamond' },
            { c: C.noScope,   l: 'Sin fecha fin',       shape: 'dashed' },
          ].map(l => (
            <span key={l.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#5A5A68' }}>
              {l.shape === 'diamond'
                ? <span style={{ width: 9, height: 9, background: l.c, transform: 'rotate(45deg)', display: 'inline-block', borderRadius: 1, flexShrink: 0 }} />
                : l.shape === 'dashed'
                ? <span style={{ width: 10, height: 8, borderRadius: 2, border: `1.5px dashed ${l.c}`, background: 'transparent', flexShrink: 0 }} />
                : <span style={{ width: 10, height: 8, borderRadius: 2, background: l.c, flexShrink: 0 }} />}
              {l.l}
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

      {/* ── Critical bar ── */}
      <CritBar tasks={ganttTasks} deps={deps} origin={origin} projectDue={projectDue} col={critCol} onToggle={() => setCritCol(v => !v)} />

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left panel */}
        <div style={{ width: LEFT_W, flexShrink: 0, borderRight: '1px solid #1E1E28', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Left header */}
          <div style={{ height: HEADER_H, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 14px 9px', background: '#0E0E13', borderBottom: '1px solid #1E1E28' }}>
            <span style={{ fontSize: 10.5, color: '#5A5A68', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Tarea</span>
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#5A5A68', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Días</span>
          </div>
          {/* Rows */}
          <div ref={leftRef} style={{ flex: 1, overflowY: 'hidden' }}>
            {ganttTasks.map((gt, _ri) => (
              <div key={gt.id}
                draggable
                onDragStart={() => onRowDragStart(gt.id)}
                onDragOver={e => { e.preventDefault(); onRowDragOver(gt.id) }}
                onDrop={onRowDrop}
                onDragEnd={onRowDragEnd}
                style={{
                  height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 8px 0 6px',
                  borderBottom: '1px solid #141418', cursor: 'pointer', gap: 6, transition: 'background .1s',
                  background: selId === gt.id ? '#1A1A26' : dragOverRef.current === gt.id ? '#1E1E2E' : 'transparent',
                }}
                onClick={() => { setSelId(null); openTask(gt.id) }}
                onMouseEnter={e => { if (selId !== gt.id) (e.currentTarget as HTMLElement).style.background = '#141418' }}
                onMouseLeave={e => { if (selId !== gt.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {/* Drag handle */}
                <span
                  style={{ color: '#3A3A4A', flexShrink: 0, display: 'flex', alignItems: 'center', cursor: 'grab', padding: '0 2px' }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <GripVertical size={12} />
                </span>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: gt.critical ? C.critical : '#2A2A35',
                  boxShadow: gt.critical ? `0 0 5px ${C.critical}90` : 'none',
                }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#D8D8E0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {gt.originalTask.is_milestone ? '◆ ' : ''}{gt.name}
                </span>
                <span
                  title={gt.noScope ? 'Sin fecha fin definida' : undefined}
                  style={{ fontSize: 11, color: gt.noScope ? '#F59E0B' : '#5A5A68', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  {gt.originalTask.is_milestone ? '◈' : gt.noScope ? <><AlertTriangle size={10} /> s/f</> : `${gt.duration}d`}
                </span>
              </div>
            ))}
            {/* Add task */}
            <div
              onClick={() => onTaskCreated?.()}
              style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, cursor: 'pointer', color: '#484858', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#141418'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <Plus size={13} /> Agregar tarea
            </div>
          </div>
        </div>

        {/* Right: scrollable chart */}
        <div ref={rightRef} onScroll={syncScroll}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative', minWidth: 0 }}>
          <div style={{ width: totalW, position: 'relative', minHeight: ganttTasks.length * ROW_H + HEADER_H + ROW_H }}>

            {/* Header */}
            <div style={{ position: 'sticky', top: 0, height: HEADER_H, background: '#0E0E13', borderBottom: '1px solid #1E1E28', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
              {/* Month row */}
              <div style={{ display: 'flex', height: MONTH_H, borderBottom: '1px solid #1A1A22' }}>
                {months.map((m, i) => (
                  <div key={i} style={{
                    width: m.span * dw, flexShrink: 0, padding: '0 10px',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    color: '#686880', letterSpacing: '.06em',
                    display: 'flex', alignItems: 'center',
                    borderRight: '1px solid #1A1A22',
                  }}>
                    {m.label}
                  </div>
                ))}
              </div>
              {/* Week labels row */}
              <div style={{ height: WEEK_H, position: 'relative' }}>
                {weeks.map((wk, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: wk.start * dw, width: 7 * dw, height: WEEK_H,
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                    fontSize: 11.5, fontWeight: 600,
                    color: (todayOff >= wk.start && todayOff < wk.start + 7) ? 'var(--teal)' : '#5A5A6A',
                    borderRight: '1px solid #1A1A22', boxSizing: 'border-box',
                  }}>
                    {wk.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekend shading */}
            {Array.from({ length: totalDays }, (_, i) => {
              const d = addDays(origin, i)
              return [0, 6].includes(d.getDay()) ? (
                <div key={i} style={{ position: 'absolute', left: i * dw, top: HEADER_H, width: dw, height: ganttTasks.length * ROW_H, background: 'rgba(255,255,255,.013)', pointerEvents: 'none' }} />
              ) : null
            })}

            {/* Row stripes */}
            {ganttTasks.map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: 0, top: HEADER_H + i * ROW_H, width: '100%', height: ROW_H,
                background: i % 2 ? 'rgba(255,255,255,.007)' : 'transparent',
                borderBottom: '1px solid #141418', pointerEvents: 'none',
              }} />
            ))}

            {/* Week vertical lines */}
            {weeks.map((wk, i) => (
              <div key={i} style={{ position: 'absolute', left: wk.start * dw, top: HEADER_H, width: 1, height: ganttTasks.length * ROW_H, background: '#1A1A22', pointerEvents: 'none' }} />
            ))}

            {/* Today line */}
            {todayOff >= 0 && todayOff < totalDays && (
              <div style={{ position: 'absolute', left: todayX + dw / 2, top: 0, bottom: 0, width: 2, background: 'var(--teal)', zIndex: 6, pointerEvents: 'none' }}>
                <span style={{ position: 'absolute', top: HEADER_H + 4, left: 5, fontSize: 9, fontWeight: 800, color: 'var(--teal)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '.07em' }}>HOY</span>
              </div>
            )}

            {/* Dependency arrows */}
            <div style={{ position: 'absolute', top: HEADER_H, left: 0, right: 0, pointerEvents: 'none' }}>
              <Arrows tasks={ganttTasks} deps={deps} dw={dw} rh={ROW_H} />
            </div>

            {/* Bars */}
            {ganttTasks.map((gt, ri) => {
              const x  = gt.es * dw
              const bw = Math.max(gt.duration * dw, gt.originalTask.is_milestone ? 0 : dw)
              const c  = color(gt)
              const pw = (gt.originalTask.progress / 100) * bw
              const fw = gt.float * dw
              const dragging = drag?.id === gt.id
              const selected = selId === gt.id

              return (
                <div key={gt.id} style={{ position: 'absolute', top: HEADER_H + ri * ROW_H, height: ROW_H, left: 0, width: totalW, pointerEvents: 'none' }}>
                  {/* Float bar */}
                  {gt.float > 0 && !gt.originalTask.is_milestone && !gt.noScope && (
                    <div style={{
                      position: 'absolute', left: x + bw, top: ROW_H / 2 - 6, width: fw, height: 12, borderRadius: 3,
                      background: `${C.float}25`, border: `1.5px dashed ${C.float}70`, pointerEvents: 'none',
                    }} />
                  )}

                  {/* Milestone diamond */}
                  {gt.originalTask.is_milestone ? (
                    <div style={{
                      position: 'absolute', left: x - 11, top: ROW_H / 2 - 11,
                      width: 22, height: 22, transform: 'rotate(45deg)', background: C.milestone,
                      borderRadius: 3, pointerEvents: 'all', cursor: 'pointer',
                      boxShadow: `0 3px 10px ${C.milestone}60`,
                    }}
                      onClick={() => { setSelId(null); openTask(gt.id) }}
                      onMouseEnter={e => { setTip({ gt, x: e.clientX, y: e.clientY }) }}
                      onMouseLeave={() => setTip(null)}
                    />
                  ) : (
                    /* Task bar */
                    <div style={{
                      position: 'absolute', left: x, top: 7, height: ROW_H - 14, width: bw,
                      borderRadius: 5, overflow: 'hidden', display: 'flex', alignItems: 'center',
                      background: gt.noScope ? 'transparent' : gt.originalTask.status === 'done' ? `${c}CC` : `${c}22`,
                      border: gt.noScope ? `1.5px dashed ${C.noScope}` : `1.5px solid ${c}`,
                      opacity: gt.noScope ? 0.75 : 1,
                      pointerEvents: 'all', cursor: dragging ? 'col-resize' : 'pointer',
                      boxShadow: selected ? `0 0 0 2px ${c}80, 0 4px 12px ${c}30` : dragging ? `0 0 0 2px ${c}50` : 'none',
                      transition: 'box-shadow .1s',
                    }}
                      onClick={() => { if (!drag) { setSelId(null); openTask(gt.id) } }}
                      onMouseEnter={e => { if (!drag) setTip({ gt, x: e.clientX, y: e.clientY }) }}
                      onMouseLeave={() => setTip(null)}
                    >
                      {/* Progress fill */}
                      {gt.originalTask.progress > 0 && (
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pw, background: `${c}55`, borderRadius: '4px 0 0 4px', pointerEvents: 'none' }} />
                      )}
                      {/* Label */}
                      {bw > 32 && (
                        <span style={{
                          position: 'relative', paddingLeft: 8, paddingRight: 10, fontSize: 12, fontWeight: 600,
                          color: gt.originalTask.status === 'done' ? '#fff' : '#E0E0EA',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, pointerEvents: 'none',
                        }}>
                          {gt.name}
                        </span>
                      )}
                      {/* Resize handle */}
                      <div style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0, width: 10,
                        cursor: 'col-resize',
                        background: `linear-gradient(to right, transparent, ${c}60)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                        onMouseDown={e => startResize(e, gt.id, gt.duration)}
                        onMouseEnter={() => setTip(null)}
                      >
                        <span style={{ width: 2, height: 14, borderRadius: 1, background: c, opacity: 0.9 }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add task row at bottom of chart */}
            <div
              onClick={() => onTaskCreated?.()}
              style={{
                position: 'absolute', top: HEADER_H + ganttTasks.length * ROW_H, left: 0, width: '100%', height: ROW_H,
                display: 'flex', alignItems: 'center', paddingLeft: 14, gap: 8,
                color: '#484858', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #141418',
              }}
            />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tip && !drag && (
        <Tooltip gt={tip.gt}
          preds={deps.filter(d => d.successor_id === tip.gt.id).map(d => ganttTasks.find(t => t.id === d.predecessor_id)).filter(Boolean) as GanttTask[]}
          x={tip.x} y={tip.y} />
      )}

      <style>{`@media print { .gantt-toolbar { display: none !important; } }`}</style>
    </div>
  )
}
