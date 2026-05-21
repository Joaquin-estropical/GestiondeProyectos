import { useState } from 'react'
import { signIn, getLocalUsers } from '@/lib/auth'
import type { AppUser } from '@/lib/auth'
import { Shield, Eye, EyeOff, LogIn, ChevronRight } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'

interface Props {
  onLogin: (user: AppUser) => void
}

export default function LoginPage({ onLogin }: Props) {
  const users = getLocalUsers()
  const [selected, setSelected] = useState<AppUser | null>(null)
  const [password, setPassword]  = useState('')
  const [showPwd,  setShowPwd]   = useState(false)
  const [loading,  setLoading]   = useState(false)
  const [error,    setError]     = useState<string | null>(null)

  const handleSelect = (u: AppUser) => {
    setSelected(u)
    setPassword('')
    setError(null)
  }

  const handleBack = () => {
    setSelected(null)
    setPassword('')
    setError(null)
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !password) return
    setLoading(true)
    setError(null)
    try {
      const user = await signIn(selected.email, password)
      onLogin(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
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
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 25% 30%, rgba(20,184,166,.06) 0%, transparent 55%),
                          radial-gradient(circle at 75% 75%, rgba(59,130,246,.04) 0%, transparent 50%)`,
      }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: 'var(--teal)',
            display: 'grid', placeItems: 'center', margin: '0 auto 20px',
            fontSize: 20, fontWeight: 700, color: '#00302A',
            boxShadow: '0 0 0 1px rgba(20,184,166,.3), 0 8px 32px rgba(20,184,166,.2)',
          }}>OT</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.03em', color: 'var(--text-1)' }}>
            Operaciones Tropical
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>
            {selected ? `Ingresando como ${selected.short}` : 'Seleccioná tu perfil para continuar'}
          </p>
        </div>

        {!selected ? (
          /* ── Selector de perfil ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => handleSelect(u)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  width: '100%', padding: '14px 16px',
                  background: 'var(--surface-1)', border: '1px solid var(--border)',
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color .12s, background .12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--teal)'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-1)'
                }}
              >
                <Avatar name={u.name} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{u.role}</div>
                </div>
                <ChevronRight size={16} color="var(--text-3)" />
              </button>
            ))}
          </div>
        ) : (
          /* ── Formulario de contraseña ── */
          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Perfil seleccionado */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', background: 'var(--surface-1)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <Avatar name={selected.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selected.email}</div>
              </div>
              <button
                type="button"
                onClick={handleBack}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, padding: '4px 8px' }}
              >
                Cambiar
              </button>
            </div>

            {/* Contraseña */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--surface-1)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 8, padding: '10px 42px 10px 14px', fontSize: 14, color: 'var(--text-1)',
                    outline: 'none', transition: 'border-color .12s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                  onBlur={e => (e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4,
                  }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
                fontSize: 13, color: 'var(--red)',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
                background: loading || !password ? 'var(--surface-2)' : 'var(--teal)',
                color: loading || !password ? 'var(--text-3)' : '#00302A',
                fontSize: 14, fontWeight: 600, cursor: loading || !password ? 'default' : 'pointer',
                transition: 'background .15s',
                marginTop: 4,
              }}
            >
              {loading
                ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--teal)', borderTopColor: 'transparent', animation: 'spin .6s linear infinite' }} /> Ingresando...</>
                : <><LogIn size={15} /> Ingresar</>
              }
            </button>
          </form>
        )}

        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-3)', fontSize: 12 }}>
          <Shield size={12} />
          <span>Acceso restringido — solo usuarios autorizados</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
