// Supabase data fetchers — replace mock-data calls with these
import { supabase } from './supabase'
import type { Area, Member, Project, Task } from '@/types'

export async function fetchAreas(): Promise<Area[]> {
  const { data, error } = await supabase.from('areas').select('*').order('id')
  if (error) throw error
  return data as Area[]
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('*').order('id')
  if (error) throw error
  return data as Member[]
}

export async function fetchProjects(areaId?: string): Promise<Project[]> {
  let q = supabase.from('projects').select('*').order('due')
  if (areaId) q = q.eq('area', areaId)
  const { data, error } = await q
  if (error) throw error
  return data as Project[]
}

export async function fetchTasks(filters?: {
  areaId?: string
  projectId?: string
  assigneeId?: string
  status?: string
}): Promise<Task[]> {
  let q = supabase.from('tasks').select('*').order('due')
  if (filters?.areaId)     q = q.eq('area', filters.areaId)
  if (filters?.projectId)  q = q.eq('project', filters.projectId)
  if (filters?.assigneeId) q = q.eq('assignee', filters.assigneeId)
  if (filters?.status)     q = q.eq('status', filters.status)
  const { data, error } = await q
  if (error) throw error
  // normalise subtasks shape to match local type
  return (data as any[]).map(row => ({
    ...row,
    subtasks: { done: row.subtasks_done, total: row.subtasks_total },
  })) as Task[]
}

export async function updateTaskStatus(id: string, status: Task['status']): Promise<void> {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
  if (error) throw error
}
