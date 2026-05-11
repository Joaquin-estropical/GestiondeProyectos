import { useState, useReducer } from 'react';
import { CheckSquare, Settings, OctagonAlert, TriangleAlert, Sparkles, Users, CircleCheck, FileBarChart, ArrowRight, Check, BellOff } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import { INBOX_ITEMS } from '@/lib/mock-data';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import type { InboxItem } from '@/types';

interface InboxMeta {
  ico: ComponentType<LucideProps>;
  color: string;
  label: string;
}

function getMeta(k: string): InboxMeta {
  const map: Record<string, InboxMeta> = {
    block:   { ico: OctagonAlert,  color: 'var(--red)',    label: 'Bloqueo' },
    risk:    { ico: TriangleAlert, color: 'var(--amber)',  label: 'Riesgo' },
    summary: { ico: Sparkles,      color: 'var(--teal)',   label: 'Resumen' },
    load:    { ico: Users,         color: 'var(--blue)',   label: 'Carga' },
    win:     { ico: CircleCheck,   color: 'var(--green)',  label: 'Logro' },
    report:  { ico: FileBarChart,  color: 'var(--text-2)', label: 'Reporte' },
  };
  return map[k] ?? map['report'];
}

export default function AIInbox() {
  const { openTask } = useAppStore();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState<InboxItem[]>(INBOX_ITEMS.map(i => ({ ...i })));
  const [sel, setSel] = useState(items[0].id);

  const filtered = tab === 'all' ? items
    : tab === 'unread' ? items.filter(i => !i.read)
    : items.filter(i => i.kind === tab);

  const cur = items.find(i => i.id === sel) ?? items[0];
  const m = getMeta(cur.kind);

  const markRead = (id: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
    force();
  };

  const tabs: [string, string][] = [
    ['all', 'Todos'], ['unread', 'No leídos'], ['block', 'Bloqueos'], ['risk', 'Riesgos'], ['summary', 'Resúmenes'],
  ];

  return (
    <>
      <PageHead
        title="Bandeja IA"
        subtitle="Avisos automáticos · resúmenes · bloqueos detectados"
        right={
          <div className="row gap-8">
            <button className="btn btn-secondary btn-sm"><CheckSquare size={14} /> Marcar todo leído</button>
            <button className="btn btn-secondary btn-sm"><Settings size={14} /> Reglas IA</button>
          </div>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', height: 'calc(100% - 89px)' }}>
        <aside style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tabs.map(([k, l]) => (
              <span
                key={k}
                onClick={() => setTab(k)}
                className={`pill ${tab === k ? 'pill-status-curso' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                {l}
              </span>
            ))}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(it => {
              const mm = getMeta(it.kind);
              const IcoComp = mm.ico;
              return (
                <div
                  key={it.id}
                  onClick={() => { setSel(it.id); markRead(it.id); }}
                  style={{
                    padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    background: sel === it.id ? 'var(--surface-1)' : 'transparent',
                    borderLeft: sel === it.id ? '2px solid var(--teal)' : '2px solid transparent',
                    paddingLeft: sel === it.id ? 14 : 16,
                  }}
                >
                  <div className="row gap-8 items-center" style={{ marginBottom: 6 }}>
                    <IcoComp size={13} color={mm.color} />
                    <span className="micro" style={{ color: mm.color }}>{mm.label}</span>
                    {!it.read && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--teal)' }}></span>}
                    <span className="mono f-xs text-3" style={{ marginLeft: 'auto' }}>{it.when}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: it.read ? 500 : 600, color: 'var(--text-1)', lineHeight: 1.4 }}>{it.title}</div>
                  <div
                    className="f-xs text-2"
                    style={{ marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {it.body}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <div style={{ overflowY: 'auto', padding: '28px 36px' }}>
          <div className="row gap-8 items-center mb-12">
            <m.ico size={14} color={m.color} />
            <span className="micro" style={{ color: m.color }}>{m.label}</span>
            <span className="mono f-xs text-3" style={{ marginLeft: 'auto' }}>{cur.when}</span>
          </div>
          <h2 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 600, letterSpacing: '-.01em', lineHeight: 1.3 }}>{cur.title}</h2>
          <p style={{ color: 'var(--text-1)', fontSize: 14, lineHeight: 1.65, maxWidth: 680 }}>{cur.body}</p>
          <div className="row gap-8 mt-24">
            {cur.target && (
              <button className="btn btn-primary btn-md" onClick={() => openTask(cur.target!)}>
                <ArrowRight size={14} /> Ver tarea
              </button>
            )}
            <button className="btn btn-secondary btn-md"><Check size={14} /> Marcar resuelto</button>
            <button className="btn btn-ghost btn-md"><BellOff size={14} /> Silenciar regla</button>
          </div>
          <div className="card mt-32" style={{ maxWidth: 680 }}>
            <div className="card-head"><span className="title">Acciones sugeridas por IA</span></div>
            <div style={{ padding: '4px 4px 8px' }}>
              {['Replanificar tarea a mar 13', 'Reasignar a Andrea Mendoza', 'Notificar a Joaquín por mensaje directo', 'Crear subtarea de seguimiento'].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : '' }}>
                  <Sparkles size={12} color="var(--teal)" />
                  <span style={{ flex: 1, fontSize: 13 }}>{a}</span>
                  <button className="btn btn-ghost btn-sm">Aplicar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
