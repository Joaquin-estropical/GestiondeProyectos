import { useState, useEffect } from 'react'
import { fetchAreas, fetchMembers, fetchProjects, fetchTasks } from '@/lib/db'
import type { Area, Member, Project, Task } from '@/types'

type State<T> = { data: T | null; loading: boolean; error: string | null }

function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null })
  useEffect(() => {
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null }))
    fn()
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }) })
      .catch(e  => { if (!cancelled) setState({ data: null, loading: false, error: String(e) }) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export const useAreas    = ()            => useQuery<Area[]>   (fetchAreas,                   [])
export const useMembers  = ()            => useQuery<Member[]> (fetchMembers,                 [])
export const useProjects = (areaId?: string) => useQuery<Project[]>(()  => fetchProjects(areaId), [areaId])
export const useTasks    = (filters?: Parameters<typeof fetchTasks>[0]) =>
  useQuery<Task[]>(() => fetchTasks(filters), [JSON.stringify(filters)])
