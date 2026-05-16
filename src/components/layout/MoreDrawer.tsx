import { useNavigate } from 'react-router-dom'
import { X, BarChart3, Sparkles, Settings, ClipboardList } from 'lucide-react'
import { useAppStore } from '@/stores/app'
import { Avatar } from '@/components/shared/Avatar'

interface MoreDrawerProps {
  open: boolean
  onClose: () => void
}

export function MoreDrawer({ open, onClose }: MoreDrawerProps) {
  const navigate = useNavigate()
  const { areas, projects, currentUser } = useAppStore()

  const go = (path: string) => { navigate(path); onClose() }

  if (!open) return null

  return (
    <>
      <div className="bottom-sheet-backdrop" onClick={onClose} style={{ opacity: open ? 1 : 0 }} />
      <div className="bottom-sheet" style={{ transform: open ? 'translateY(0)' : 'translateY(100%)' }}>
        <div className="bottom-sheet-handle"><div /></div>
        <div className="bottom-sheet-head">
          <h2>Menú</h2>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={onClose}
            style={{ width: 32, height: 32 }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="bottom-sheet-body" style={{ padding: '12px 0' }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 16px', borderBottom: '1px solid var(--border)' }}>
            <Avatar name={currentUser.name} size={36} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{currentUser.role}</div>
            </div>
          </div>

          {/* Main nav items */}
          <div style={{ padding: '8px 0' }}>
            {[
              { icon: BarChart3,    label: 'Reportes',     path: '/reportes'     },
              { icon: Sparkles,     label: 'Asistente IA', path: '/asistente-ia' },
              { icon: ClipboardList,label: 'Planillas',    path: '/planillas'    },
              { icon: Settings,     label: 'Configuración',path: '/configuracion'},
            ].map(({ icon: Icon, label, path }) => (
              <button
                key={path}
                onClick={() => go(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 16px',
                  background: 'none', border: 'none',
                  color: 'var(--text-1)', fontSize: 14, cursor: 'pointer',
                  textAlign: 'left',
                }}
                onTouchStart={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onTouchEnd={e => (e.currentTarget.style.background = 'none')}
              >
                <Icon size={18} color="var(--text-2)" />
                {label}
              </button>
            ))}
          </div>

          {/* Areas */}
          {areas.length > 0 && (
            <>
              <div style={{ fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', padding: '8px 16px 4px' }}>
                Áreas
              </div>
              {areas.map(a => {
                const count = projects.filter(p => p.area === a.id).length
                return (
                  <button
                    key={a.id}
                    onClick={() => go(`/area/${a.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 16px',
                      background: 'none', border: 'none',
                      color: 'var(--text-1)', fontSize: 14, cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onTouchStart={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onTouchEnd={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{a.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>
    </>
  )
}
