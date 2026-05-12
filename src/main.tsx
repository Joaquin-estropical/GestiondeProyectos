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
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Clear potentially corrupt localStorage on crash
    localStorage.removeItem('ot_current_user');
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
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: 8, padding: '8px 20px', borderRadius: 6, background: '#14B8A6', border: 'none', color: '#00302A', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
          >
            Reiniciar app
          </button>
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
