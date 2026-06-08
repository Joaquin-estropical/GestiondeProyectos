import { useEffect, useState, Component } from 'react'
import type { ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import './index.css'

// Local boundary that only swallows crashes in overlays (TaskDetail, CmdK).
// Without this, a single overlay crash (e.g. stale ref after realtime DELETE)
// tumbles the whole app via the root ErrorBoundary in main.tsx.
class OverlayBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: Error) { console.error('[OverlayBoundary]', err) }
  render() { return this.state.hasError ? null : this.props.children }
}

import { AppShell }        from '@/components/layout/AppShell'
import { TaskDetail }      from '@/components/shared/TaskDetail'
import { CmdK }            from '@/components/shared/CmdK'
import { NewAreaModal }     from '@/components/modals/NewAreaModal'
import { NewSubAreaModal }  from '@/components/modals/NewSubAreaModal'
import { NewProjectModal }  from '@/components/modals/NewProjectModal'
import { EditProjectModal } from '@/components/modals/EditProjectModal'
import { NewTaskModal }     from '@/components/modals/NewTaskModal'
import { useAppStore }     from '@/stores/app'
import { getSessionUser, onAuthChange, getUserAreaAccess } from '@/lib/auth'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import type { AppUser }    from '@/lib/auth'

import Dashboard    from '@/pages/Dashboard'
import MyDay        from '@/pages/MyDay'
import CalendarView from '@/pages/CalendarView'
import AIAssistant  from '@/pages/AIAssistant'
import Reports      from '@/pages/Reports'
import SettingsPage from '@/pages/SettingsPage'
import EmptyStates  from '@/pages/EmptyStates'
import AreaView     from '@/pages/AreaView'
import ProjectPage  from '@/pages/ProjectPage'
import Landing      from '@/pages/Landing'
import LoginPage    from '@/pages/LoginPage'
import TasksListPage       from '@/pages/TasksListPage'
import PlanillasPage       from '@/pages/planillas/PlanillasPage'
import ChecklistDetailPage from '@/pages/planillas/ChecklistDetailPage'
import PrintPage           from '@/pages/planillas/PrintPage'
import RelevamientoPrintPage from '@/pages/planillas/RelevamientoPrintPage'
import TemplatesPage       from '@/pages/planillas/TemplatesPage'
import TemplateDetailPage  from '@/pages/planillas/TemplateDetailPage'
import FormulariosPage     from '@/pages/formularios/FormulariosPage'

function AppRoutes() {
  const {
    taskDetailId, closeTask,
    cmdkOpen, setCmdK,
    showLanding,
    loadTasks, loadAreas, loadSubAreas, loadProjects,
    setCurrentUser, resetSession, setAccessibleAreaIds,
  } = useAppStore()

  const [user,         setUser]         = useState<AppUser | null>(null)
  const [authChecking, setAuthChecking] = useState(true)

  // Enable realtime sync when logged in. Channel name is per-user to avoid
  // collisions when multiple devices/users are connected simultaneously.
  useRealtimeSync(!!user, user?.id)

  // Load area access permissions for non-admin users (local, localStorage)
  const loadAccess = (u: AppUser) => {
    if (u.is_admin) {
      setAccessibleAreaIds(null) // null = see everything
      return
    }
    setAccessibleAreaIds(new Set(getUserAreaAccess(u.id)))
  }

  // Check existing session on mount
  useEffect(() => {
    getSessionUser().then(u => {
      if (u) { setCurrentUser(u); setUser(u); loadAccess(u) }
      setAuthChecking(false)
    })
  }, [setCurrentUser])

  // Listen to auth state changes (logout from another tab)
  useEffect(() => {
    const { data: { subscription } } = onAuthChange(u => {
      if (u) { setCurrentUser(u); setUser(u); loadAccess(u) }
      else { setUser(null) }
    })
    return () => subscription.unsubscribe()
  }, [setCurrentUser])

  // Listen for logout event dispatched by Sidebar/SettingsPage
  useEffect(() => {
    const handleLogout = () => { resetSession(); setUser(null) }
    window.addEventListener('ot-auth-logout', handleLogout)
    return () => window.removeEventListener('ot-auth-logout', handleLogout)
  }, [resetSession])

  // Load data once logged in
  useEffect(() => {
    if (!user) return
    loadAreas()
    loadSubAreas()
    loadProjects()
    loadTasks()
  }, [user, loadAreas, loadSubAreas, loadProjects, loadTasks])

  // Global keyboard shortcut
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdK(true)
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [setCmdK])

  const handleLogin = (u: AppUser) => {
    setCurrentUser(u)
    setUser(u)
    loadAccess(u)
  }

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--teal)', borderTopColor: 'transparent', animation: 'spin .6s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <LoginPage onLogin={handleLogin} />
  if (showLanding) return <Landing />

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/"              element={<Dashboard />}    />
          <Route path="/mi-dia"        element={<MyDay />}        />
          <Route path="/calendario"    element={<CalendarView />} />
          <Route path="/asistente-ia"  element={<AIAssistant />}  />
          <Route path="/reportes"      element={<Reports />}      />
          <Route path="/configuracion" element={<SettingsPage />} />
          <Route path="/empty-states"  element={<EmptyStates />}  />
          <Route path="/area/:areaId"  element={<AreaView />}     />
          <Route path="/area/:areaId/sub/:subareaId" element={<AreaView />} />
          <Route path="/tareas"        element={<TasksListPage />} />
          <Route path="/proyecto/:projectId" element={<ProjectPage />} />
          <Route path="/planillas"                          element={<PlanillasPage />}       />
          <Route path="/planillas/plantillas"              element={<TemplatesPage />}       />
          <Route path="/planillas/plantillas/:templateId"  element={<TemplateDetailPage />}  />
          <Route path="/planillas/:checklistId"            element={<ChecklistDetailPage />} />
          <Route path="/formularios"                        element={<FormulariosPage />}     />
        </Route>
        {/* Print is outside AppShell (sin navegación) */}
        <Route path="/planillas/:checklistId/imprimir" element={<PrintPage />} />
        <Route path="/formularios/:formId/imprimir" element={<RelevamientoPrintPage />} />
      </Routes>

      {/* Overlays globales — wrapped in OverlayBoundary so a transient crash
          (e.g. stale ref after a realtime DELETE) doesn't tumble the whole app.
          The `key` on TaskDetail forces a clean remount when navigating between tasks. */}
      <OverlayBoundary>
        {taskDetailId && <TaskDetail key={taskDetailId} taskId={taskDetailId} onClose={closeTask} />}
        {cmdkOpen     && <CmdK onClose={() => setCmdK(false)} />}
        <NewAreaModal />
        <NewSubAreaModal />
        <NewProjectModal />
        <EditProjectModal />
        <NewTaskModal />
      </OverlayBoundary>
    </>
  )
}

export default function App() {
  return <AppRoutes />
}
