import { useState, useRef, useEffect } from 'react';
import { Sun, OctagonAlert, FileBarChart, Target, Sparkles, ArrowUp, Lightbulb, RefreshCw, AlertCircle, Loader } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import { useAreas, useTasks, useMembers, useProjects } from '@/hooks/useSupabase';
import { sendMessage, runQuickAction } from '@/lib/ai';
import type { ChatMessage } from '@/lib/ai';

interface Agent {
  id: string;
  name: string;
  desc: string;
  Icon: ComponentType<LucideProps>;
  prompt: string;
}

const agents: Agent[] = [
  { id: 'resumen',   name: 'Resumen diario',       desc: 'Estado ejecutivo de todas las áreas', Icon: Sun,          prompt: 'resumen'   },
  { id: 'bloqueos',  name: 'Detector de bloqueos',  desc: 'Analiza bloqueos y vencimientos',      Icon: OctagonAlert,  prompt: 'bloqueos'  },
  { id: 'reporte',   name: 'Reporte semanal',        desc: 'Reporte completo de progreso',         Icon: FileBarChart,  prompt: 'reporte'   },
  { id: 'priorizar', name: 'Priorización',           desc: 'Ordena tus tareas por impacto',        Icon: Target,        prompt: 'priorizar' },
];

interface QuickAction {
  name: string;
  desc: string;
  Icon: ComponentType<LucideProps>;
  prompt: string;
}

