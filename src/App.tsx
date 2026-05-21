import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './index.css'

import { AppShell }        from '@/components/layout/AppShell'
import { TaskDetail }      from '@/components/shared/TaskDetail'
import { CmdK }            from '@/components/shared/CmdK'
import { NewAreaModal }     from '@/components/modals/NewAreaModal'
import { NewProjectModal }  from '@/components/modals/NewProjectModal'
import { EditProjectModal } from '@/components/modals/EditProjectModal'
import { NewTaskModal }     from '@/components/modals/NewTaskModal'
import { useAppStore }     from '@/stores/app'
import { getSessionUser, onAuthChange } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
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
import TemplatesPage       from '@/pages/planillas/TemplatesPage'
import TemplateDetailPage  from '@/pages/planillas/TemplateDetailPage'

function AppRoutes() {
  const {
    taskDetailId, closeTask,
    cmdkOpen, setCmdK,
    showLanding,
    loadTasks, loadAreas, loadProjects,
    setCurrentUser, resetSession, setAccessibleAreaIds,
  } = useAppStore()

  const [user,         setUser]         = useState<AppUser | null>(null)
  const [authChecking, setAuthChecking] = useState(true)

  // Enable realtime sync when logged in
  useRealtimeSync(!!user)

  // Load area access permissions for non-admin users
  const loadAccess = async (u: AppUser) => {
    if (u.is_admin) {
      setAccessibleAreaIds(null) // null = see everything
      return
    }
    const { data } = await supabase
      .from('user_area_access')
      .select('area_id')
      .eq('user_id', u.id)
    if (data) {
      setAccessibleAreaIds(new Set(data.map((r: { area_id: string }) => r.area_id)))
    } else {
      setAccessibleAreaIds(new Set()) // no access to any area
    }
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
    loadProjects()
    loadTasks()
  }, [user, loadAreas, loadProjects, loadTasks])

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
          <Route path="/tareas"        element={<TasksListPage />} />
          <Route path="/proyecto/:projectId" element={<ProjectPage />} />
          <Route path="/planillas"                          element={<PlanillasPage />}       />
          <Route path="/planillas/plantillas"              element={<TemplatesPage />}       />
          <Route path="/planillas/plantillas/:templateId"  element={<TemplateDetailPage />}  />
          <Route path="/planillas/:checklistId"            element={<ChecklistDetailPage />} />
        </Route>
        {/* Print is outside AppShell (sin navegación) */}
        <Route path="/planillas/:checklistId/imprimir" element={<PrintPage />} />
      </Routes>

      {/* Overlays globales */}
      {taskDetailId && <TaskDetail taskId={taskDetailId} onClose={closeTask} />}
      {cmdkOpen     && <CmdK onClose={() => setCmdK(false)} />}
      <NewAreaModal />
      <NewProjectModal />
      <EditProjectModal />
      <NewTaskModal />
    </>
  )
}

export default function App() {
  return <AppRoutes />
}
