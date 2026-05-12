import { useState } from 'react'
import { APP_USERS, setCurrentUser } from '@/lib/auth'
import type { AppUser } from '@/lib/auth'
import { Avatar } from '@/components/shared/Avatar'
import { ChevronRight, Shield } from 'lucide-react'

interface Props {
  onLogin: (user: AppUser) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const handle = (u: AppUser) => {
    setLoading(u.id)
    setCurrentUser(u.id)
    setTimeout(() => onLogin(u), 180)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Background grid texture */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 25% 30%, rgba(20,184,166,.06) 0%, transparent 55%),
                          radial-gradient(circle at 75% 75%, rgba(59,130,246,.04) 0%, transparent 50%)`,
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo + brand */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: 'var(--teal)',
            display: 'grid', placeItems: 'center', margin: '0 auto 20px',
            fontSize: 20, fontWeight: 700, color: '#00302A',
            boxShadow: '0 0 0 1px rgba(20,184,166,.3), 0 8px 32px rgba(20,184,166,.2)',
          }}>
            OT
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.03em', color: 'var(--text-1)' }}>
            Operaciones Tropical
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontSize: 13.5, lineHeight: 1.5 }}>
            Seleccioná tu perfil para continuar
          </p>
        </div>

        {/* User cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {APP_USERS.map((u, i) => {
            const isHov = hovered === u.id
            const isLoad = loading === u.id
            return (
              <button
                key={u.id}
                onClick={() => handle(u)}
                onMouseEnter={() => setHovered(u.id)}
                onMouseLeave={() => setHovered(null)}
                disabled={loading !== null}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 10, cursor: loading ? 'default' : 'pointer',
                  background: isHov ? 'var(--surface-2)' : 'var(--surface-1)',
                  border: `1px solid ${isHov ? 'rgba(20,184,166,.35)' : 'var(--border)'}`,
                  textAlign: 'left',
                  transition: 'border-color .15s, background .15s, transform .12s, box-shadow .15s',
                  transform: isHov && !loading ? 'translateY(-1px)' : 'none',
                  boxShadow: isHov && !loading ? '0 4px 16px rgba(0,0,0,.25)' : 'none',
                  opacity: loading && !isLoad ? 0.4 : 1,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <Avatar name={u.name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.role}</div>
                </div>
                {isLoad ? (
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    border: '2px solid var(--teal)', borderTopColor: 'transparent',
                    animation: 'spin .6s linear infinite', flexShrink: 0,
                  }} />
                ) : (
                  <ChevronRight size={16} style={{ color: isHov ? 'var(--teal)' : 'var(--text-3)', flexShrink: 0, transition: 'color .15s' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, color: 'var(--text-3)', fontSize: 12,
        }}>
          <Shield size={12} />
          <span>Todos los usuarios tienen acceso completo a proyectos y áreas</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
