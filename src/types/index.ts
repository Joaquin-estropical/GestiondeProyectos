export type AreaId = 'outlet' | 'norte' | 'corp' | 'bodega' | 'plaza'
export type MemberId = 'joa' | 'and' | 'car' | 'sof' | 'die'
export type ProjectId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'p8'
export type TaskStatus = 'curso' | 'pend' | 'rev' | 'block' | 'done'
export type TaskPriority = 'urg' | 'alta' | 'med' | 'baja'
export type ActivityKind = 'done' | 'comment' | 'block' | 'assign' | 'create' | 'move'
export type InboxKind = 'block' | 'risk' | 'summary' | 'load' | 'win' | 'report'

export interface Area {
  id: AreaId
  name: string
  color: string
  icon: string
  slug: string
}

export interface Member {
  id: MemberId
  name: string
  role: string
  short: string
}

export interface Project {
  id: ProjectId
  name: string
  area: AreaId
  due: string
  progress: number
  count: number
}

export interface Task {
  id: string
  code: string
  title: string
  project: ProjectId
  area: AreaId
  assignee: MemberId
  due: string
  priority: TaskPriority
  status: TaskStatus
  time: string
  comments: number
  subtasks: { done: number; total: number }
}

export interface ActivityItem {
  who: MemberId
  action: string
  target: string
  when: string
  kind: ActivityKind
}

export interface InboxItem {
  id: number
  kind: InboxKind
  read: boolean
  title: string
  body: string
  when: string
  target: string | null
}
