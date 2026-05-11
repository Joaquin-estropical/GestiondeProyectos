import { useState, useEffect } from 'react';
import { Link, MoreHorizontal, X, Play, Pause, Plus, AtSign, Paperclip, ArrowUp } from 'lucide-react';
import { useAppStore } from '@/stores/app';
import { getMember, getProject, fmtDate, dueColor, STATUS_LABELS } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill, AreaPill } from '@/components/shared/Badges';

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const { tasks } = useAppStore();
  const t = tasks.find(x => x.id === taskId);
  const [timing, setTiming] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!timing) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [timing]);

  if (!t) return null;

  const m = getMember(t.assignee)!
  const p = getProject(t.project)!;

  const fmtSec = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const subtasksStatic = [
    { d: true,  text: 'Listar proveedores aprobados',           mn: 'AM' },
    { d: true,  text: 'Enviar pliego de especificaciones',       mn: 'JR' },
    { d: false, text: 'Hacer seguimiento por teléfono jueves',   mn: 'JR' },
    { d: false, text: 'Comparar precios en planilla',            mn: 'AM' },
  ].slice(0, t.subtasks.total);

  return (
    <>
      <div className="slide-bd" onClick={onClose}></div>
      <aside className="slide-over">
        <div className="slide-head">
          <div className="row gap-10 items-center">
            <span className="mono f-xs text-3">{t.code}</span>
            <span style={{ flex: 1 }}></span>
            <button className="btn btn-ghost btn-sm btn-icon"><Link size={13} /></button>
            <button className="btn btn-ghost btn-sm btn-icon"><MoreHorizontal size={13} /></button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={14} /></button>
          </div>
          <h2 style={{ margin: '12px 0 0', fontSize: 20, fontWeight: 600, letterSpacing: '-.005em', lineHeight: 1.3 }}>{t.title}</h2>
          <div className="row gap-8 items-center mt-10">
            <StatusPill status={t.status} />
            <PriorityPill priority={t.priority} />
            <AreaPill areaId={t.area} mini />
            <span className="micro" style={{ marginLeft: 'auto' }}>Creado hace 4 días</span>
          </div>
        </div>

        <div className="slide-body">
          {/* Description */}
          <div className="micro mb-8">Descripción</div>
          <div className="card-pad" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-1)' }}>
            Solicitar cotizaciones formales a los tres proveedores preferidos de la zona (Lumicom, Iluminar SA y FocoMax) para la totalidad del techo de la zona ventas, oficinas y depósito.
            <br /><br />
            Especificación: paneles LED 60×60, 36W, 4000K. Incluir transporte y mano de obra. Plazo máximo: 7 días para responder.
          </div>

          {/* Meta grid */}
          <div className="micro mt-24 mb-8">Detalles</div>
          <div className="meta-grid">
            <div className="lbl">Asignado</div>
            <div className="row gap-8 items-center"><Avatar name={m.name} size={22} /><span style={{ fontSize: 13 }}>{m.name}</span></div>
            <div className="lbl">Fecha límite</div>
            <div className="mono f-sm" style={{ color: dueColor(t.due) }}>{fmtDate(t.due)} 2026</div>
            <div className="lbl">Prioridad</div>
            <div><PriorityPill priority={t.priority} /></div>
            <div className="lbl">Estado</div>
            <div><StatusPill status={t.status} /></div>
            <div className="lbl">Área</div>
            <div><AreaPill areaId={t.area} mini /></div>
            <div className="lbl">Proyecto</div>
            <div style={{ fontSize: 13 }}>{p.name}</div>
            <div className="lbl">Tiempo total</div>
            <div className="mono f-sm">{t.time}</div>
            <div className="lbl">Etiquetas</div>
            <div className="row gap-4"><span className="pill">obra-mayor</span><span className="pill">proveedores</span></div>
          </div>

          {/* Time tracker */}
          <div className="micro mt-24 mb-8">Tiempo</div>
          <div className="card-pad" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="btn btn-primary btn-md btn-icon"
              style={{ width: 40, height: 40, borderRadius: 999 }}
              onClick={() => setTiming(v => !v)}
            >
              {timing ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '.02em', color: timing ? 'var(--teal)' : 'var(--text-1)' }}>
                {fmtSec(elapsed)}
              </div>
              <div className="f-xs text-2 mt-4">{timing ? 'Cronometrando ahora...' : `Total registrado: ${t.time}`}</div>
            </div>
            <button className="btn btn-ghost btn-sm">Agregar manual</button>
          </div>

          {/* Subtasks */}
          <div className="row between items-center mt-24 mb-8">
            <span className="micro">Subtareas <span className="mono" style={{ marginLeft: 4 }}>{t.subtasks.done}/{t.subtasks.total}</span></span>
            <button className="btn btn-ghost btn-sm"><Plus size={13} /> Agregar</button>
          </div>
          <div className="card-pad" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: 0 }}>
            {subtasksStatic.map((s, i) => (
              <div
                key={i}
                style={{ padding: '10px 14px', borderBottom: i < subtasksStatic.length - 1 ? '1px solid var(--border)' : '', display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span className={`check ${s.d ? 'done' : ''}`}></span>
                <span style={{ flex: 1, fontSize: 13, textDecoration: s.d ? 'line-through' : 'none', color: s.d ? 'var(--text-2)' : 'var(--text-1)' }}>{s.text}</span>
                <span style={{ width: 20, height: 20, borderRadius: 999, fontSize: 9, fontWeight: 600, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--text-2)' }}>{s.mn}</span>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="micro mt-24 mb-8">Comentarios</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Avatar name="Andrea Mendoza" size={26} />
              <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                <div><span className="fw-5">Andrea M.</span> <span className="mono f-xs text-3" style={{ marginLeft: 6 }}>hace 2h</span></div>
                <div className="text-1 mt-4">Lumicom respondió, espera el pliego revisado hoy. FocoMax pidió plano del techo, lo subo a la tarea de relevamiento.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Avatar name="Carlos Rojas" size={26} />
              <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>
                <div><span className="fw-5">Carlos R.</span> <span className="mono f-xs text-3" style={{ marginLeft: 6 }}>ayer</span></div>
                <div className="text-1 mt-4">Sumar pliego: deben cubrir mano de obra y garantía mínima 2 años.</div>
              </div>
            </div>
          </div>

          <div className="row gap-8 mt-16">
            <Avatar name="Joaquín Rivera" size={26} />
            <div className="input" style={{ flex: 1, height: 'auto', padding: '8px 12px' }}>
              <input
                type="text"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Escribí un comentario..."
              />
              <button className="btn btn-ghost btn-sm btn-icon"><AtSign size={13} /></button>
              <button className="btn btn-ghost btn-sm btn-icon"><Paperclip size={13} /></button>
              <button className="btn btn-primary btn-sm btn-icon"><ArrowUp size={12} /></button>
            </div>
          </div>

          {/* Activity */}
          <div className="micro mt-24 mb-8">Actividad</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12, color: 'var(--text-2)' }}>
            <div><span style={{ color: 'var(--text-1)' }}>Joaquín</span> cambió estado a <span className="fw-5" style={{ color: 'var(--text-1)' }}>{STATUS_LABELS[t.status]}</span> · <span className="mono">hace 3h</span></div>
            <div><span style={{ color: 'var(--text-1)' }}>Andrea</span> agregó un comentario · <span className="mono">hace 2h</span></div>
            <div><span style={{ color: 'var(--text-1)' }}>IA</span> sugirió mover la fecha a +2 días · <span className="mono">ayer</span></div>
            <div><span style={{ color: 'var(--text-1)' }}>Joaquín</span> creó la tarea · <span className="mono">4 mar</span></div>
          </div>
        </div>
      </aside>
    </>
  );
}
