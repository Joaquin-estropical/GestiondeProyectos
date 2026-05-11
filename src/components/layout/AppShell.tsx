import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useAppStore } from '@/stores/app'

export function AppShell() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useAppStore()
  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mopen' : ''}`}>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <Topbar onBurger={() => setMobileOpen(!mobileOpen)} />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
