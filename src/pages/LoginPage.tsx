import { APP_USERS, setCurrentUser } from '@/lib/auth'
import type { AppUser } from '@/lib/auth'
import { Avatar } from '@/components/shared/Avatar'

interface Props {
  onLogin: (user: AppUser) => void
}

export default function LoginPage({ onLogin }: Props) {
  const handle = (u: AppUser) => {
    setCurrentUser(u.id)
    onLogin(u)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: 'var(--bg)',
      gap: 0,
    }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: 'var(--teal)',
          display: 'grid', placeItems: 'center', margin: '0 auto 16px',
          fontSize: 18, fontWeight: 700, color: '#00302A',
        }}>OT</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>
          Operaciones Tropical
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-3)', fontSize: 14 }}>
          Seleccioná tu usuario para continuar
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 320 }}>
        {APP_USERS.map(u => (
          <button
            key={u.id}
            onClick={() => handle(u)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 10, cursor: 'pointer',
              background: 'var(--surface-1)', border: '1px solid var(--border)',
              textAlign: 'left', transition: 'border-color .15s, background .15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(20,184,166,.4)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-1)'
            }}
          >
            <Avatar name={u.name} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{u.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{u.role}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>

      <p style={{ marginTop: 32, color: 'var(--text-3)', fontSize: 12 }}>
        Todos los usuarios tienen acceso completo a proyectos y áreas.
      </p>
    </div>
  )
}
