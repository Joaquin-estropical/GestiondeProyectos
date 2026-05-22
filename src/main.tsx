import { StrictMode, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    // Log for diagnostics (helps debug intermittent crashes like realtime DELETE mid-render)
    console.error('[ErrorBoundary]', error);
    // Note: do NOT clear the session key here — many crashes are transient and
    // dropping the session would force a re-login. The "Reiniciar app" button
    // below already calls localStorage.clear() if the user opts in.
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0A0A0B', color: '#E8E8EA', fontFamily: 'Inter, sans-serif', gap: 16,
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#14B8A6', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, color: '#00302A' }}>OT</div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Algo salió mal</p>
          <p style={{ fontSize: 13, color: '#5A5A60', margin: 0 }}>{this.state.error.message}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 20px', borderRadius: 6, background: '#14B8A6', border: 'none', color: '#00302A', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              Reintentar
            </button>
            <button
              onClick={() => { localStorage.removeItem('ot_session_user_id'); window.location.reload(); }}
              style={{ padding: '8px 20px', borderRadius: 6, background: 'transparent', border: '1px solid #2A2A35', color: '#C8C8D0', cursor: 'pointer', fontSize: 13 }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
