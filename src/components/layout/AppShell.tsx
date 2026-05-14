import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar }    from './Sidebar'
import { Topbar }     from './Topbar'
import { BottomNav }  from './BottomNav'
import { MoreDrawer } from './MoreDrawer'
import { useAppStore } from '@/stores/app'

export function AppShell() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useAppStore()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mopen' : ''}`}>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <Topbar onBurger={() => setMobileOpen(!mobileOpen)} />
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav onMore={() => setMoreOpen(true)} />
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
