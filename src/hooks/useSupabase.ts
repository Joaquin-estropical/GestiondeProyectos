import { useState, useEffect, useCallback } from 'react'
import {
  fetchAreas, fetchSubAreas, fetchMembers, fetchProjects, fetchTasks,
  fetchSubtasks, fetchComments, fetchTemplates, fetchTemplateTasks
} from '@/lib/db'
import { useAppStore, areaVisible } from '@/stores/app'
import type { Area, SubArea, Member, Project, Task, Subtask, Comment, Template, TemplateTask, AreaType } from '@/types'

type State<T> = { data: T; loading: boolean; error: string | null }

function useQuery<T>(fn: () => Promise<T>, initial: T, deps: unknown[] = []): State<T> & { reload: () => void } {
  const [state, setState] = useState<State<T>>({ data: initial, loading: true, error: null })
  const [tick, setTick]   = useState(0)
  const reload = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null }))
    fn()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(e   => { if (!cancelled) setState(s => ({ ...s, loading: false, error: String(e) })) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { ...state, reload }
}

export const useAreas    = ()                => {
  const access = useAppStore(s => s.accessibleAreaIds)
  const q = useQuery<Area[]>(fetchAreas, [], [])
  return { ...q, data: q.data.filter(a => areaVisible(a.id, access)) }
}
export const useSubAreas = (areaId?: string) => useQuery<SubArea[]>(() => fetchSubAreas(areaId),   [], [areaId])
export const useMembers  = ()                => useQuery<Member[]> (fetchMembers,                  [], [])
export const useProjects = (areaId?: string) => {
  const access = useAppStore(s => s.accessibleAreaIds)
  const q = useQuery<Project[]>(() => fetchProjects(areaId), [], [areaId])
  return { ...q, data: q.data.filter(p => areaVisible(p.area, access)) }
}
export const useTasks    = (filters?: Parameters<typeof fetchTasks>[0]) => {
  const access = useAppStore(s => s.accessibleAreaIds)
  const q = useQuery<Task[]>(() => fetchTasks(filters), [], [JSON.stringify(filters)])
  return { ...q, data: q.data.filter(t => areaVisible(t.area, access)) }
}

export const useSubtasks  = (taskId: string)     => useQuery<Subtask[]> (() => fetchSubtasks(taskId),        [], [taskId])
export const useComments  = (taskId: string)     => useQuery<Comment[]> (() => fetchComments(taskId),        [], [taskId])
export const useTemplates = (areaType?: AreaType) => useQuery<Template[]>(() => fetchTemplates(areaType),     [], [areaType])
export const useTemplateTasks = (templateId: string) =>
  useQuery<TemplateTask[]>(() => fetchTemplateTasks(templateId), [], [templateId])
