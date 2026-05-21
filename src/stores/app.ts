import { create } from 'zustand'
import { fetchTasks, fetchAreas, fetchProjects, updateTaskStatus as dbUpdateTaskStatus } from '@/lib/db'
import type { Task, Area, Project, TaskStatus } from '@/types'
import type { AppUser } from '@/lib/auth'

interface AppState {
  // auth
  currentUser: AppUser
  setCurrentUser: (u: AppUser) => void
  // data
  tasks:        Task[]
  areas:        Area[]
  projects:     Project[]
  tasksLoaded:  boolean
  areasLoaded:  boolean
  // ui
  collapsed:    boolean
  mobileOpen:   boolean
  taskDetailId: string | null
  cmdkOpen:     boolean
  showLanding:  boolean
  // modals
  newAreaOpen:    boolean
  editAreaId:     string | null
  newProjectOpen: boolean
  newProjectAreaId: string | null
  editProjectId:  string | null
  newTaskOpen:    boolean
  newTaskProjectId: string | null
  newTaskAreaId:  string | null
  newTaskDate:    string | null
  // actions: data
  loadTasks:    () => Promise<void>
  loadAreas:    () => Promise<void>
  loadProjects: () => Promise<void>
  refreshAll:   () => Promise<void>
  addTask:      (t: Task)    => void
  addArea:      (a: Area)    => void
  addProject:   (p: Project) => void
  updateTaskStatus: (id: string, status: TaskStatus) => void
  patchTask:    (id: string, patch: Partial<Task>) => void
  removeTask:   (id: string) => void
  removeArea:   (id: string) => void
  removeProject:(id: string) => void
  // actions: ui
  setCollapsed:    (v: boolean)      => void
  setMobileOpen:   (v: boolean)      => void
  openTask:        (id: string)      => void
  closeTask:       ()                => void
  setCmdK:         (v: boolean)      => void
  setShowLanding:  (v: boolean)      => void
  openNewArea:     (editId?: string) => void
  closeNewArea:    ()                => void
  openNewProject:  (areaId?: string) => void
  closeNewProject: ()                => void
  openEditProject: (projectId: string) => void
  closeEditProject: ()               => void
  openNewTask:     (projectId?: string, date?: string, areaId?: string) => void
  closeNewTask:    ()                => void
}

const DEFAULT_USER: AppUser = { id: '', name: '', role: '', short: '', email: '', is_admin: false }

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: DEFAULT_USER,
  setCurrentUser: (u) => set({ currentUser: u }),

  tasks:        [],
  areas:        [],
  projects:     [],
  tasksLoaded:  false,
  areasLoaded:  false,
  collapsed:    false,
  mobileOpen:   false,
  taskDetailId: null,
  cmdkOpen:     false,
  showLanding:  false,
  newAreaOpen:      false,
  editAreaId:       null,
  newProjectOpen:   false,
  newProjectAreaId: null,
  editProjectId:    null,
  newTaskOpen:      false,
  newTaskProjectId: null,
  newTaskAreaId:    null,
  newTaskDate:      null,

  loadTasks: async () => {
    if (get().tasksLoaded) return
    const tasks = await fetchTasks()
    set({ tasks, tasksLoaded: true })
  },
  loadAreas: async () => {
    if (get().areasLoaded) return
    const areas = await fetchAreas()
    set({ areas, areasLoaded: true })
  },
  loadProjects: async () => {
    const projects = await fetchProjects()
    set({ projects })
  },
  refreshAll: async () => {
    const [tasks, areas, projects] = await Promise.all([fetchTasks(), fetchAreas(), fetchProjects()])
    set({ tasks, areas, projects, tasksLoaded: true, areasLoaded: true })
  },

  addTask:    (t) => set(s => ({ tasks:    [...s.tasks,    t], tasksLoaded: true })),
  addArea:    (a) => set(s => ({ areas:    [...s.areas,    a] })),
  addProject: (p) => set(s => ({ projects: [...s.projects, p] })),
  removeArea:    (id) => set(s => ({ areas:    s.areas.filter(a    => a.id !== id) })),
  removeProject: (id) => set(s => ({ projects: s.projects.filter(p => p.id !== id) })),

  updateTaskStatus: (id, status) => {
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t) }))
    dbUpdateTaskStatus(id, status).catch(console.error)
  },
  patchTask: (id, patch) => {
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) }))
  },
  removeTask: (id) => set(s => ({ tasks: s.tasks.filter(t => t.id !== id) })),

  setCollapsed:   (v) => set({ collapsed:   v }),
  setMobileOpen:  (v) => set({ mobileOpen:  v }),
  openTask:       (id) => set({ taskDetailId: id }),
  closeTask:      ()   => set({ taskDetailId: null }),
  setCmdK:        (v) => set({ cmdkOpen:    v }),
  setShowLanding: (v) => set({ showLanding: v }),

  openNewArea:     (editId?) => set({ newAreaOpen: true,    editAreaId:    editId ?? null }),
  closeNewArea:    ()        => set({ newAreaOpen: false,   editAreaId:    null }),
  openNewProject:  (areaId?) => set({ newProjectOpen: true, newProjectAreaId: areaId ?? null }),
  closeNewProject: ()        => set({ newProjectOpen: false,newProjectAreaId: null }),
  openEditProject: (pid)     => set({ editProjectId: pid }),
  closeEditProject: ()       => set({ editProjectId: null }),
  openNewTask:     (pid?, date?, aid?) => set({ newTaskOpen: true, newTaskProjectId: pid ?? null, newTaskAreaId: aid ?? null, newTaskDate: date ?? null }),
  closeNewTask:    ()        => set({ newTaskOpen: false,   newTaskProjectId: null, newTaskAreaId: null, newTaskDate: null }),
}))
