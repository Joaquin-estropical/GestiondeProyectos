import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/app'
import type { Task, Area, Project } from '@/types'

// Subscribes to postgres_changes for all key tables and patches the Zustand store.
// Only active when user is logged in.
// NOTE: Supabase realtime may send partial rows on UPDATE — we always merge
// into the existing record rather than replacing it, to avoid undefined fields.
export function useRealtimeSync(enabled: boolean) {
  const { patchTask, addTask, removeTask, addArea, removeArea, addProject, removeProject } = useAppStore()

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('realtime-sync')

      // ── TASKS ──────────────────────────────────────────────
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, ({ new: row }) => {
        const exists = useAppStore.getState().tasks.find(t => t.id === row.id)
        if (!exists) addTask(row as Task)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, ({ new: row }) => {
        // Merge into existing task — Supabase may send partial rows
        patchTask(row.id, row as Partial<Task>)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' }, ({ old: row }) => {
        if (row.id) removeTask(row.id)
      })

      // ── AREAS ──────────────────────────────────────────────
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'areas' }, ({ new: row }) => {
        const exists = useAppStore.getState().areas.find(a => a.id === row.id)
        if (!exists) addArea(row as Area)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'areas' }, ({ new: row }) => {
        // Merge into existing area to preserve fields not included in the realtime payload
        useAppStore.setState(s => ({
          areas: s.areas.map(a => a.id === row.id ? { ...a, ...row } as Area : a)
        }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'areas' }, ({ old: row }) => {
        if (row.id) removeArea(row.id)
      })

      // ── PROJECTS ───────────────────────────────────────────
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, ({ new: row }) => {
        const exists = useAppStore.getState().projects.find(p => p.id === row.id)
        if (!exists) addProject(row as Project)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, ({ new: row }) => {
        // Merge into existing project to preserve fields not included in the realtime payload
        useAppStore.setState(s => ({
          projects: s.projects.map(p => p.id === row.id ? { ...p, ...row } as Project : p)
        }))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, ({ old: row }) => {
        if (row.id) removeProject(row.id)
      })

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
