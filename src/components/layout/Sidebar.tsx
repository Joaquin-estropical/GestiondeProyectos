import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Sun, Inbox, Sparkles, Calendar, BarChart3, Settings,
  ChevronDown, ChevronRight, Plus, PanelLeftClose, PanelLeftOpen,
  CheckSquare, LayoutTemplate,
} from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { Avatar } from '@/components/shared/Avatar'

const WS_ITEMS = [
  { id: 'dashboard', label: 'Inicio',            Icon: Home,      path: '/'             },
  { id: 'myday',     label: 'Mi día',            Icon: Sun,       path: '/mi-dia'       },
  { id: 'inbox',     label: 'Bandeja IA',        Icon: Inbox,     path: '/bandeja-ia',  badge: 3 },
  { id: 'ai',        label: 'Asistente IA',      Icon: Sparkles,  path: '/asistente-ia' },
  { id: 'calendar',  label: 'Calendario global', Icon: Calendar,  path: '/calendario'   },
  { id: 'reports',   label: 'Reportes',          Icon: BarChart3, path: '/reportes'     },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const navigate    = useNavigate()
  const location    = useLocation()
  const { areas, projects, openNewArea, openNewProject } = useAppStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const toggle = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }))

  return (
    <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Brand */}
      <div className="sb-head">
        <span className="ot-logo">OT</span>
        {!collapsed && <span className="ot-name">Operaciones Tropical</span>}
        <button
          className="btn btn-ghost btn-sm btn-icon"
          style={{ marginLeft: collapsed ? 0 : 'auto', width: 22, height: 22 }}
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
        </button>
      </div>

      {/* Scroll area */}
      <div className="sb-scroll">
        {!collapsed && <div className="sb-section">Workspace</div>}

        {WS_ITEMS.map((it) => (
          <div
            key={it.id}
            className={`sb-item${isActive(it.path) ? ' active' : ''}`}
            onClick={() => navigate(it.path)}
            title={collapsed ? it.label : ''}
          >
            <it.Icon size={14} />
            {!collapsed && <span>{it.label}</span>}
            {!collapsed && it.badge && <span className="sb-badge">{it.badge}</span>}
          </div>
        ))}

        {!collapsed && <div className="sb-section">Áreas</div>}

        {areas.map((a) => {
          const areaProjects = projects.filter((p) => p.area === a.id)
          const isOpen  = expanded[a.id] ?? true
          const areaPath = `/area/${a.id}`

          return (
            <div key={a.id}>
              <div
                className={`sb-item${isActive(areaPath) ? ' active' : ''}`}
                style={{ paddingRight: 4 }}
                title={collapsed ? a.name : ''}
              >
                {!collapsed && (
                  <span
                    style={{ display: 'inline-flex', cursor: 'pointer', padding: '2px 2px 2px 0' }}
                    onClick={(e) => { e.stopPropagation(); toggle(a.id) }}
                  >
                    {isOpen
                      ? <ChevronDown size={12} color="var(--text-3)" />
                      : <ChevronRight size={12} color="var(--text-3)" />}
                  </span>
                )}
                <span
                  className="sb-area-dot"
                  style={{ background: a.color }}
                  onClick={() => navigate(areaPath)}
                />
                {!collapsed && (
                  <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(areaPath)}>{a.name}</span>
                )}
                {!collapsed && (
                  <span
                    className="btn btn-ghost btn-icon"
                    style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.4 }}
                    title={`Nuevo proyecto en ${a.name}`}
                    onClick={(e) => { e.stopPropagation(); openNewProject(a.id) }}
                  >
                    <Plus size={11} />
                  </span>
                )}
                {!collapsed && <span className="sb-count">{areaProjects.length}</span>}
              </div>

              {!collapsed && isOpen && (
                <div className="sb-sub">
                  {areaProjects.map((p) => {
                    const projPath = `/proyecto/${p.id}`
                    return (
                      <div
                        key={p.id}
                        className={`sb-item${isActive(projPath) ? ' active' : ''}`}
                        onClick={() => navigate(projPath)}
                      >
                        <CheckSquare size={12} />
                        <span>{p.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {!collapsed && (
          <div
            className="sb-item"
            style={{ color: 'var(--text-3)', marginTop: 4 }}
            onClick={() => openNewArea()}
          >
            <Plus size={12} /><span>Nueva área</span>
          </div>
        )}

        {!collapsed && (
          <>
            <div className="sb-section">Sistema</div>
            <div
              className={`sb-item${isActive('/configuracion') ? ' active' : ''}`}
              onClick={() => navigate('/configuracion')}
            >
              <Settings size={14} /><span>Configuración</span>
            </div>
            <div
              className={`sb-item${isActive('/empty-states') ? ' active' : ''}`}
              onClick={() => navigate('/empty-states')}
            >
              <LayoutTemplate size={14} /><span>Empty states</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sb-foot">
        <Avatar name="Joaquín Rivera" size={28} />
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Joaquín Rivera
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Admin · Operaciones</div>
          </div>
        )}
        {!collapsed && (
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate('/configuracion')}>
            <Settings size={13} />
          </button>
        )}
      </div>
    </aside>
  )
}
