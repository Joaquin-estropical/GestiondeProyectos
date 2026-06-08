import { supabase, supabaseWriter } from './supabase'
import { getLocalUsers } from './auth'
import type { Area, SubArea, SubAreaType, Member, Project, Task, Template, TemplateTask, Subtask, Comment, TaskDependency, DependencyType, AreaType, TaskPriority, TaskStatus, TaskEvent, TaskEventType } from '@/types'

// ── helpers ───────────────────────────────────────────────
function normaliseTask(row: Record<string, unknown>): Task {
  const tags = (row.tags as string[]) ?? []
  const helperTag = tags.find(t => t.startsWith('helper:'))
  const helper    = helperTag ? helperTag.slice(7) : null
  const cleanTags = tags.filter(t => !t.startsWith('helper:'))
  return {
    ...row,
    subtasks:     { done: row.subtasks_done as number, total: row.subtasks_total as number },
    description:  (row.description  as string | null) ?? null,
    start_date:   (row.start_date   as string | null) ?? null,
    end_date:     (row.end_date     as string | null) ?? null,
    progress:     (row.progress     as number)        ?? 0,
    is_milestone: (row.is_milestone as boolean)       ?? false,
    sort_order:   (row.sort_order   as number)        ?? 0,
    helper,
    tags: cleanTags,
  } as Task
}

function encodeHelper(helper: string | null | undefined, tags: string[]): string[] {
  const base = tags.filter(t => !t.startsWith('helper:'))
  return helper ? [...base, `helper:${helper}`] : base
}

// ═══════════════════════════════════════════════════════════
// AREAS
// ═══════════════════════════════════════════════════════════
export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase.from('areas').select('*').order('name')
  if (error) throw error
  return data as Area[]
}

export async function createArea(input: {
  name: string; type: AreaType; color: string; icon: string; description?: string
}): Promise<Area> {
  const slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const id   = slug + '-' + Date.now().toString(36)
  const { data, error } = await supabaseWriter
    .from('areas')
    .insert({ id, slug, ...input })
    .select()
    .single()
  if (error) throw new Error(`${error.message} | code:${error.code} | details:${error.details} | hint:${error.hint}`)
  return data as Area
}

export async function updateArea(id: string, patch: Partial<Pick<Area, 'name' | 'color' | 'icon' | 'description' | 'type'>>): Promise<Area> {
  const { data, error } = await supabaseWriter.from('areas').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Area
}

