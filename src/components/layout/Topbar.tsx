import { useLocation } from 'react-router-dom'
import { Search, ChevronRight, Sparkles, Plus, Globe, Menu } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'
import { useAppStore } from '@/stores/app'

function useBreadcrumb(): string[] {
  const { pathname } = useLocation()
  const { areas, projects } = useAppStore()
  if (pathname === '/') return ['Inicio']
  if (pathname === '/mi-dia') return ['Mi día']
  if (pathname === '/calendario') return ['Calendario global']
  if (pathname === '/bandeja-ia') return ['Bandeja IA']
  if (pathname === '/asistente-ia') return ['Asistente IA']
  if (pathname === '/reportes') return ['Reportes']
  if (pathname === '/configuracion') return ['Configuración']
  if (pathname === '/empty-states') return ['Empty states']
  if (pathname.startsWith('/area/')) {
    const id = pathname.split('/')[2]
    const a  = areas.find((x) => x.id === id)
    return ['Áreas', a?.name ?? id]
  }
  if (pathname.startsWith('/proyecto/')) {
    const id = pathname.split('/')[2]
    const p  = projects.find((x) => x.id === id)
    if (p) {
      const a = areas.find((x) => x.id === p.area)
      return [a?.name ?? p.area, p.name]
    }
  }
  return []
}

interface TopbarProps {
  onBurger: () => void
}

const TEAM_NAMES = ['Joaquín Rivera', 'Andrea Mendoza', 'Carlos Rojas', 'Sofía Vargas']

export function Topbar({ onBurger }: TopbarProps) {
  const crumbs = useBreadcrumb()
  const { setCmdK, setShowLanding, openNewTask } = useAppStore()

  return (
    <header className="app-topbar">
      <button className="btn btn-ghost btn-sm btn-icon mobile-burger" onClick={onBurger}>
        <Menu size={15} />
      </button>

      <div className="breadcrumb hide-mob">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <ChevronRight size={11} color="var(--text-3)" />}
            <span style={i === crumbs.length - 1 ? { color: 'var(--text-1)', fontWeight: 500 } : {}}>
              {c}
            </span>
          </span>
        ))}
      </div>

      <div className="tb-search" onClick={() => setCmdK(true)}>
        <Search size={13} color="var(--text-2)" />
        <span style={{ flex: 1, fontSize: 12.5 }}>Buscar tareas, proyectos, personas...</span>
        <span className="kbd">⌘K</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowLanding(true)} title="Ver landing pública">
          <Globe size={13} />
        </button>
        <button className="btn btn-secondary btn-sm">
          <Sparkles size={13} color="var(--teal)" /> Asistente IA
        </button>
        <span className="avatar-stack" style={{ marginLeft: 4, display: 'inline-flex' }}>
          {TEAM_NAMES.map((name) => (
            <Avatar key={name} name={name} size={24} style={{ border: '1.5px solid var(--bg)' }} />
          ))}
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => openNewTask()}>
          <Plus size={13} /> Nuevo
        </button>
      </div>
    </header>
  )
}
