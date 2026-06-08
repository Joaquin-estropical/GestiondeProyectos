import { useLocation, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, Sparkles, Plus, Menu, ChevronLeft } from 'lucide-react'
import { useAppStore } from '@/stores/app'

function useBreadcrumb(): string[] {
  const { pathname } = useLocation()
  const { areas, projects } = useAppStore()
  if (pathname === '/') return ['Inicio']
  if (pathname === '/mi-dia') return ['Mi día']
  if (pathname === '/calendario') return ['Calendario global']
  if (pathname === '/asistente-ia') return ['Asistente IA']
  if (pathname === '/reportes') return ['Reportes']
  if (pathname === '/configuracion') return ['Configuración']
  if (pathname === '/empty-states') return ['Empty states']
  if (pathname === '/planillas') return ['Plantillas']
  if (pathname === '/planillas/plantillas') return ['Plantillas', 'Formularios']
  if (pathname.startsWith('/planillas/plantillas/')) return ['Plantillas', 'Formularios', 'Detalle']
  if (pathname.endsWith('/imprimir')) return ['Plantillas', 'Imprimir']
  if (pathname.startsWith('/planillas/')) return ['Plantillas', 'Acta']
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

export function Topbar({ onBurger }: TopbarProps) {
  const crumbs   = useBreadcrumb()
  const navigate = useNavigate()
  const { setCmdK, openNewTask } = useAppStore()

  // Mobile: page title is last crumb; show back arrow if depth > 1
  const pageTitle  = crumbs[crumbs.length - 1] ?? ''
  const hasParent  = crumbs.length > 1

  return (
    <header className="app-topbar">
      {/* Mobile: back button or burger */}
      <button
        className="btn btn-ghost btn-sm btn-icon mobile-burger"
        onClick={hasParent ? () => navigate(-1) : onBurger}
        title={hasParent ? 'Atrás' : 'Menú'}
      >
        {hasParent ? <ChevronLeft size={17} /> : <Menu size={15} />}
      </button>

      {/* Desktop / tablet: breadcrumb */}
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

      {/* Mobile: centered page title */}
      <span
        className="mobile-page-title"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-1)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '50vw',
          pointerEvents: 'none',
        }}
      >
        {pageTitle}
      </span>

      <div className="tb-search" onClick={() => setCmdK(true)}>
        <Search size={13} color="var(--text-2)" />
        <span style={{ flex: 1, fontSize: 12.5 }}>Buscar tareas, proyectos...</span>
        <span className="kbd">⌘K</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-secondary btn-sm hide-mob">
          <Sparkles size={13} color="var(--teal)" /> Asistente IA
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => openNewTask()}>
          <Plus size={13} /> <span className="hide-mob">Nuevo</span>
        </button>
      </div>
    </header>
  )
}
