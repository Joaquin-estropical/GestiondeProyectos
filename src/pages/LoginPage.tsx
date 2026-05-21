import { useState } from 'react'
import { signIn } from '@/lib/auth'
import type { AppUser } from '@/lib/auth'
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react'

interface Props {
  onLogin: (user: AppUser) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      // Log raw Supabase auth response for debugging
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      )
      const raw = await sb.auth.signInWithPassword({ email: email.trim(), password })
      console.log('RAW AUTH RESPONSE:', JSON.stringify(raw, null, 2))
      if (raw.error) {
        setError(`[${raw.error.status}] ${raw.error.message} — code: ${raw.error.code ?? 'none'}`)
        setLoading(false)
        return
      }
      const user = await signIn(email.trim(), password)
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
            Ingresá con tu cuenta para continuar
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              placeholder="tu@tropical.bo"
              autoComplete="email"
              autoFocus
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--surface-1)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--text-1)',
                outline: 'none', transition: 'border-color .12s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
              onBlur={e => (e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)')}
            />
          </div>

          {/* Password */}
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
            disabled={loading || !email.trim() || !password}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '11px 0', borderRadius: 8, border: 'none',
              background: loading ? 'var(--surface-2)' : 'var(--teal)',
              color: loading ? 'var(--text-3)' : '#00302A',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              transition: 'background .15s, opacity .15s',
              opacity: (!email.trim() || !password) && !loading ? 0.5 : 1,
              marginTop: 4,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--teal)', borderTopColor: 'transparent', animation: 'spin .6s linear infinite' }} />
                Ingresando...
              </>
            ) : (
              <><LogIn size={15} /> Ingresar</>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, color: 'var(--text-3)', fontSize: 12,
        }}>
          <Shield size={12} />
          <span>Acceso restringido — solo usuarios autorizados</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
