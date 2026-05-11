// ── Primitivos ────────────────────────────────────────────
export type AreaType     = 'sucursal' | 'outlet' | 'edificio' | 'bodega' | 'general'
export type TaskStatus   = 'curso' | 'pend' | 'rev' | 'block' | 'done'
export type TaskPriority = 'urg' | 'alta' | 'med' | 'baja'
export type ActivityKind = 'done' | 'comment' | 'block' | 'assign' | 'create' | 'move'
export type InboxKind    = 'block' | 'risk' | 'summary' | 'load' | 'win' | 'report'

// IDs ahora son string libres (áreas y proyectos son dinámicos)
export type AreaId    = string
export type MemberId  = string
export type ProjectId = string

// ── Entidades principales ─────────────────────────────────
export interface Area {
  id:          string
  name:        string
  color:       string
  icon:        string
  slug:        string
  type:        AreaType
  description: string | null
  created_at?: string
}

export interface Member {
  id:    string
  name:  string
  role:  string
  short: string
}

export interface Project {
  id:       string
  name:     string
  area:     string
  due:      string
  progress: number
  count:    number
}

export interface Task {
  id:          string
  code:        string
  title:       string
  project:     string
  area:        string
  assignee:    string
  due:         string
  priority:    TaskPriority
  status:      TaskStatus
  time:        string
  comments:    number
  subtasks:    { done: number; total: number }
  description: string | null
  start_date:  string | null
  tags:        string[]
}

// ── Plantillas ────────────────────────────────────────────
export interface Template {
  id:          string
  name:        string
  area_type:   AreaType
  description: string | null
  created_at?: string
}

export interface TemplateTask {
  id:          string
  template_id: string
  title:       string
  priority:    TaskPriority
  day_offset:  number
  sort_order:  number
}

// ── Subtareas y comentarios ───────────────────────────────
export interface Subtask {
  id:         string
  task_id:    string
  title:      string
  done:       boolean
  assignee:   string | null
  sort_order: number
  created_at?: string
}

export interface Comment {
  id:         string
  task_id:    string
  author:     string
  body:       string
  created_at: string
}

export interface ActivityItem {
  who:    string
  action: string
  target: string
  when:   string
  kind:   ActivityKind
}

export interface InboxItem {
  id:     number
  kind:   InboxKind
  read:   boolean
  title:  string
  body:   string
  when:   string
  target: string | null
}
