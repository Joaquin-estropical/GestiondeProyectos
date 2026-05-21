import { create } from 'zustand'
import { fetchTasks, fetchAreas, fetchProjects, fetchSubAreas, updateTaskStatus as dbUpdateTaskStatus } from '@/lib/db'
import type { Task, Area, SubArea, Project, TaskStatus } from '@/types'
import type { AppUser } from '@/lib/auth'

interface AppState {
  // auth
  currentUser: AppUser
  setCurrentUser: (u: AppUser) => void
  accessibleAreaIds: Set<string> | null   // null = no restriction (admin or not loaded)
  setAccessibleAreaIds: (ids: Set<string> | null) => void
  resetSession: () => void
  // data
  tasks:           Task[]
  areas:           Area[]
  subareas:        SubArea[]
  projects:        Project[]
  tasksLoaded:     boolean
  areasLoaded:     boolean
  subAreasLoaded:  boolean
  // ui
  collapsed:    boolean
  mobileOpen:   boolean
  taskDetailId: string | null
  cmdkOpen:     boolean
  showLanding:  boolean
  // modals
  newAreaOpen:    boolean
  editAreaId:     string | null
  newSubAreaOpen:    boolean
  newSubAreaAreaId:  string | null
  editSubAreaId:     string | null
  newProjectOpen: boolean
  newProjectAreaId: string | null
  newProjectSubAreaId: string | null
  editProjectId:  string | null
  newTaskOpen:    boolean
  newTaskProjectId: string | null
  newTaskAreaId:  string | null
  newTaskDate:    string | null
  // actions: data
  loadTasks:    () => Promise<void>
  loadAreas:    () => Promise<void>
  loadSubAreas: () => Promise<void>
  loadProjects: () => Promise<void>
  refreshAll:   () => Promise<void>
  addTask:      (t: Task)    => void
  addArea:      (a: Area)    => void
  addSubArea:   (sa: SubArea) => void
  addProject:   (p: Project) => void
  updateTaskStatus: (id: string, status: TaskStatus) => void
  patchTask:    (id: string, patch: Partial<Task>) => void
  removeTask:   (id: string) => void
  removeArea:   (id: string) => void
  removeSubArea:(id: string) => void
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
  openNewSubArea:  (areaId?: string, editId?: string) => void
  closeNewSubArea: ()                => void
  openNewProject:  (areaId?: string, subareaId?: string) => void
  closeNewProject: ()                => void
  openEditProject: (projectId: string) => void
  closeEditProject: ()               => void
  openNewTask:     (projectId?: string, date?: string, areaId?: string) => void
  closeNewTask:    ()                => void
}

const DEFAULT_USER: AppUser = { id: '', memberId: '', name: '', role: '', short: '', email: '', is_admin: false }

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: DEFAULT_USER,
  setCurrentUser: (u) => set({ currentUser: u }),
  accessibleAreaIds: null,
  setAccessibleAreaIds: (ids) => set({ accessibleAreaIds: ids }),
  resetSession: () => set({
    currentUser: DEFAULT_USER,
    accessibleAreaIds: null,
    tasks: [], areas: [], subareas: [], projects: [],
    tasksLoaded: false, areasLoaded: false, subAreasLoaded: false,
    taskDetailId: null,
  }),

  tasks:           [],
  areas:           [],
  subareas:        [],
  projects:        [],
  tasksLoaded:     false,
  areasLoaded:     false,
  subAreasLoaded:  false,
  collapsed:    false,
  mobileOpen:   false,
  taskDetailId: null,
  cmdkOpen:     false,
  showLanding:  false,
  newAreaOpen:         false,
  editAreaId:          null,
  newSubAreaOpen:      false,
  newSubAreaAreaId:    null,
  editSubAreaId:       null,
  newProjectOpen:      false,
  newProjectAreaId:    null,
  newProjectSubAreaId: null,
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
  loadSubAreas: async () => {
    if (get().subAreasLoaded) return
    try {
      const subareas = await fetchSubAreas()
      set({ subareas, subAreasLoaded: true })
    } catch {
      // table may not exist in older deployments — fail silently
      set({ subareas: [], subAreasLoaded: true })
    }
  },
  loadProjects: async () => {
    const projects = await fetchProjects()
    set({ projects })
  },
  refreshAll: async () => {
    const [tasks, areas, subareas, projects] = await Promise.all([
      fetchTasks(), fetchAreas(),
      fetchSubAreas().catch(() => [] as import('@/types').SubArea[]),
      fetchProjects(),
    ])
    set({ tasks, areas, subareas, projects, tasksLoaded: true, areasLoaded: true, subAreasLoaded: true })
  },

  addTask:    (t)  => set(s => ({ tasks:    [...s.tasks,    t], tasksLoaded: true })),
  addArea:    (a)  => set(s => ({ areas:    [...s.areas,    a] })),
  addSubArea: (sa) => set(s => ({ subareas: [...s.subareas, sa] })),
  addProject: (p)  => set(s => ({ projects: [...s.projects, p] })),
  removeArea:    (id) => set(s => ({ areas:    s.areas.filter(a    => a.id !== id) })),
  removeSubArea: (id) => set(s => ({ subareas: s.subareas.filter(sa => sa.id !== id) })),
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
  openNewSubArea:  (areaId?, editId?) => set({ newSubAreaOpen: true, newSubAreaAreaId: areaId ?? null, editSubAreaId: editId ?? null }),
  closeNewSubArea: ()        => set({ newSubAreaOpen: false, newSubAreaAreaId: null, editSubAreaId: null }),
  openNewProject:  (areaId?, subareaId?) => set({ newProjectOpen: true, newProjectAreaId: areaId ?? null, newProjectSubAreaId: subareaId ?? null }),
  closeNewProject: ()        => set({ newProjectOpen: false, newProjectAreaId: null, newProjectSubAreaId: null }),
  openEditProject: (pid)     => set({ editProjectId: pid }),
  closeEditProject: ()       => set({ editProjectId: null }),
  openNewTask:     (pid?, date?, aid?) => set({ newTaskOpen: true, newTaskProjectId: pid ?? null, newTaskAreaId: aid ?? null, newTaskDate: date ?? null }),
  closeNewTask:    ()        => set({ newTaskOpen: false,   newTaskProjectId: null, newTaskAreaId: null, newTaskDate: null }),
}))
