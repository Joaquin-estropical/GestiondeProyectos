import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Sparkles, LayoutGrid, MapPin, Gauge, ShieldCheck, LineChart, Check } from 'lucide-react';
import { STATUS_LABELS } from '@/lib/mock-data';

export default function Landing() {
  const navigate = useNavigate();
  const onEnter = () => navigate('/');

  return (
    <div className="landing">
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <span className="row gap-8 items-center">
            <span className="ot-logo" style={{ width: 28, height: 28, fontSize: 11 }}>OT</span>
            <span className="fw-6">Operaciones Tropical</span>
          </span>
          <nav className="row gap-24 f-sm text-2" style={{ marginLeft: 48 }}>
            <span>Producto</span>
            <span>Casos de uso</span>
            <span>Precios</span>
            <span>Changelog</span>
          </nav>
          <div className="row gap-8" style={{ marginLeft: 'auto' }}>
            <button className="btn btn-ghost btn-sm" onClick={onEnter}>Entrar</button>
            <button className="btn btn-primary btn-sm" onClick={onEnter}>Probar gratis</button>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <span className="lp-eyebrow">Nuevo · Bandeja IA con detección de bloqueos</span>
        <h1 className="lp-h1">Centro de control para<br />operaciones multi-área.</h1>
        <p className="lp-lead">
          Operaciones Tropical reemplaza tableros de mil pestañas, planillas en sombra y mensajes de "¿en qué quedamos?" con una vista única para todos tus locales, sucursales y depósitos.
        </p>
        <div className="row gap-12" style={{ justifyContent: 'center', marginTop: 32 }}>
          <button className="btn btn-primary btn-lg" onClick={onEnter}>Empezar — gratis 14 días <ArrowRight size={16} /></button>
          <button className="btn btn-secondary btn-lg"><Play size={14} /> Ver demo · 2 min</button>
        </div>

        <div className="lp-mock">
          <div className="lp-mock-chrome"><span></span><span></span><span></span></div>
          <div className="lp-mock-body">
            <div style={{ position: 'absolute', top: 14, left: 18, fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 500 }}>
              Dashboard · Operaciones Tropical
            </div>
            <div className="lp-mock-kpi"><div>Tareas hoy</div><span>8</span></div>
            <div className="lp-mock-kpi danger"><div>Vencidas</div><span>2</span></div>
            <div className="lp-mock-kpi warn"><div>En riesgo</div><span>3</span></div>
            <div className="lp-mock-kpi ok"><div>Completadas</div><span>24</span></div>
            <div className="lp-mock-ai">
              <div className="row gap-8 items-center">
                <Sparkles size={13} color="var(--teal)" />
                <span className="fw-6 f-sm">Resumen IA del día</span>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                2 tareas vencidas en Outlet Centro · Migración POS en riesgo · Carlos R. con sobrecarga, recomendado rebalancear.
              </p>
            </div>
            <div className="lp-mock-list">
              {([
                { t: 'Cotizar proveedores LED',       d: 'Hoy',     s: 'curso' as const, a: '#14B8A6' },
                { t: 'Revisar permisos obra mayor',   d: 'Vencida', s: 'block' as const, a: '#14B8A6' },
                { t: 'Conciliar inventario físico',   d: 'mar 12',  s: 'pend' as const,  a: '#F59E0B' },
                { t: 'Migración POS sucursal norte',  d: 'mar 14',  s: 'rev' as const,   a: '#3B82F6' },
              ]).map((r, i) => (
                <div key={i} className="lp-mock-row">
                  <span className="check"></span>
                  <span style={{ flex: 1 }}>{r.t}</span>
                  <span style={{ width: 8, height: 8, background: r.a, borderRadius: 999 }}></span>
                  <span className="mono" style={{ fontSize: 11, color: r.d === 'Vencida' ? 'var(--red)' : 'var(--text-2)', minWidth: 60, textAlign: 'right' }}>{r.d}</span>
                  <span className="pill" style={{ padding: '2px 8px', fontSize: 10 }}>{STATUS_LABELS[r.s]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-eyebrow">Una sola operación</div>
        <h2 className="lp-h2">Construido para equipos que manejan<br />muchas áreas, sin perder el foco.</h2>
        <div className="lp-features">
          {[
            { Icon: Sparkles,    t: 'Bandeja IA que entiende tu operación',    d: 'Resumen diario, detección de bloqueos y rebalanceo de carga sin que tengas que pedirlo.' },
            { Icon: LayoutGrid,  t: '5 vistas, una sola fuente de verdad',     d: 'Lista, Kanban, Gantt, Calendario y Tabla. Cambiá la vista, no la información.' },
            { Icon: MapPin,      t: 'Áreas con identidad propia',              d: 'Cada local, sucursal o depósito tiene color, miembros y reportes independientes — pero conectados.' },
            { Icon: Gauge,       t: 'Densidad de un IDE, fricción de cero',    d: 'Atajos para todo. Cmd+K abre la operación entera. Sin clics de relleno.' },
            { Icon: ShieldCheck, t: 'Permisos finos por área',                 d: 'El encargado de Outlet Centro no ve la auditoría de seguridad de otra sucursal. Salvo que vos lo decidas.' },
            { Icon: LineChart,   t: 'Reportes ejecutivos en 1 click',          d: 'Carga por persona, % por área, evolución semanal. Listos para enviar al CEO.' },
          ].map((f, i) => (
            <div key={i} className="lp-feat">
              <div className="ico"><f.Icon size={15} /></div>
              <div className="t">{f.t}</div>
              <p className="d">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-eyebrow">Vistas</div>
        <h2 className="lp-h2">Una vista para cada momento del día.</h2>
        <div className="lp-grid-2">
          {[
            { t: 'Vista Lista',       d: 'Agrupada por estado, densidad alta, todo a la vista.' },
            { t: 'Vista Kanban',      d: 'Para reuniones de status. Arrastrá y soltá.' },
            { t: 'Vista Gantt',       d: 'Dependencias, hitos, hoy marcado. Sin sorpresas.' },
            { t: 'Calendario global', d: 'Todas las áreas en un solo mes. Filtrá lo que querés.' },
          ].map((v, i) => (
            <div key={i} className="card card-pad" style={{ padding: 0 }}>
              <div style={{ height: 180, background: 'linear-gradient(180deg, var(--surface-1), var(--surface-0))', borderBottom: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 14, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', padding: 10 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} style={{ height: 10, background: 'var(--surface-2)', borderRadius: 2, marginBottom: 8, width: 60 + n * 7 + '%' }}></div>
                  ))}
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <div className="fw-6">{v.t}</div>
                <p style={{ margin: '6px 0 0', color: 'var(--text-2)', fontSize: 13 }}>{v.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-eyebrow">Precios simples</div>
        <h2 className="lp-h2">Pagás por persona. Áreas ilimitadas.</h2>
        <div className="lp-grid-3">
          {[
            { name: 'Starter', price: '0',  feat: false, bullets: ['Hasta 3 áreas', 'Hasta 5 miembros', 'Vistas Lista y Kanban', 'Bandeja IA básica'],                                            cta: 'Empezar gratis' },
            { name: 'Pro',     price: '12', feat: true,  bullets: ['Áreas ilimitadas', 'Todas las vistas', 'Gantt con dependencias', 'Bandeja IA completa', 'Reportes ejecutivos'], cta: 'Empezar — 14 días' },
            { name: 'Empresa', price: '—',  feat: false, bullets: ['SSO + SAML', 'Roles avanzados', 'Audit log', 'Soporte dedicado', 'SLA 99.9%'],                                               cta: 'Hablar con ventas' },
          ].map(p => (
            <div key={p.name} className="card card-pad" style={p.feat ? { borderColor: 'var(--teal)', boxShadow: '0 0 0 1px var(--teal) inset' } : {}}>
              <div className="row between items-center">
                <span className="fw-6" style={{ fontSize: 15 }}>{p.name}</span>
                {p.feat && <span className="pill" style={{ borderColor: 'var(--teal)', color: 'var(--teal)' }}>Recomendado</span>}
              </div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-.01em', marginTop: 16 }}>
                {p.price !== '—' ? (
                  <>${p.price}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-2)' }}> /usuario/mes</span></>
                ) : (
                  <span style={{ fontSize: 18 }}>Consultar</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                {p.bullets.map(b => (
                  <div key={b} className="row gap-8 items-center f-sm">
                    <Check size={13} color="var(--teal)" /> {b}
                  </div>
                ))}
              </div>
              <button
                className={`btn ${p.feat ? 'btn-primary' : 'btn-secondary'} btn-md`}
                style={{ marginTop: 24, width: '100%', justifyContent: 'center' }}
                onClick={onEnter}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section" style={{ textAlign: 'center' }}>
        <h2 className="lp-h2">Empezá hoy. Tu equipo lo va a notar mañana.</h2>
        <p className="lp-lead">Sin tarjeta. 14 días de Pro. Migración asistida si venís de otra herramienta.</p>
        <div className="row gap-12" style={{ justifyContent: 'center', marginTop: 24 }}>
          <button className="btn btn-primary btn-lg" onClick={onEnter}>Empezar gratis <ArrowRight size={16} /></button>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-foot-inner">
          <span className="row gap-8 items-center">
            <span className="ot-logo" style={{ width: 22, height: 22, fontSize: 9 }}>OT</span>
            <span className="f-sm text-2">© 2026 Operaciones Tropical</span>
          </span>
          <span className="row gap-24 f-sm text-2" style={{ marginLeft: 'auto' }}>
            <span>Privacidad</span>
            <span>Términos</span>
            <span>Status</span>
            <span>Contacto</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
