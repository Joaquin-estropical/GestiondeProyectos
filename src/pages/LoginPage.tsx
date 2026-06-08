import { useState } from 'react'
import { signIn, getLocalUsers, verifyMasterKey } from '@/lib/auth'
import type { AppUser } from '@/lib/auth'
import { Shield, Eye, EyeOff, LogIn, ChevronRight, KeyRound } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'

interface Props {
  onLogin: (user: AppUser) => void
}

type Mode = 'picker' | 'password' | 'forgot'

const inputStyle = (hasError = false): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box',
  background: 'var(--surface-1)', border: `1px solid ${hasError ? 'var(--red)' : 'var(--border)'}`,
  borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--text-1)',
  outline: 'none', transition: 'border-color .12s',
})

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em',
}

export default function LoginPage({ onLogin }: Props) {
  const users = getLocalUsers()
  const [mode,     setMode]     = useState<Mode>('picker')
  const [selected, setSelected] = useState<AppUser | null>(null)

  // Login state
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Forgot-password state
  const [masterKey,   setMasterKey]   = useState('')
  const [showMaster,  setShowMaster]  = useState(false)
  const [resetting,   setResetting]   = useState(false)
  const [resetError,  setResetError]  = useState<string | null>(null)

  const handleSelect = (u: AppUser) => {
    setSelected(u)
    setPassword(''); setError(null)
    setMode('password')
  }

  const goToPicker = () => {
    setSelected(null)
    setPassword(''); setError(null)
    setMasterKey('')
    setResetError(null)
    setMode('picker')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !password) return
    setLoading(true); setError(null)
    try {
      const user = await signIn(selected.email, password)
      onLogin(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = () => {
    setPassword(''); setError(null)
    setMasterKey('')
    setResetError(null)
    setMode('forgot')
  }

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setResetError(null)
    if (!masterKey) { setResetError('Ingresá la clave maestra.'); return }
    setResetting(true)
    try {
      if (!verifyMasterKey(masterKey)) throw new Error('Clave maestra incorrecta')
      // Inicia sesión directamente sin verificar contraseña del usuario
      localStorage.setItem('ot_session_user_id', selected.id)
      onLogin(selected)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Clave maestra incorrecta')
    } finally {
      setResetting(false)
    }
  }

  const subtitle =
    mode === 'picker'   ? 'Seleccioná tu perfil para continuar' :
    mode === 'forgot'   ? `Acceso con clave maestra — ${selected?.short}` :
                          `Ingresando como ${selected?.short}`

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
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
          <p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontSize: 13.5 }}>{subtitle}</p>
        </div>

        {/* ── PICKER ── */}
        {mode === 'picker' && (
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
        )}

        {/* ── PASSWORD ── */}
        {mode === 'password' && selected && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Perfil seleccionado */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <Avatar name={selected.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selected.email}</div>
              </div>
              <button type="button" onClick={goToPicker}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 12, padding: '4px 8px' }}>
                Cambiar
              </button>
            </div>

            {/* Contraseña */}
            <div>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null) }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus
                  required
                  style={{ ...inputStyle(!!error), paddingRight: 42 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                  onBlur={e => (e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)')}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', fontSize: 13, color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !password} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
              background: loading || !password ? 'var(--surface-2)' : 'var(--teal)',
              color: loading || !password ? 'var(--text-3)' : '#00302A',
              fontSize: 14, fontWeight: 600, cursor: loading || !password ? 'default' : 'pointer',
              transition: 'background .15s', marginTop: 4,
            }}>
              {loading
                ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--teal)', borderTopColor: 'transparent', animation: 'spin .6s linear infinite' }} /> Ingresando...</>
                : <><LogIn size={15} /> Ingresar</>
              }
            </button>

            {/* Link recuperación */}
            <button type="button" onClick={handleForgot} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', fontSize: 12.5, textAlign: 'center',
              textDecoration: 'underline', padding: '2px 0',
              transition: 'color .12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--teal)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* ── FORGOT ── */}
        {mode === 'forgot' && selected && (
          <form onSubmit={handleMasterLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Perfil */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10,
            }}>
              <Avatar name={selected.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selected.email}</div>
              </div>
            </div>

            {/* Hint */}
            <div style={{
              display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8,
              background: 'rgba(20,184,166,.06)', border: '1px solid rgba(20,184,166,.2)', fontSize: 12.5, color: 'var(--text-2)',
            }}>
              <KeyRound size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--teal)' }} />
              Ingresá la clave maestra para ingresar. Luego podés cambiar tu contraseña desde Configuración → Mi cuenta.
            </div>

            {/* Clave maestra */}
            <div>
              <label style={labelStyle}>Clave maestra</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showMaster ? 'text' : 'password'}
                  value={masterKey}
                  onChange={e => { setMasterKey(e.target.value); setResetError(null) }}
                  placeholder="Ingresá la clave maestra"
                  autoFocus
                  style={{ ...inputStyle(!!resetError), paddingRight: 42 }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
                  onBlur={e => (e.currentTarget.style.borderColor = resetError ? 'var(--red)' : 'var(--border)')}
                />
                <button type="button" onClick={() => setShowMaster(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                  {showMaster ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {resetError && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', fontSize: 13, color: 'var(--red)' }}>
                {resetError}
              </div>
            )}

            <button type="submit" disabled={resetting || !masterKey} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
              background: resetting || !masterKey ? 'var(--surface-2)' : 'var(--teal)',
              color: resetting || !masterKey ? 'var(--text-3)' : '#00302A',
              fontSize: 14, fontWeight: 600,
              cursor: resetting || !masterKey ? 'default' : 'pointer',
              transition: 'background .15s',
            }}>
              {resetting
                ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--teal)', borderTopColor: 'transparent', animation: 'spin .6s linear infinite' }} /> Ingresando...</>
                : <><LogIn size={15} /> Ingresar con clave maestra</>
              }
            </button>

            <button type="button" onClick={goToPicker} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', fontSize: 12.5, textAlign: 'center',
              textDecoration: 'underline', padding: '2px 0',
              transition: 'color .12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              ← Volver al inicio de sesión
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
