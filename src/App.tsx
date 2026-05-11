import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import './index.css'

import { AppShell }        from '@/components/layout/AppShell'
import { TaskDetail }      from '@/components/shared/TaskDetail'
import { CmdK }            from '@/components/shared/CmdK'
import { NewAreaModal }    from '@/components/modals/NewAreaModal'
import { NewProjectModal } from '@/components/modals/NewProjectModal'
import { NewTaskModal }    from '@/components/modals/NewTaskModal'
import { useAppStore }     from '@/stores/app'

import Dashboard    from '@/pages/Dashboard'
import MyDay        from '@/pages/MyDay'
import CalendarView from '@/pages/CalendarView'
import AIAssistant  from '@/pages/AIAssistant'
import AIInbox      from '@/pages/AIInbox'
import Reports      from '@/pages/Reports'
import SettingsPage from '@/pages/SettingsPage'
import EmptyStates  from '@/pages/EmptyStates'
import AreaView     from '@/pages/AreaView'
import ProjectPage  from '@/pages/ProjectPage'
import Landing      from '@/pages/Landing'

function AppRoutes() {
  const {
    taskDetailId, closeTask,
    cmdkOpen, setCmdK,
    showLanding,
    loadTasks, loadAreas, loadProjects,
  } = useAppStore()

  useEffect(() => {
    loadAreas()
    loadProjects()
    loadTasks()
  }, [loadAreas, loadProjects, loadTasks])

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

  if (showLanding) return <Landing />

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/"              element={<Dashboard />}    />
          <Route path="/mi-dia"        element={<MyDay />}        />
          <Route path="/calendario"    element={<CalendarView />} />
          <Route path="/asistente-ia"  element={<AIAssistant />}  />
          <Route path="/bandeja-ia"    element={<AIInbox />}      />
          <Route path="/reportes"      element={<Reports />}      />
          <Route path="/configuracion" element={<SettingsPage />} />
          <Route path="/empty-states"  element={<EmptyStates />}  />
          <Route path="/area/:areaId"  element={<AreaView />}     />
          <Route path="/proyecto/:projectId" element={<ProjectPage />} />
        </Route>
      </Routes>

      {/* Overlays globales */}
      {taskDetailId && <TaskDetail taskId={taskDetailId} onClose={closeTask} />}
      {cmdkOpen     && <CmdK onClose={() => setCmdK(false)} />}
      <NewAreaModal />
      <NewProjectModal />
      <NewTaskModal />
    </>
  )
}

export default function App() {
  return <AppRoutes />
}
