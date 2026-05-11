import { useState } from 'react';
import { Sun, OctagonAlert, FileBarChart, Target, Plus, Sparkles, Paperclip, ArrowUp, Lightbulb, RefreshCw, Bell } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { PageHead } from '@/components/shared/PageHead';

interface Agent {
  id: string;
  name: string;
  desc: string;
  Icon: ComponentType<LucideProps>;
}

const agents: Agent[] = [
  { id: 'sum',  name: 'Resumen diario',       desc: 'Estado de cada área cada mañana',        Icon: Sun },
  { id: 'bloc', name: 'Detector de bloqueos', desc: 'Alerta cuando algo se atasca >24h',       Icon: OctagonAlert },
  { id: 'rep',  name: 'Generador de reportes',desc: 'Reportes semanales por proyecto',         Icon: FileBarChart },
  { id: 'prio', name: 'Priorización',         desc: 'Reordena tu día por impacto',             Icon: Target },
];

interface QuickAction {
  name: string;
  desc: string;
  Icon: ComponentType<LucideProps>;
}

const quickActions: QuickAction[] = [
  { name: 'Brainstorm',          desc: 'Genera ideas para un proyecto',            Icon: Lightbulb },
  { name: 'Crear tarea',         desc: 'Nueva tarea con asignación automática',    Icon: Plus },
  { name: 'Actualizar estados',  desc: 'Revisa y actualiza estados batch',         Icon: RefreshCw },
  { name: 'Recordatorio',        desc: 'Programar un recordatorio',                Icon: Bell },
];

interface Message {
  who: 'ai' | 'me';
  text: string;
}

export default function AIAssistant() {
  const [active, setActive] = useState('sum');
  const [msg, setMsg] = useState('');
  const [msgs, setMsgs] = useState<Message[]>([
    { who: 'ai', text: 'Buen día Joaquín. Revisé tus 18 tareas abiertas. Tenés 2 vencidas en Outlet Centro y la migración POS necesita atención hoy. ¿Querés que reagende las tareas vencidas?' },
    { who: 'me', text: '¿Quién tiene más carga esta semana?' },
    { who: 'ai', text: 'Carlos Rojas tiene 7 tareas abiertas, 2 bloqueadas. Andrea M. tiene 5 y va al día. Recomiendo mover la auditoría de protocolos a Andrea — Carlos sigue en planos eléctricos pendientes del ingeniero externo.' },
  ]);

  const send = () => {
    if (!msg.trim()) return;
    setMsgs([...msgs, { who: 'me', text: msg }, { who: 'ai', text: 'Procesando tu solicitud...' }]);
    setMsg('');
  };

  return (
    <>
      <PageHead title="Asistente IA" subtitle="Tu copiloto operativo · Bandeja con 3 actualizaciones nuevas" />
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: 'calc(100% - 89px)' }}>
        <aside style={{ borderRight: '1px solid var(--border)', padding: '20px', overflowY: 'auto' }}>
          <div className="row between items-center mb-12">
            <span className="micro">Mis agentes</span>
            <button className="btn btn-ghost btn-sm" style={{ padding: 4 }}><Plus size={13} /></button>
          </div>
          <div className="col gap-4">
            {agents.map(a => (
              <div
                key={a.id}
                onClick={() => setActive(a.id)}
                style={{
                  padding: 10, borderRadius: 6, cursor: 'pointer',
                  background: active === a.id ? 'var(--surface-1)' : 'transparent',
                  border: active === a.id ? '1px solid var(--border-hover)' : '1px solid transparent',
                }}
              >
                <div className="row gap-8 items-center">
                  <span style={{ width: 24, height: 24, borderRadius: 5, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: active === a.id ? 'var(--teal)' : 'var(--text-2)' }}>
                    <a.Icon size={13} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                </div>
                <div className="f-xs text-2" style={{ marginTop: 6, lineHeight: 1.4 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              {msgs.map((m, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 12, padding: '16px 0', borderBottom: i < msgs.length - 1 ? '1px solid var(--border)' : '' }}
                >
                  {m.who === 'ai' ? (
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--teal-bg)', display: 'grid', placeItems: 'center', color: 'var(--teal)', flex: 'none' }}>
                      <Sparkles size={14} />
                    </span>
                  ) : (
                    <Avatar name="Joaquín Rivera" size={28} />
                  )}
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-1)', flex: 1 }}>
                    <div className="micro mb-4">{m.who === 'ai' ? 'Asistente IA' : 'Joaquín'}</div>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', padding: '20px 32px 24px' }}>
            <div style={{ maxWidth: 780, margin: '0 auto' }}>
              <div className="input" style={{ height: 'auto', padding: '12px 14px', alignItems: 'flex-start' }}>
                <Sparkles size={14} color="var(--teal)" />
                <textarea
                  rows={2}
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder="Pregunta cualquier cosa sobre tus proyectos, equipos o tareas..."
                  style={{ flex: 1, resize: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
                />
                <div className="col gap-4" style={{ marginLeft: 8 }}>
                  <button className="btn btn-ghost btn-sm btn-icon"><Paperclip size={13} /></button>
                  <button className="btn btn-primary btn-sm btn-icon" onClick={send}><ArrowUp size={13} /></button>
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                {quickActions.map(qa => (
                  <div key={qa.name} className="card" style={{ padding: 12, cursor: 'pointer' }}>
                    <div className="row gap-8 items-center">
                      <span style={{ color: 'var(--teal)' }}><qa.Icon size={13} /></span>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{qa.name}</span>
                    </div>
                    <div className="f-xs text-2 mt-4" style={{ lineHeight: 1.4 }}>{qa.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
