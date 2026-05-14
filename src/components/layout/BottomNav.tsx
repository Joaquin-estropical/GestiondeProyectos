import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ListTodo, Calendar, MoreHorizontal, Plus } from 'lucide-react'
import { useAppStore } from '@/stores/app'

interface BottomNavProps {
  onMore: () => void
}

export function BottomNav({ onMore }: BottomNavProps) {
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const { openNewTask } = useAppStore()

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)

  const items = [
    { path: '/',           icon: Home,          label: 'Inicio'    },
    { path: '/mi-dia',     icon: ListTodo,      label: 'Mi día'    },
    { path: '/calendario', icon: Calendar,      label: 'Calendario' },
  ]

  return (
    <nav className="bottom-nav">
      {items.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          className={`bottom-nav-item${isActive(path) ? ' active' : ''}`}
          onClick={() => navigate(path)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}

      {/* FAB-style center create button */}
      <button
        className="bottom-nav-item"
        onClick={() => openNewTask()}
        style={{ color: 'var(--teal)' }}
      >
        <Plus size={20} />
        <span>Nuevo</span>
      </button>

      <button className="bottom-nav-item" onClick={onMore}>
        <MoreHorizontal size={20} />
        <span>Más</span>
      </button>
    </nav>
  )
}