export async function deleteArea(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('areas').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// SUBAREAS
// ═══════════════════════════════════════════════════════════
export async function fetchSubAreas(areaId?: string): Promise<SubArea[]> {
  let q = supabase.from('subareas').select('*').order('name')
  if (areaId) q = q.eq('area', areaId)
  const { data, error } = await q
  if (error) throw error
  return data as SubArea[]
}

export async function createSubArea(input: {
  name: string; area: string; color: string; icon: string; type?: SubAreaType; description?: string
}): Promise<SubArea> {
  const baseSlug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const slug = `sub-${input.area}-${baseSlug}-${Date.now().toString(36)}`
  const id   = slug
  const { data, error } = await supabaseWriter
    .from('subareas')
    .insert({
      id, slug,
      name:        input.name,
      area:        input.area,
      color:       input.color,
      icon:        input.icon,
      type:        input.type ?? 'general',
      description: input.description ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(`${error.message} | code:${error.code} | details:${error.details} | hint:${error.hint}`)
  return data as SubArea
}

export async function updateSubArea(
  id: string,
  patch: Partial<Pick<SubArea, 'name' | 'color' | 'icon' | 'description' | 'type'>>
): Promise<SubArea> {
  const { data, error } = await supabaseWriter.from('subareas').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as SubArea
}

export async function deleteSubArea(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('subareas').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════════════
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('*').order('name')
  if (error) throw error
  const dbMembers = (data as Member[]) ?? []
  // Merge local users so users added locally (e.g. Raquel) always appear
  const localUsers = getLocalUsers()
  const dbIds = new Set(dbMembers.map(m => m.id))
  const localExtras: Member[] = localUsers
    .filter(u => !dbIds.has(u.memberId))
    .map(u => ({ id: u.memberId, name: u.name, role: u.role, short: u.short }))
  return [...dbMembers, ...localExtras].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

// ═══════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════
export async function fetchProjects(areaId?: string, subareaId?: string): Promise<Project[]> {
  let q = supabase.from('projects').select('*').order('name')
  if (areaId)    q = q.eq('area', areaId)
  if (subareaId) q = q.eq('subarea', subareaId)
  const { data, error } = await q
  if (error) throw error
  return data as Project[]
}

export async function createProject(input: {
  name: string; area: string; areaType?: string; subarea?: string | null; due?: string; templateId?: string; assignee?: string
}): Promise<Project> {
  const id = 'p-' + Date.now().toString(36)
  // Sub-areas only apply to edificio type areas
  const subarea = input.areaType === 'edificio' ? (input.subarea ?? null) : null
  const { data, error } = await supabaseWriter
    .from('projects')
    .insert({
      id,
      name:     input.name,
      area:     input.area,
      subarea,
      due:      input.due || '2099-12-31',
      progress: 0,
      count:    0,
    })
    .select()
    .single()
  if (error) throw new Error(`${error.message} | code:${error.code} | hint:${error.hint ?? ''} | details:${error.details ?? ''}`)
  const project = data as Project

  if (input.templateId) {
    const { data: tplTasks } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', input.templateId)
      .order('sort_order')

    if (tplTasks && tplTasks.length > 0) {
      const startDate = new Date(input.due ?? new Date().toISOString().slice(0, 10))
      const tasksToInsert = (tplTasks as TemplateTask[]).map((tt, i) => {
        const due = new Date(startDate)
        due.setDate(due.getDate() - (30 - tt.day_offset))
        return {
          id:       `t-${Date.now().toString(36)}-${i}`,
          code:     `OT-${Math.floor(Math.random() * 900) + 100}`,
          title:    tt.title,
          project:  project.id,
          area:     input.area,
          assignee: input.assignee ?? '',
          due:      due.toISOString().split('T')[0],
          priority: tt.priority,
          status:   'pend' as TaskStatus,
          time:     '0h',
          comments: 0,
          subtasks_done:  0,
          subtasks_total: 0,
          helper:   null,
        }
      })
      await supabaseWriter.from('tasks').insert(tasksToInsert)
      await supabaseWriter.from('projects').update({ count: tasksToInsert.length }).eq('id', project.id)
    }
  }
  return project
}

export async function updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'due' | 'progress'>>): Promise<void> {
  const { error } = await supabaseWriter.from('projects').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('projects').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════
export async function fetchTasks(filters?: {
  areaId?: string; projectId?: string; assigneeId?: string; status?: string
}): Promise<Task[]> {
  let q = supabase.from('tasks').select('*').order('due')
  if (filters?.areaId)     q = q.eq('area', filters.areaId)
  if (filters?.projectId)  q = q.eq('project', filters.projectId)
  if (filters?.assigneeId) q = q.eq('assignee', filters.assigneeId)
  if (filters?.status)     q = q.eq('status', filters.status)
  const { data, error } = await q
  if (error) throw error
  return (data as Record<string, unknown>[]).map(normaliseTask)
}

export async function createTask(input: {
  title: string; project: string; area: string; assignee: string
  due: string; priority: TaskPriority; description?: string; start_date?: string; helper?: string
}): Promise<Task> {
  const ts   = Date.now()
  const id   = 't-' + ts.toString(36)
  const code = `OT-${ts.toString(36).slice(-5).toUpperCase()}`
  const row = {
    id, code,
    title:       input.title,
    project:     input.project,
    area:        input.area,
    assignee:    input.assignee,
    due:         input.due,
    priority:    input.priority,
    status:      'pend' as TaskStatus,
    time:        '0h',
    comments:    0,
    subtasks_done:  0,
    subtasks_total: 0,
    description: input.description ?? null,
    start_date:  input.start_date  ?? null,
    tags:        encodeHelper(input.helper, []),
  }
  const { data, error } = await supabaseWriter.from('tasks').insert(row).select().single()
  if (error) throw new Error(`${error.message} | code:${error.code} | hint:${error.hint ?? ''} | details:${error.details ?? ''}`)
  await supabaseWriter.rpc('increment_project_count', { pid: input.project }).then(() => {}, () => {})
  return normaliseTask(data as Record<string, unknown>)
}

export async function updateTask(id: string, patch: Partial<{
  title: string; assignee: string; helper: string | null; due: string; priority: TaskPriority
  status: TaskStatus; description: string; start_date: string; end_date: string
  progress: number; is_milestone: boolean; sort_order: number; tags: string[]
}>): Promise<void> {
  const { helper, tags, ...rest } = patch
  // encode helper into tags if either is being updated
  const dbPatch: Record<string, unknown> = { ...rest }
  if (helper !== undefined || tags !== undefined) {
    // need current tags to merge — fetch them
    const { data } = await supabase.from('tasks').select('tags').eq('id', id).single()
    const currentTags = (data as { tags: string[] } | null)?.tags ?? []
    dbPatch.tags = encodeHelper(
      helper !== undefined ? helper : currentTags.find((t: string) => t.startsWith('helper:'))?.slice(7) ?? null,
      tags !== undefined ? tags : currentTags.filter((t: string) => !t.startsWith('helper:'))
    )
  }
  const { error } = await supabaseWriter.from('tasks').update(dbPatch).eq('id', id)
  if (error) throw error
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabaseWriter.from('tasks').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// SUBTASKS
// ═══════════════════════════════════════════════════════════
export async function fetchSubtasks(taskId: string): Promise<Subtask[]> {
  const { data, error } = await supabase
    .from('subtasks').select('*').eq('task_id', taskId).order('sort_order')
  if (error) throw error
  return data as Subtask[]
}

export async function createSubtask(taskId: string, title: string): Promise<Subtask> {
  const { data: existing } = await supabase.from('subtasks').select('id').eq('task_id', taskId)
  const order = existing?.length ?? 0
  const { data, error } = await supabaseWriter
    .from('subtasks')
    .insert({ id: 's-' + Date.now().toString(36), task_id: taskId, title, sort_order: order })
    .select().single()
  if (error) throw error
  await supabaseWriter.from('tasks').update({ subtasks_total: order + 1 }).eq('id', taskId)
  return data as Subtask
}

export async function toggleSubtask(id: string, done: boolean, taskId: string): Promise<void> {
  const { error } = await supabaseWriter.from('subtasks').update({ done }).eq('id', id)
  if (error) throw error
  const { data } = await supabase.from('subtasks').select('done').eq('task_id', taskId)
  if (data) {
    const doneCount = data.filter(s => s.done).length
    await supabaseWriter.from('tasks').update({ subtasks_done: doneCount }).eq('id', taskId)
  }
}

// ═══════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════
export async function fetchComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments').select('*').eq('task_id', taskId).order('created_at')
  if (error) throw error
  return data as Comment[]
}

export async function createComment(taskId: string, author: string, body: string): Promise<Comment> {
  const { data, error } = await supabaseWriter
    .from('comments')
    .insert({ id: 'c-' + Date.now().toString(36), task_id: taskId, author, body })
    .select().single()
  if (error) throw error
  await supabaseWriter.rpc('increment_task_comments', { tid: taskId }).then(() => {}, () => {})
  return data as Comment
}

// ═══════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════
export async function fetchTemplates(areaType?: AreaType): Promise<Template[]> {
  let q = supabase.from('templates').select('*').order('name')
  if (areaType) q = q.eq('area_type', areaType)
  const { data, error } = await q
  if (error) throw error
  return data as Template[]
}

export async function fetchTemplateTasks(templateId: string): Promise<TemplateTask[]> {
  const { data, error } = await supabase
    .from('template_tasks').select('*').eq('template_id', templateId).order('sort_order')
  if (error) throw error
  return data as TemplateTask[]
}

export async function createTemplate(input: { name: string; area_type: AreaType; description?: string }): Promise<Template> {
  const { data, error } = await supabaseWriter
    .from('templates')
    .insert({ id: 'tpl-' + Date.now().toString(36), ...input })
    .select().single()
  if (error) throw error
  return data as Template
}

export async function createTemplateTask(
  templateId: string, title: string, priority: TaskPriority, dayOffset: number, order: number,
  opts?: { phaseName?: string | null; durationDays?: number }
): Promise<TemplateTask> {
  const { data, error } = await supabaseWriter
    .from('template_tasks')
    .insert({
      id: 'tt-' + Date.now().toString(36),
      template_id:   templateId,
      title,
      priority,
      day_offset:    dayOffset,
      sort_order:    order,
      phase_name:    opts?.phaseName    ?? null,
      duration_days: opts?.durationDays ?? 1,
    })
    .select().single()
  if (error) throw error
  return data as TemplateTask
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('templates').delete().eq('id', id)
  if (error) throw error
}

export async function deleteTemplateTask(id: string): Promise<void> {
  const { error } = await supabaseWriter.from('template_tasks').delete().eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// TASK DEPENDENCIES
// ═══════════════════════════════════════════════════════════
export async function fetchTaskDependencies(projectId: string): Promise<TaskDependency[]> {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*')
    .eq('project_id', projectId)
  if (error) throw error
  return data as TaskDependency[]
}

export async function createTaskDependency(
  projectId: string,
  predecessorId: string,
  successorId: string,
  type: DependencyType = 'finish_to_start'
): Promise<TaskDependency> {
  const { data, error } = await supabaseWriter
    .from('task_dependencies')
    .insert({ project_id: projectId, predecessor_id: predecessorId, successor_id: successorId, type })
    .select()
    .single()
  if (error) throw error
  return data as TaskDependency
}

export async function deleteTaskDependency(predecessorId: string, successorId: string): Promise<void> {
  const { error } = await supabaseWriter
    .from('task_dependencies')
    .delete()
    .eq('predecessor_id', predecessorId)
    .eq('successor_id', successorId)
  if (error) throw error
}

export async function updateTaskGantt(
  id: string,
  patch: { start_date?: string; end_date?: string; progress?: number; is_milestone?: boolean; sort_order?: number }
): Promise<void> {
  const { error } = await supabaseWriter.from('tasks').update(patch).eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════
// TASK EVENTS (historial de cambios)
// ═══════════════════════════════════════════════════════════

export async function fetchTaskEvents(taskId: string): Promise<TaskEvent[]> {
  const { data, error } = await supabase
    .from('task_events')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as TaskEvent[]
}

export async function createTaskEvent(input: {
  task_id: string
  user_id: string
  event_type: TaskEventType
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  reason?: string
}): Promise<void> {
  const { error } = await supabaseWriter.from('task_events').insert({
    task_id:    input.task_id,
    user_id:    input.user_id,
    event_type: input.event_type,
    old_value:  input.old_value  ?? null,
    new_value:  input.new_value  ?? null,
    reason:     input.reason     ?? null,
  })
  if (error) throw error
}