const quickActions: QuickAction[] = [
  { name: '¿Quién tiene más carga?', desc: 'Distribución de trabajo del equipo',     Icon: Lightbulb, prompt: '¿Quién tiene más carga de trabajo esta semana? Dame el detalle por persona.' },
  { name: 'Proyectos en riesgo',     desc: 'Proyectos cerca del vencimiento',        Icon: OctagonAlert, prompt: '¿Qué proyectos están en riesgo de no cumplirse en fecha? Analiza los proyectos con tareas vencidas o bloqueadas.' },
  { name: 'Tareas vencidas',         desc: 'Resumen de todas las tareas atrasadas',  Icon: RefreshCw, prompt: 'Dame un resumen de todas las tareas vencidas, agrupadas por área y persona responsable.' },
  { name: 'Brainstorm',              desc: 'Ideas y sugerencias operativas',         Icon: Sparkles,  prompt: 'Basándote en el estado actual del equipo y los proyectos, ¿qué sugerencias operativas harías para mejorar el rendimiento esta semana?' },
];

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold: **text**
    const parsed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    if (line.startsWith('## ')) {
      return <div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: i > 0 ? 12 : 0, marginBottom: 4, color: 'var(--text-1)' }} dangerouslySetInnerHTML={{ __html: parsed.replace(/^## /, '') }} />;
    }
    if (line.startsWith('# ')) {
      return <div key={i} style={{ fontWeight: 700, fontSize: 16, marginTop: i > 0 ? 14 : 0, marginBottom: 6 }} dangerouslySetInnerHTML={{ __html: parsed.replace(/^# /, '') }} />;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return <div key={i} style={{ paddingLeft: 14, position: 'relative', marginBottom: 2 }}>
        <span style={{ position: 'absolute', left: 4, color: 'var(--teal)' }}>·</span>
        <span dangerouslySetInnerHTML={{ __html: parsed.replace(/^[-*] /, '') }} />
      </div>;
    }
    if (line === '') return <div key={i} style={{ height: 6 }} />;
    return <div key={i} dangerouslySetInnerHTML={{ __html: parsed }} />;
  });
}

export default function AIAssistant() {
  const { currentUser } = useAppStore();
  const firstName = currentUser.name.split(' ')[0];

  const { data: areas    = [] } = useAreas();
  const { data: tasks    = [] } = useTasks();
  const { data: members  = [] } = useMembers();
  const { data: projects = [] } = useProjects();

  const appCtx = { areas, tasks, members, projects, currentUserName: currentUser.name };

  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hola ${firstName}. Soy el asistente IA de Operaciones Tropical, con acceso en tiempo real a todos los datos del sistema.\n\nPuedo ayudarte a:\n- **Analizar** el estado de proyectos, áreas y equipo\n- **Detectar** bloqueos, tareas vencidas y riesgos\n- **Priorizar** el trabajo según carga e impacto\n- **Generar** reportes y resúmenes ejecutivos\n\n¿En qué puedo ayudarte hoy?`,
    },
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  const addMessage = (role: ChatMessage['role'], content: string) => {
    setMsgs(prev => [...prev, { role, content }]);
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError('');
    const userText = text.trim();
    setInput('');
    addMessage('user', userText);
    setLoading(true);
    try {
      const history = msgs.filter(m => m.role !== 'assistant' || msgs.indexOf(m) > 0);
      const reply = await sendMessage(history, userText, appCtx);
      addMessage('assistant', reply);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const runAgent = async (agent: Agent) => {
    if (loading) return;
    setActiveAgent(agent.id);
    setError('');
    addMessage('user', `[${agent.name}] ${agent.desc}`);
    setLoading(true);
    try {
      const reply = await runQuickAction(agent.prompt, appCtx);
      addMessage('assistant', reply);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
      setActiveAgent(null);
    }
  };

  const runQuick = async (qa: QuickAction) => {
    await send(qa.prompt);
  };

  const clearChat = () => {
    setMsgs([{
      role: 'assistant',
      content: `Chat reiniciado. ¿En qué puedo ayudarte, ${firstName}?`,
    }]);
    setError('');
  };

  return (
    <>
      <PageHead
        title="Asistente IA"
        subtitle={`${tasks.length} tareas · ${areas.length} áreas · datos en tiempo real`}
        right={
          <button className="btn btn-ghost btn-sm" onClick={clearChat} title="Reiniciar chat">
            <RefreshCw size={13} /> Reiniciar
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: 'calc(100% - 89px)' }}>

        {/* Left sidebar: agents */}
        <aside style={{ borderRight: '1px solid var(--border)', padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="micro mb-10">Agentes rápidos</div>
            <div className="col gap-4">
              {agents.map(a => (
                <button
                  key={a.id}
                  disabled={loading || !hasApiKey}
                  onClick={() => runAgent(a)}
                  style={{
                    padding: 10, borderRadius: 6, cursor: loading || !hasApiKey ? 'default' : 'pointer',
                    background: activeAgent === a.id ? 'var(--teal-bg)' : 'var(--surface-1)',
                    border: `1px solid ${activeAgent === a.id ? 'rgba(20,184,166,.3)' : 'var(--border)'}`,
                    textAlign: 'left', opacity: loading && activeAgent !== a.id ? 0.5 : 1,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (!loading && hasApiKey) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = activeAgent === a.id ? 'rgba(20,184,166,.3)' : 'var(--border)'; }}
                >
                  <div className="row gap-8 items-center">
                    <span style={{
                      width: 24, height: 24, borderRadius: 5,
                      background: activeAgent === a.id ? 'var(--teal-bg)' : 'var(--surface-2)',
                      display: 'grid', placeItems: 'center',
                      color: activeAgent === a.id ? 'var(--teal)' : 'var(--text-2)',
                    }}>
                      {activeAgent === a.id && loading ? <Loader size={12} style={{ animation: 'spin .8s linear infinite' }} /> : <a.Icon size={13} />}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: activeAgent === a.id ? 'var(--teal)' : 'var(--text-1)' }}>{a.name}</span>
                  </div>
                  <div className="f-xs text-2" style={{ marginTop: 6, lineHeight: 1.4 }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats snapshot */}
          <div>
            <div className="micro mb-10">Snapshot</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { lbl: 'Tareas abiertas', val: tasks.filter(t => t.status !== 'done').length, color: 'var(--text-1)' },
                { lbl: 'Vencidas',        val: tasks.filter(t => t.status !== 'done' && t.due < new Date().toISOString().slice(0,10)).length, color: 'var(--red)' },
                { lbl: 'Bloqueadas',      val: tasks.filter(t => t.status === 'block').length, color: 'var(--amber)' },
                { lbl: 'Completadas',     val: tasks.filter(t => t.status === 'done').length, color: 'var(--green)' },
              ].map(s => (
                <div key={s.lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-3)' }}>{s.lbl}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {!hasApiKey && (
            <div style={{ padding: 10, borderRadius: 6, background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,.25)', fontSize: 12, color: 'var(--amber)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>API Key no configurada</div>
              Agrega <code>VITE_ANTHROPIC_API_KEY</code> en las variables de entorno de Vercel o en tu archivo <code>.env.local</code>.
            </div>
          )}
        </aside>

        {/* Chat area */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {msgs.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: 14, padding: '18px 0',
                    borderBottom: i < msgs.length - 1 ? '1px solid var(--border)' : '',
                  }}
                >
                  {m.role === 'assistant' ? (
                    <span style={{
                      width: 30, height: 30, borderRadius: 7,
                      background: 'var(--teal-bg)', display: 'grid', placeItems: 'center',
                      color: 'var(--teal)', flex: 'none',
                    }}>
                      <Sparkles size={14} />
                    </span>
                  ) : (
                    <Avatar name={currentUser.name} size={30} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="micro mb-6" style={{ color: m.role === 'assistant' ? 'var(--teal)' : 'var(--text-3)' }}>
                      {m.role === 'assistant' ? 'OT-AI' : firstName}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-1)' }}>
                      {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div style={{ display: 'flex', gap: 14, padding: '18px 0' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--teal-bg)', display: 'grid', placeItems: 'center', color: 'var(--teal)', flex: 'none' }}>
                    <Loader size={14} style={{ animation: 'spin .8s linear infinite' }} />
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 13 }}>
                    <span>Analizando datos del sistema</span>
                    <span style={{ letterSpacing: 2, animation: 'pulse 1.4s ease infinite' }}>···</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 8, background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,.25)', marginTop: 12 }}>
                  <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input area */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '16px 32px 20px', flexShrink: 0 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              {/* Quick actions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                {quickActions.map(qa => (
                  <button
                    key={qa.name}
                    onClick={() => runQuick(qa)}
                    disabled={loading || !hasApiKey}
                    className="card"
                    style={{ padding: '10px 12px', cursor: loading || !hasApiKey ? 'default' : 'pointer', textAlign: 'left', opacity: loading ? 0.5 : 1, transition: 'border-color .12s' }}
                    onMouseEnter={e => { if (!loading && hasApiKey) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                  >
                    <div className="row gap-6 items-center mb-4">
                      <qa.Icon size={12} color="var(--teal)" />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{qa.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>{qa.desc}</div>
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div className="input" style={{ height: 'auto', padding: '10px 12px', alignItems: 'flex-start', gap: 10 }}>
                <Sparkles size={14} color="var(--teal)" style={{ marginTop: 3, flexShrink: 0 }} />
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={hasApiKey ? 'Pregunta cualquier cosa sobre proyectos, equipo o tareas...' : 'Configura VITE_ANTHROPIC_API_KEY para habilitar el chat'}
                  disabled={loading || !hasApiKey}
                  style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, lineHeight: 1.5 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(input); }
                  }}
                />
                <button
                  className="btn btn-primary btn-sm btn-icon"
                  style={{ marginTop: 2, flexShrink: 0 }}
                  onClick={() => send(input)}
                  disabled={loading || !input.trim() || !hasApiKey}
                >
                  <ArrowUp size={14} />
                </button>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
                Enter + Ctrl/⌘ para enviar · Los datos se actualizan en tiempo real desde Supabase
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
      `}</style>
    </>
  );
}
