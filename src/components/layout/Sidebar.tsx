import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Sun, Sparkles, Calendar, BarChart3, Settings,
  ChevronDown, ChevronRight, Plus, PanelLeftClose, PanelLeftOpen,
  CheckSquare, LayoutTemplate, LogOut, ChevronUp,
} from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { Avatar } from '@/components/shared/Avatar'
import { APP_USERS, clearCurrentUser, setCurrentUser as saveUser } from '@/lib/auth'

const WS_ITEMS = [
  { id: 'dashboard', label: 'Inicio',            Icon: Home,      path: '/'             },
  { id: 'myday',     label: 'Mi día',            Icon: Sun,       path: '/mi-dia'       },
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
  const { areas, projects, openNewArea, openNewProject, currentUser, setCurrentUser } = useAppStore()
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({})
  const [showUserMenu, setShowUserMenu] = useState(false)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const toggle = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }))

  const switchUser = (uid: string) => {
    const u = APP_USERS.find(x => x.id === uid)
    if (!u) return
    saveUser(uid)
    setCurrentUser(u)
    setShowUserMenu(false)
    navigate('/')
    window.location.reload()
  }

  const logout = () => {
    clearCurrentUser()
    window.location.reload()
  }

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

      {/* Footer with user switcher */}
      <div style={{ position: 'relative' }}>
        {showUserMenu && !collapsed && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 8, right: 8,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 6, zIndex: 50, marginBottom: 4,
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', padding: '4px 8px 8px' }}>
              Cambiar usuario
            </div>
            {APP_USERS.map(u => (
              <button
                key={u.id}
                onClick={() => switchUser(u.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: u.id === currentUser.id ? 'var(--teal-bg)' : 'transparent',
                  color: u.id === currentUser.id ? 'var(--teal)' : 'var(--text-1)',
                }}
              >
                <Avatar name={u.name} size={22} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{u.name.split(' ')[0]} {u.name.split(' ')[1]}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.role}</div>
                </div>
                {u.id === currentUser.id && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--teal)' }} />}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
              <button
                onClick={logout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--text-3)', fontSize: 12.5,
                }}
              >
                <LogOut size={13} /> Cerrar sesión
              </button>
            </div>
          </div>
        )}
        <div className="sb-foot" style={{ cursor: collapsed ? 'default' : 'pointer' }} onClick={() => !collapsed && setShowUserMenu(v => !v)}>
          <Avatar name={currentUser.name} size={28} />
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{currentUser.role}</div>
            </div>
          )}
          {!collapsed && (
            <ChevronUp size={13} style={{ color: 'var(--text-3)', flexShrink: 0, transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }} />
          )}
        </div>
      </div>
    </aside>
  )
}
