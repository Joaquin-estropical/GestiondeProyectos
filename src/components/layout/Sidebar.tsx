import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Sun, Sparkles, Calendar, BarChart3, Settings,
  ChevronDown, ChevronRight, Plus, PanelLeftClose, PanelLeftOpen,
  LayoutTemplate, LogOut, ChevronUp, ClipboardList, FileText,
} from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { Avatar } from '@/components/shared/Avatar'
import { signOut } from '@/lib/auth'

const WS_ITEMS = [
  { id: 'dashboard', label: 'Inicio',            Icon: Home,          path: '/'             },
  { id: 'myday',     label: 'Mi día',            Icon: Sun,           path: '/mi-dia'       },
  { id: 'ai',        label: 'Asistente IA',      Icon: Sparkles,      path: '/asistente-ia' },
  { id: 'calendar',  label: 'Calendario global', Icon: Calendar,      path: '/calendario'   },
  { id: 'reports',   label: 'Reportes',          Icon: BarChart3,     path: '/reportes'     },
  { id: 'planillas', label: 'Planillas',          Icon: ClipboardList, path: '/planillas'    },
  { id: 'formularios', label: 'Formularios',      Icon: FileText,      path: '/formularios'  },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { areas, subareas, projects, openNewArea, openNewSubArea, openNewProject, currentUser, mobileOpen, setMobileOpen, accessibleAreaIds, resetSession } = useAppStore()
  const [expanded,    setExpanded]    = useState<Record<string, boolean>>({})  // area ids
  const [subExpanded, setSubExpanded] = useState<Record<string, boolean>>({})  // subarea ids
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Detect tablet breakpoint reactively
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024
  )
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768
  )
  useEffect(() => {
    const update = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // On tablet: sidebar rail is always icon-only; expands to full drawer when mobileOpen
  // On mobile: sidebar is a full drawer (always expanded when open)
  const c = isTablet ? !mobileOpen : (isMobile ? false : collapsed)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const toggle = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }))
  const toggleSub = (id: string) =>
    setSubExpanded((s) => ({ ...s, [id]: !s[id] }))

  const goTo = (path: string) => {
    navigate(path)
    // Close drawer on mobile/tablet after navigating
    if (isMobile || isTablet) setMobileOpen(false)
  }

  const logout = async () => {
    await signOut()
    resetSession()
    // Dispatch event for App.tsx to reset user state → shows LoginPage
    window.dispatchEvent(new CustomEvent('ot-auth-logout'))
  }

  const icoSize = c ? 18 : 14
  const userMenuRef = useRef<HTMLDivElement>(null)

  return (
    <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Brand / header */}
      <div className="sb-head" style={c ? { justifyContent: 'center', padding: '14px 0 12px' } : {}}>
        <span className="ot-logo" style={c ? { width: 32, height: 32, borderRadius: 8, fontSize: 12 } : {}}>OT</span>
        {!c && <span className="ot-name">Operaciones Tropical</span>}
        {/* Hide collapse button on mobile/tablet (they use burger/back) */}
        {!isMobile && !isTablet && (
          <button
            className="btn btn-ghost btn-sm btn-icon"
            style={{ marginLeft: c ? 0 : 'auto', width: 22, height: 22 }}
            onClick={onToggleCollapse}
            title={c ? 'Expandir' : 'Colapsar'}
          >
            {c ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
          </button>
        )}
        {/* On tablet drawer: show close X */}
        {isTablet && mobileOpen && (
          <button
            className="btn btn-ghost btn-sm btn-icon"
            style={{ marginLeft: 'auto', width: 22, height: 22 }}
            onClick={() => setMobileOpen(false)}
            title="Cerrar"
          >
            <PanelLeftClose size={13} />
          </button>
        )}
      </div>

      {/* Scroll area */}
      <div className="sb-scroll">
        {!c && <div className="sb-section">Workspace</div>}
        {c && <div style={{ height: 10 }} />}

        {WS_ITEMS.map((it) => (
          <div
            key={it.id}
            className={`sb-item${isActive(it.path) ? ' active' : ''}${c ? ' sb-item-collapsed' : ''}`}
            onClick={() => goTo(it.path)}
            title={it.label}
            style={c ? { justifyContent: 'center', padding: '9px 0', margin: '2px 6px' } : {}}
          >
            <it.Icon size={icoSize} style={{ flexShrink: 0 }} />
            {!c && <span>{it.label}</span>}
          </div>
        ))}

        {c && <div style={{ height: 6, borderTop: '1px solid var(--border)', margin: '6px 8px' }} />}
        {!c && <div className="sb-section">Áreas</div>}

        {areas.filter(a => currentUser.is_admin || !accessibleAreaIds || accessibleAreaIds.has(a.id)).map((a) => {
          const isEdificio   = a.type === 'edificio'
          const areaSubAreas = isEdificio ? subareas.filter(sa => sa.area === a.id) : []
          const areaProjects = projects.filter((p) => p.area === a.id)
          const isOpen       = expanded[a.id] ?? false
          const areaPath     = `/area/${a.id}`

          return (
            <div key={a.id}>
              {/* ── Area row ── */}
              <div
                className={`sb-item${isActive(areaPath) ? ' active' : ''}${c ? ' sb-item-collapsed' : ''}`}
                style={c
                  ? { justifyContent: 'center', padding: '9px 0', margin: '2px 6px' }
                  : { paddingRight: 4, cursor: 'pointer' }}
                title={a.name}
                onClick={() => !c && goTo(areaPath)}
              >
                {!c && (
                  <span
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 4, flexShrink: 0, color: 'var(--text-3)' }}
                    onClick={(e) => { e.stopPropagation(); toggle(a.id) }}
                  >
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </span>
                )}
                <span
                  className="sb-area-dot"
                  style={{ background: a.color, width: c ? 10 : 8, height: c ? 10 : 8, borderRadius: c ? 3 : 2 }}
                />
                {!c && <span style={{ flex: 1 }}>{a.name}</span>}
                {!c && isEdificio && (
                  <span
                    className="btn btn-ghost btn-icon"
                    style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.4 }}
                    title="Nueva sub-área en Edificio"
                    onClick={(e) => { e.stopPropagation(); openNewSubArea(a.id) }}
                  >
                    <Plus size={11} />
                  </span>
                )}
                {!c && !isEdificio && (
                  <span
                    className="btn btn-ghost btn-icon"
                    style={{ width: 18, height: 18, flexShrink: 0, opacity: 0.4 }}
                    title={`Nuevo proyecto en ${a.name}`}
                    onClick={(e) => { e.stopPropagation(); openNewProject(a.id) }}
                  >
                    <Plus size={11} />
                  </span>
                )}
                {!c && <span className="sb-count">{areaProjects.length}</span>}
              </div>

              {/* ── Expanded content ── */}
              {!c && isOpen && (
                <div className="sb-sub">
                  {isEdificio ? (
                    /* EDIFICIO: sub-areas → projects */
                    <>
                      {areaSubAreas.map((sa) => {
                        const subPath  = `/area/${a.id}/sub/${sa.id}`
                        const subProjs = projects.filter(p => p.subarea === sa.id)
                        const subOpen  = subExpanded[sa.id] ?? false
                        return (
                          <div key={sa.id}>
                            <div
                              className={`sb-item${isActive(subPath) ? ' active' : ''}`}
                              style={{ paddingRight: 4, cursor: 'pointer' }}
                              title={sa.name}
                              onClick={() => goTo(subPath)}
                            >
                              <span
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, flexShrink: 0, color: 'var(--text-3)' }}
                                onClick={(e) => { e.stopPropagation(); toggleSub(sa.id) }}
                              >
                                {subOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </span>
                              <span style={{ width: 6, height: 6, borderRadius: 1, background: sa.color, flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: 12.5 }}>{sa.name}</span>
                              <span
                                className="btn btn-ghost btn-icon"
                                style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.4 }}
                                title={`Nuevo proyecto en ${sa.name}`}
                                onClick={(e) => { e.stopPropagation(); openNewProject(a.id, sa.id) }}
                              >
                                <Plus size={10} />
                              </span>
                              <span className="sb-count">{subProjs.length}</span>
                            </div>
                            {subOpen && (
                              <div className="sb-sub" style={{ paddingLeft: 14 }}>
                                {subProjs.map((p) => {
                                  const projPath = `/proyecto/${p.id}`
                                  return (
                                    <div
                                      key={p.id}
                                      className={`sb-item${isActive(projPath) ? ' active' : ''}`}
                                      onClick={() => goTo(projPath)}
                                    >
                                      <span style={{ width: 5, height: 5, borderRadius: 1, background: sa.color, flexShrink: 0, opacity: 0.8 }} />
                                      <span>{p.name}</span>
                                    </div>
                                  )
                                })}
                                {subProjs.length === 0 && (
                                  <div style={{ padding: '4px 0 4px 18px', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Sin proyectos</div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {areaSubAreas.length === 0 && (
                        <div style={{ padding: '6px 0 6px 12px', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                          Sin sub-áreas. Hacé clic en "+" para crear una.
                        </div>
                      )}
                    </>
                  ) : (
                    /* OTHER AREAS: direct projects */
                    <>
                      {areaProjects.map((p) => {
                        const projPath = `/proyecto/${p.id}`
                        return (
                          <div
                            key={p.id}
                            className={`sb-item${isActive(projPath) ? ' active' : ''}`}
                            style={{ paddingLeft: 10 }}
                            onClick={() => goTo(projPath)}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: 1, background: a.color, flexShrink: 0, opacity: 0.8 }} />
                            <span>{p.name}</span>
                          </div>
                        )
                      })}
                      {areaProjects.length === 0 && (
                        <div style={{ padding: '4px 0 4px 18px', fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Sin proyectos</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!c && (
          <div
            className="sb-item"
            style={{ color: 'var(--text-3)', marginTop: 4 }}
            onClick={() => openNewArea()}
          >
            <Plus size={12} /><span>Nueva área</span>
          </div>
        )}

        {!c && (
          <>
            <div className="sb-section">Sistema</div>
            <div
              className={`sb-item${isActive('/configuracion') ? ' active' : ''}`}
              onClick={() => goTo('/configuracion')}
            >
              <Settings size={14} /><span>Configuración</span>
            </div>
            <div
              className={`sb-item${isActive('/empty-states') ? ' active' : ''}`}
              onClick={() => goTo('/empty-states')}
            >
              <LayoutTemplate size={14} /><span>Empty states</span>
            </div>
          </>
        )}

        {c && (
          <>
            <div style={{ height: 6, borderTop: '1px solid var(--border)', margin: '6px 8px' }} />
            <div
              className={`sb-item${isActive('/configuracion') ? ' active' : ''} sb-item-collapsed`}
              onClick={() => goTo('/configuracion')}
              title="Configuración"
              style={{ justifyContent: 'center', padding: '9px 0', margin: '2px 6px' }}
            >
              <Settings size={icoSize} />
            </div>
          </>
        )}
      </div>

      {/* Footer with user switcher */}
      <div style={{ position: 'relative' }} ref={userMenuRef}>
        {showUserMenu && !c && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 8, right: 8,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 6, zIndex: 50, marginBottom: 4,
          }}>
            <div style={{ padding: '6px 10px 10px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{currentUser.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{currentUser.email}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{currentUser.role}</div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 6 }}>
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

        {c ? (
          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar name={currentUser.name} size={32} />
            <button
              onClick={logout}
              title="Cerrar sesión"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-3)',
                transition: 'background .12s, color .12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--red)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="sb-foot">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setShowUserMenu(v => !v)}>
              <Avatar name={currentUser.name} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{currentUser.role}</div>
              </div>
              <ChevronUp size={13} style={{ color: 'var(--text-3)', flexShrink: 0, transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .15s' }} />
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-3)', flexShrink: 0,
                transition: 'background .12s, color .12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--red)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
