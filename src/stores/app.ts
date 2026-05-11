import { create } from 'zustand'
import { fetchTasks, updateTaskStatus as dbUpdateTaskStatus } from '@/lib/db'
import type { Task } from '@/types'

interface AppState {
  tasks: Task[]
  tasksLoaded: boolean
  collapsed: boolean
  mobileOpen: boolean
  taskDetailId: string | null
  cmdkOpen: boolean
  showLanding: boolean
  setCollapsed: (v: boolean) => void
  setMobileOpen: (v: boolean) => void
  openTask: (id: string) => void
  closeTask: () => void
  setCmdK: (v: boolean) => void
  setShowLanding: (v: boolean) => void
  loadTasks: () => Promise<void>
  updateTaskStatus: (id: string, status: Task['status']) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  tasksLoaded: false,
  collapsed: false,
  mobileOpen: false,
  taskDetailId: null,
  cmdkOpen: false,
  showLanding: false,
  setCollapsed:    (v) => set({ collapsed: v }),
  setMobileOpen:   (v) => set({ mobileOpen: v }),
  openTask:        (id) => set({ taskDetailId: id }),
  closeTask:       ()  => set({ taskDetailId: null }),
  setCmdK:         (v) => set({ cmdkOpen: v }),
  setShowLanding:  (v) => set({ showLanding: v }),
  loadTasks: async () => {
    if (get().tasksLoaded) return
    const tasks = await fetchTasks()
    set({ tasks, tasksLoaded: true })
  },
  updateTaskStatus: (id, status) => {
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t) }))
    dbUpdateTaskStatus(id, status).catch(console.error)
  },
}))
