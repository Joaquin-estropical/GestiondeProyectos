import { create } from 'zustand'
import { TASKS } from '@/lib/mock-data'
import type { Task } from '@/types'

interface AppState {
  tasks: Task[]
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
  updateTaskStatus: (id: string, status: Task['status']) => void
}

export const useAppStore = create<AppState>((set) => ({
  tasks: TASKS,
  collapsed: false,
  mobileOpen: false,
  taskDetailId: null,
  cmdkOpen: false,
  showLanding: false,
  setCollapsed: (v) => set({ collapsed: v }),
  setMobileOpen: (v) => set({ mobileOpen: v }),
  openTask: (id) => set({ taskDetailId: id }),
  closeTask: () => set({ taskDetailId: null }),
  setCmdK: (v) => set({ cmdkOpen: v }),
  setShowLanding: (v) => set({ showLanding: v }),
  updateTaskStatus: (id, status) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) })),
}))
