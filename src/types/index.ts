// ── Primitivos ────────────────────────────────────────────
export type AreaType     = 'sucursal' | 'outlet' | 'edificio' | 'bodega' | 'general' | 'otros'
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
  id:           string
  code:         string
  title:        string
  project:      string
  area:         string
  assignee:     string
  helper:       string | null
  due:          string
  priority:     TaskPriority
  status:       TaskStatus
  time:         string
  comments:     number
  subtasks:     { done: number; total: number }
  description:  string | null
  start_date:   string | null
  end_date:     string | null
  progress:     number        // 0–100
  is_milestone: boolean
  sort_order:   number
  tags:         string[]
}

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish'

export interface TaskDependency {
  id:             string
  project_id:     string
  predecessor_id: string
  successor_id:   string
  type:           DependencyType
  created_at:     string
}

// ── Gantt CPM types ───────────────────────────────────────
export interface GanttTask {
  id:          string
  name:        string
  start:       number   // days from project start (day 0)
  duration:    number   // days
  deps:        string[] // predecessor ids
  // computed by CPM:
  es:          number
  ef:          number
  ls:          number
  lf:          number
  float:       number
  critical:    boolean
  // display metadata
  originalTask: Task
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
  id:            string
  template_id:   string
  title:         string
  priority:      TaskPriority
  day_offset:    number
  sort_order:    number
  phase_name:    string | null    // milestone/section grouping, e.g. "Área Legal"
  duration_days: number           // how many days this task spans
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

// ── Planillas (checklist de recepción/entrega de locales) ──

export type ChecklistType      = 'reception' | 'delivery'
export type ChecklistStatus    = 'pending' | 'in_progress' | 'completed'
export type ItemCondition      = 'good' | 'fair' | 'poor'
export type ChecklistItemDelta = 'improved' | 'same' | 'worsened' | 'pending'
export type TemplateKind       = 'event_delivery' | 'branch_delivery' | 'local_return' | 'custom'

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  event_delivery:  'Entrega de local (eventos)',
  branch_delivery: 'Entrega de sucursal',
  local_return:    'Devolución de local',
  custom:          'Personalizada',
}

export const DEFAULT_CATEGORIES = [
  'Mobiliario',
  'Telas y textiles',
  'Decoración',
  'Iluminación',
  'Audiovisual',
  'Instalaciones',
] as const

export interface ChecklistTemplate {
  id:          string
  name:        string
  description: string | null
  kind:        TemplateKind
  created_at:  string
  updated_at:  string
}

export interface TemplateItem {
  id:          string
  template_id: string
  name:        string
  category:    string
  sort_order:  number
  created_at:  string
}

export interface EventChecklist {
  id:                  string
  event_id:            string
  type:                ChecklistType
  status:              ChecklistStatus
  template_id:         string | null
  title:               string | null
  assigned_to_project: string | null
  assigned_to_area:    string | null
  completed_at:        string | null
  created_at:          string
}

export interface ChecklistItem {
  id:            string
  checklist_id:  string
  name:          string
  category:      string
  qty:           number | null
  condition_in:  ItemCondition | null
  condition_out: ItemCondition | null
  notes:         string | null
  photos:        string[]
  sort_order:    number
  created_at:    string
}
