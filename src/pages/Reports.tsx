import { Download } from 'lucide-react';
import { TEAM, AREAS, TASKS, PROJECTS, STATUS_ORDER, STATUS_LABELS, getArea } from '@/lib/mock-data';
import { Donut } from '@/components/shared/Charts';
import { PageHead } from '@/components/shared/PageHead';

export default function Reports() {
  const workload = TEAM.map(m => ({
    name: m.short,
    open: TASKS.filter(t => t.assignee === m.id && t.status !== 'done').length,
    done: TASKS.filter(t => t.assignee === m.id && t.status === 'done').length,
  }));
  const maxW = Math.max(...workload.map(w => w.open + w.done));

  const areaPct = AREAS.map(a => {
    const total = TASKS.filter(t => t.area === a.id).length;
    const done = TASKS.filter(t => t.area === a.id && t.status === 'done').length;
    return { name: a.name, value: total ? Math.round(done / total * 100) : 0, color: a.color };
  });

  const statusData = STATUS_ORDER.map(s => ({
    name: STATUS_LABELS[s],
    value: TASKS.filter(t => t.status === s).length,
    color: s === 'done' ? '#22C55E' : s === 'block' ? '#EF4444' : s === 'rev' ? '#F59E0B' : s === 'curso' ? '#3B82F6' : '#5A5A60',
  }));

  const evolution = [4, 6, 5, 9, 12, 8, 14];

  return (
    <>
      <PageHead
        title="Reportes"
        subtitle="Marzo 2026 · todos los proyectos"
        right={
          <div className="row gap-8">
            <div className="tabs">
              <span className="tab">7d</span>
              <span className="tab active">30d</span>
              <span className="tab">90d</span>
            </div>
            <button className="btn btn-secondary btn-sm"><Download size={14} /> Exportar</button>
          </div>
        }
      />
      <div className="page-body">
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="card">
            <div className="card-head"><span className="title">Carga de trabajo por persona</span></div>
            <div style={{ padding: '14px 18px' }}>
              {workload.map(w => (
                <div key={w.name} className="bar-row">
                  <span className="lbl">{w.name}</span>
                  <div className="bar">
                    <div style={{ width: ((w.open + w.done) / maxW * 100) + '%', background: 'var(--text-2)' }}>
                      <div style={{ width: (w.done / Math.max(w.open + w.done, 1) * 100) + '%', height: '100%', background: 'var(--green)' }}></div>
                    </div>
                  </div>
                  <span className="val">{w.open}<span className="text-3"> / {w.done}</span></span>
                </div>
              ))}
              <div className="row gap-12 mt-12 f-xs">
                <span className="row gap-6 items-center">
                  <span style={{ width: 10, height: 10, background: 'var(--text-2)', borderRadius: 2 }}></span>
                  <span className="text-2">Abiertas</span>
                </span>
                <span className="row gap-6 items-center">
                  <span style={{ width: 10, height: 10, background: 'var(--green)', borderRadius: 2 }}></span>
                  <span className="text-2">Completadas</span>
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span className="title">Tareas por estado</span></div>
            <div style={{ padding: '18px', display: 'flex', gap: 24, alignItems: 'center' }}>
              <Donut data={statusData} size={140} center={TASKS.length} />
              <div className="donut-legend grow">
                {statusData.map(d => (
                  <div key={d.name} className="li">
                    <span className="sw" style={{ background: d.color }}></span>
                    <span className="nm">{d.name}</span>
                    <span className="pct">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 16, marginBottom: 16 }}>
          <div className="card">
            <div className="card-head"><span className="title">% completado por área</span></div>
            <div style={{ padding: '18px', display: 'flex', gap: 24, alignItems: 'center' }}>
              <Donut
                data={areaPct.map(a => ({ value: a.value, color: a.color }))}
                size={140}
                center={Math.round(areaPct.reduce((s, a) => s + a.value, 0) / areaPct.length) + '%'}
              />
              <div className="donut-legend grow">
                {areaPct.map(a => (
                  <div key={a.name} className="li">
                    <span className="sw" style={{ background: a.color }}></span>
                    <span className="nm">{a.name}</span>
                    <span className="pct">{a.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span className="title">Tiempo registrado por proyecto</span></div>
            <div style={{ padding: '14px 18px' }}>
              {PROJECTS.slice(0, 6).map(p => {
                const hrs = (p.progress * 0.4 + 8).toFixed(1);
                const max = 40;
                const area = getArea(p.area)!;
                return (
                  <div key={p.id} className="bar-row">
                    <span className="lbl">{p.name}</span>
                    <div className="bar">
                      <div style={{ width: (parseFloat(hrs) / max * 100) + '%', background: area.color }}></div>
                    </div>
                    <span className="val">{hrs}h</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="title">Evolución semanal · tareas completadas</span></div>
          <div style={{ padding: '18px' }}>
            <svg width="100%" height="180" viewBox="0 0 700 180" preserveAspectRatio="none">
              {[0, 1, 2, 3].map(i => (
                <line key={i} x1="40" x2="700" y1={20 + i * 40} y2={20 + i * 40} stroke="var(--border)" />
              ))}
              {[0, 4, 8, 12, 16].map((v, i) => (
                <text key={i} x="32" y={164 - i * 36} fill="var(--text-3)" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">{v}</text>
              ))}
              <polyline
                points={evolution.map((v, i) => `${50 + i * 100},${160 - v * 9}`).join(' ')}
                fill="none"
                stroke="var(--teal)"
                strokeWidth="2"
              />
              {evolution.map((v, i) => (
                <g key={i}>
                  <circle cx={50 + i * 100} cy={160 - v * 9} r="3" fill="var(--teal)" />
                  <text x={50 + i * 100} y={175} fill="var(--text-3)" fontSize="10" textAnchor="middle" fontFamily="Inter">S{i + 1}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}
