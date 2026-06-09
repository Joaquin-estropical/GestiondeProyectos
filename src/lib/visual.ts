// ──────────────────────────────────────────────────────────────────────────
// Lenguaje visual compartido: urgencia de tareas y color de estado.
// Fuente única de verdad para franjas de color, tintes de fondo y puntos de
// estado en Dashboard, Mi día, Calendario y Listas. Funciones puras.
// ──────────────────────────────────────────────────────────────────────────
import { daysFromToday } from './mock-data'

export type Urgency = 'overdue' | 'soon' | 'block' | 'done' | 'normal'

interface TaskLike { status: string; due: string }

/** Clasifica una tarea por urgencia para decidir su acento visual. */
export function taskUrgency(t: TaskLike): Urgency {
  if (t.status === 'done') return 'done'
  if (t.status === 'block') return 'block'
  const d = t.due ? daysFromToday(t.due) : Infinity
  if (d < 0) return 'overdue'
  if (d <= 2) return 'soon'
  return 'normal'
}

export interface Accent {
  /** Color de la franja izquierda (3px). `null` = sin franja. */
  bar:  string | null
  /** Tinte de fondo muy sutil de la fila. `transparent` = sin tinte. */
  tint: string
}

/** Devuelve el acento (franja + tinte) para una urgencia dada. */
export function urgencyAccent(u: Urgency): Accent {
  switch (u) {
    case 'overdue': return { bar: 'var(--red)',   tint: 'rgba(239,68,68,.04)' }
    case 'block':   return { bar: 'var(--red)',   tint: 'rgba(239,68,68,.04)' }
    case 'soon':    return { bar: 'var(--amber)', tint: 'rgba(245,158,11,.04)' }
    case 'done':    return { bar: 'var(--green)', tint: 'transparent' }
    default:        return { bar: null,           tint: 'transparent' }
  }
}

/** Atajo: acento directo desde una tarea. */
export function taskAccent(t: TaskLike): Accent {
  return urgencyAccent(taskUrgency(t))
}

/** Color de estado para puntos / bordes (calendario, badges). */
export function statusColor(status: string): string {
  switch (status) {
    case 'done':  return 'var(--green)'
    case 'block': return 'var(--red)'
    case 'rev':   return 'var(--amber)'
    case 'curso': return 'var(--blue)'
    default:      return 'var(--text-3)' // pend / desconocido
  }
}

/** Color de la franja izquierda por prioridad (Mi día). */
export function priorityBar(priority: string): string {
  switch (priority) {
    case 'urg':  return 'var(--red)'
    case 'alta': return 'var(--amber)'
    case 'med':  return 'var(--blue)'
    default:     return 'var(--text-3)' // baja
  }
}
