import { supabase, supabaseWriter } from './supabase'
import type { Area, Member, Project, Task, Template, TemplateTask, Subtask, Comment, AreaType, TaskPriority, TaskStatus } from '@/types'

// ── helpers ───────────────────────────────────────────────
function normaliseTask(row: Record<string, unknown>): Task {
  const tags = (row.tags as string[]) ?? []
  // helper is stored as "helper:memberId" in tags array for DB compatibility
  const helperTag = tags.find(t => t.startsWith('helper:'))
  const helper    = helperTag ? helperTag.slice(7) : null
  const cleanTags = tags.filter(t => !t.startsWith('helper:'))
  return {
    ...row,
    subtasks:    { done: row.subtasks_done as number, total: row.subtasks_total as number },
    description: (row.description as string | null) ?? null,
    start_date:  (row.start_date  as string | null) ?? null,
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
// MEMBERS
// ═══════════════════════════════════════════════════════════
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('*').order('name')
  if (error) throw error
  return data as Member[]
}

// ═══════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════
export async function fetchProjects(areaId?: string): Promise<Project[]> {
  let q = supabase.from('projects').select('*').order('name')
  if (areaId) q = q.eq('area', areaId)
  const { data, error } = await q
  if (error) throw error
  return data as Project[]
}

export async function createProject(input: {
  name: string; area: string; due?: string; templateId?: string; assignee?: string
}): Promise<Project> {
  const id = 'p-' + Date.now().toString(36)
  const { data, error } = await supabaseWriter
    .from('projects')
    .insert({ id, name: input.name, area: input.area, due: input.due || null, progress: 0, count: 0 })
    .select()
    .single()
  if (error) throw error
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
          assignee: input.assignee ?? 'joa',
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

let taskCounter = 100
export async function createTask(input: {
  title: string; project: string; area: string; assignee: string
  due: string; priority: TaskPriority; description?: string; start_date?: string; helper?: string
}): Promise<Task> {
  taskCounter++
  const id   = 't-' + Date.now().toString(36)
  const code = `OT-${String(taskCounter).padStart(3, '0')}`
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
  if (error) throw error
  await supabaseWriter.rpc('increment_project_count', { pid: input.project }).then(() => {}, () => {})
  return normaliseTask(data as Record<string, unknown>)
}

export async function updateTask(id: string, patch: Partial<{
  title: string; assignee: string; helper: string | null; due: string; priority: TaskPriority
  status: TaskStatus; description: string; start_date: string; tags: string[]
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
