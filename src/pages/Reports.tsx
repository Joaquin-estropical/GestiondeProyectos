import { useState, useMemo } from 'react';
import { Download, BarChart3, Users, CheckSquare, AlertTriangle } from 'lucide-react';
import { useAreas, useTasks, useMembers, useProjects } from '@/hooks/useSupabase';
import { Donut } from '@/components/shared/Charts';
import { PageHead } from '@/components/shared/PageHead';
import type { Task } from '@/types';

// ── helpers ──────────────────────────────────────────────────
function isoOf(d: Date) { return d.toISOString().slice(0, 10); }

const STATUS_LABELS: Record<string, string> = {
  curso: 'En curso', pend: 'Pendiente', rev: 'En revisión', block: 'Bloqueado', done: 'Completado',
};
const STATUS_COLORS: Record<string, string> = {
  curso: '#3B82F6', pend: '#5A5A60', rev: '#F59E0B', block: '#EF4444', done: '#22C55E',
};
const STATUS_ORDER = ['pend', 'curso', 'rev', 'block', 'done'];

type Period = '7d' | '30d' | '90d' | 'all';

function cutoffDate(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  d.setDate(d.getDate() - days);
  return isoOf(d);
}

function filterByPeriod(tasks: Task[], period: Period): Task[] {
  const cut = cutoffDate(period);
  if (!cut) return tasks;
  return tasks.filter(t => t.due >= cut);
}

// ── Subcomponents ────────────────────────────────────────────
function BarRow({ label, value, max, color, suffix = '' }: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="bar-row">
      <span className="lbl" style={{ minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div className="bar" style={{ flex: 1 }}>
        <div style={{ width: pct + '%', background: color, height: '100%', borderRadius: 2, transition: 'width .4s' }} />
      </div>
      <span className="val" style={{ minWidth: 40, textAlign: 'right' }}>{value}{suffix}</span>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number | string; sub: string; color?: string;
}) {
  return (
    <div className="card kpi" style={color ? { borderColor: color + '40' } : {}}>
      <div className="lbl"><Icon size={13} color={color} /> {label}</div>
      <div className="val" style={color ? { color } : {}}>{value}</div>
      <div className="sub">{sub}</div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function Reports() {
  const [period, setPeriod] = useState<Period>('30d');

  const { data: areas    = [] } = useAreas();
  const { data: tasks    = [] } = useTasks();
  const { data: members  = [] } = useMembers();
  const { data: projects = [] } = useProjects();

  const periodTasks = useMemo(() => filterByPeriod(tasks, period), [tasks, period]);
  const today = new Date().toISOString().slice(0, 10);

  // KPIs
  const totalDone  = periodTasks.filter(t => t.status === 'done').length;
  const totalOpen  = periodTasks.filter(t => t.status !== 'done').length;
  const totalBlock = periodTasks.filter(t => t.status === 'block').length;
  const overdue    = periodTasks.filter(t => t.status !== 'done' && t.due < today).length;
  const completionRate = periodTasks.length > 0 ? Math.round((totalDone / periodTasks.length) * 100) : 0;

  // Status donut
  const statusData = STATUS_ORDER
    .map(s => ({ name: STATUS_LABELS[s], value: periodTasks.filter(t => t.status === s).length, color: STATUS_COLORS[s] }))
    .filter(d => d.value > 0);

  // Workload per person
  const workload = members
    .map(m => ({
      name:  m.short || m.name.split(' ')[0],
      open:  periodTasks.filter(t => t.assignee === m.id && t.status !== 'done').length,
      done:  periodTasks.filter(t => t.assignee === m.id && t.status === 'done').length,
      total: periodTasks.filter(t => t.assignee === m.id).length,
    }))
    .filter(w => w.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxWorkload = Math.max(...workload.map(w => w.total), 1);

  // Area completion
  const areaPct = areas
    .map(a => {
      const at   = periodTasks.filter(t => t.area === a.id);
      const done = at.filter(t => t.status === 'done').length;
      return { id: a.id, name: a.name, color: a.color, pct: at.length ? Math.round(done / at.length * 100) : 0, total: at.length };
    })
    .filter(a => a.total > 0)
    .sort((a, b) => b.pct - a.pct);

  // Time logged per project
  const parseTime = (t: string) => { const m = t.match(/(\d+)h(?:\s*(\d+)m)?/); return m ? parseInt(m[1]) + (m[2] ? parseInt(m[2]) / 60 : 0) : 0; };
  const projectTime = projects
    .map(p => {
      const hrs  = periodTasks.filter(t => t.project === p.id).reduce((s, t) => s + parseTime(t.time), 0);
      const area = areas.find(a => a.id === p.area);
      return { name: p.name, hrs: Math.round(hrs * 10) / 10, color: area?.color ?? 'var(--teal)' };
    })
    .filter(p => p.hrs > 0)
    .sort((a, b) => b.hrs - a.hrs)
    .slice(0, 8);
  const maxHrs = Math.max(...projectTime.map(p => p.hrs), 1);

  // Weekly trend (last 8 weeks)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end   = new Date(); end.setDate(end.getDate() - (7 - i) * 7);
    const start = new Date(end); start.setDate(start.getDate() - 7);
    const sIso  = isoOf(start); const eIso = isoOf(end);
    const wt    = tasks.filter(t => t.due >= sIso && t.due < eIso);
    return { label: `S${i + 1}`, done: wt.filter(t => t.status === 'done').length, open: wt.filter(t => t.status !== 'done').length };
  });
  const maxWeek = Math.max(...weeks.map(w => w.done + w.open), 1);

  // Overdue by area
  const overdueByArea = areas
    .map(a => ({ name: a.name, color: a.color, count: periodTasks.filter(t => t.area === a.id && t.status !== 'done' && t.due < today).length }))
    .filter(a => a.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxOverdue = Math.max(...overdueByArea.map(a => a.count), 1);

  const handleExport = () => {
    const rows = [
      ['Código', 'Título', 'Área', 'Proyecto', 'Asignado', 'Estado', 'Prioridad', 'Fecha límite', 'Tiempo'],
      ...periodTasks.map(t => [
        t.code, t.title,
        areas.find(a => a.id === t.area)?.name ?? t.area,
        projects.find(p => p.id === t.project)?.name ?? t.project,
        members.find(m => m.id === t.assignee)?.name ?? t.assignee,
        STATUS_LABELS[t.status] ?? t.status,
        t.priority, t.due, t.time,
      ]),
    ];
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `reporte-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (tasks.length === 0) {
    return (
      <>
        <PageHead title="Reportes" subtitle="Análisis y métricas de proyectos" />
        <div className="page-body">
          <div className="empty" style={{ marginTop: 40 }}>
            <div className="ill"><BarChart3 size={22} /></div>
            <p className="t">Sin datos todavía</p>
            <p className="d">Los reportes se generan automáticamente cuando hay tareas registradas en el sistema.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Reportes"
        subtitle={`${periodTasks.length} tareas · ${completionRate}% completadas`}
        right={
          <div className="row gap-8">
            <div className="tabs">
              {(['7d', '30d', '90d', 'all'] as Period[]).map(p => (
                <button key={p} className={`tab${period === p ? ' active' : ''}`} onClick={() => setPeriod(p)}>
                  {p === 'all' ? 'Todo' : p}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        }
      />

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPIs */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <KpiCard icon={CheckSquare}    label="Completadas"  value={totalDone}  sub={`de ${periodTasks.length} total`}  color="var(--green)" />
          <KpiCard icon={BarChart3}      label="En progreso"  value={totalOpen}  sub="sin completar" />
          <KpiCard icon={AlertTriangle}  label="Vencidas"     value={overdue}    sub="pasaron su fecha"   color={overdue > 0 ? 'var(--red)' : undefined} />
          <KpiCard icon={Users}          label="Bloqueadas"   value={totalBlock} sub="requieren atención" color={totalBlock > 0 ? 'var(--amber)' : undefined} />
        </div>

        {/* Fila 1: carga de trabajo + distribución estado */}
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head"><span className="title">Carga de trabajo por persona</span></div>
            <div style={{ padding: '10px 18px 16px' }}>
              {workload.length === 0
                ? <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>Sin datos en este período.</div>
                : workload.map(w => (
                  <div key={w.name} className="bar-row">
                    <span className="lbl" style={{ minWidth: 80 }}>{w.name}</span>
                    <div className="bar" style={{ flex: 1, position: 'relative', height: 8, borderRadius: 4, background: 'var(--surface-2)' }}>
                      <div style={{ width: (w.total / maxWorkload * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--border-hover)', position: 'absolute' }} />
                      <div style={{ width: (w.done  / maxWorkload * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--green)',        position: 'absolute' }} />
                    </div>
                    <span className="val" style={{ minWidth: 52, textAlign: 'right', fontSize: 12 }}>
                      {w.done}<span style={{ color: 'var(--text-3)' }}>/{w.total}</span>
                    </span>
                  </div>
                ))
              }
              {workload.length > 0 && (
                <div className="row gap-12 mt-10" style={{ fontSize: 11.5 }}>
                  <span className="row gap-6 items-center"><span style={{ width: 10, height: 6, background: 'var(--green)', borderRadius: 2 }} /><span className="text-2">Completadas</span></span>
                  <span className="row gap-6 items-center"><span style={{ width: 10, height: 6, background: 'var(--border-hover)', borderRadius: 2 }} /><span className="text-2">Total asignadas</span></span>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span className="title">Distribución por estado</span></div>
            <div style={{ padding: '18px', display: 'flex', gap: 20, alignItems: 'center' }}>
              {statusData.length > 0
                ? <>
                    <Donut data={statusData} size={130} center={periodTasks.length} />
                    <div className="donut-legend grow">
                      {statusData.map(d => (
                        <div key={d.name} className="li">
                          <span className="sw" style={{ background: d.color }} />
                          <span className="nm">{d.name}</span>
                          <span className="pct">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                : <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin datos.</div>
              }
            </div>
          </div>
        </div>

        {/* Fila 2: completado por área + tiempo por proyecto */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
          <div className="card">
            <div className="card-head"><span className="title">% completado por área</span></div>
            <div style={{ padding: '18px', display: 'flex', gap: 20, alignItems: 'center' }}>
              {areaPct.length > 0
                ? <>
                    <Donut
                      data={areaPct.map(a => ({ value: a.pct, color: a.color }))}
                      size={130}
                      center={Math.round(areaPct.reduce((s, a) => s + a.pct, 0) / areaPct.length) + '%'}
                    />
                    <div className="donut-legend grow">
                      {areaPct.map(a => (
                        <div key={a.name} className="li">
                          <span className="sw" style={{ background: a.color }} />
                          <span className="nm">{a.name}</span>
                          <span className="pct">{a.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                : <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Sin datos en este período.</div>
              }
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span className="title">Tiempo registrado por proyecto</span></div>
            <div style={{ padding: '10px 18px 16px' }}>
              {projectTime.length === 0
                ? <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>Sin tiempo registrado.</div>
                : projectTime.map(p => <BarRow key={p.name} label={p.name} value={p.hrs} max={maxHrs} color={p.color} suffix="h" />)
              }
            </div>
          </div>
        </div>

        {/* Fila 3: tendencia semanal + vencidas por área */}
        <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head"><span className="title">Tendencia semanal · tareas por fecha límite</span></div>
            <div style={{ padding: '18px' }}>
              <svg width="100%" height="160" viewBox="0 0 740 160" preserveAspectRatio="xMidYMid meet">
                {[0, 1, 2, 3].map(i => (
                  <line key={i} x1="40" x2="740" y1={20 + i * 34} y2={20 + i * 34} stroke="var(--border)" strokeDasharray="4 4" />
                ))}
                {weeks.map((w, i) => {
                  const x  = 70 + i * 85;
                  const dH = maxWeek > 0 ? (w.done / maxWeek) * 110 : 0;
                  const oH = maxWeek > 0 ? (w.open / maxWeek) * 110 : 0;
                  return (
                    <g key={i}>
                      <rect x={x - 16} y={140 - oH - dH} width={14} height={oH} fill="var(--border-hover)" rx="2" />
                      <rect x={x - 16} y={140 - dH}       width={14} height={dH} fill="var(--green)"        rx="2" />
                      <text x={x - 9} y={155} fill="var(--text-3)" fontSize="10" textAnchor="middle" fontFamily="Inter">{w.label}</text>
                    </g>
                  );
                })}
                <line x1="40" x2="40" y1="15" y2="145" stroke="var(--border)" />
                {[0, 1, 2, 3].map(i => {
                  const v = Math.round(maxWeek * (3 - i) / 3);
                  return <text key={i} x="34" y={24 + i * 34} fill="var(--text-3)" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">{v}</text>;
                })}
              </svg>
              <div className="row gap-12 mt-4" style={{ fontSize: 11.5, paddingLeft: 40 }}>
                <span className="row gap-6 items-center"><span style={{ width: 10, height: 6, background: 'var(--green)', borderRadius: 2 }} /><span className="text-2">Completadas</span></span>
                <span className="row gap-6 items-center"><span style={{ width: 10, height: 6, background: 'var(--border-hover)', borderRadius: 2 }} /><span className="text-2">Abiertas</span></span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span className="title">Vencidas por área</span></div>
            <div style={{ padding: '10px 18px 16px' }}>
              {overdueByArea.length === 0
                ? <div style={{ padding: '20px 0', color: 'var(--green)', fontSize: 13, textAlign: 'center' }}>✓ Sin tareas vencidas</div>
                : overdueByArea.map(a => <BarRow key={a.name} label={a.name} value={a.count} max={maxOverdue} color={a.color} />)
              }
            </div>
          </div>
        </div>

        {/* Performance por persona */}
        {members.length > 0 && (
          <div className="card">
            <div className="card-head">
              <span className="title">Performance por persona</span>
              <span className="micro" style={{ marginLeft: 'auto' }}>{period === 'all' ? 'Histórico' : `Últimos ${period}`}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Persona', 'Asignadas', 'Completadas', 'Tasa cumpl.', 'Vencidas', 'Promedio días'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Persona' ? 'left' : 'center', color: 'var(--text-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const mTasks   = periodTasks.filter(t => t.assignee === m.id);
                    const mDone    = mTasks.filter(t => t.status === 'done');
                    const mOverdue = mTasks.filter(t => t.status !== 'done' && t.due < today);
                    const rate     = mTasks.length > 0 ? Math.round(mDone.length / mTasks.length * 100) : 0;
                    // Rough avg days: due - today for open, ignore closed timing (no completed_at in DB yet)
                    const avgDays  = mDone.length > 0
                      ? Math.round(mDone.reduce((s, t) => {
                          const diff = (new Date(t.due).getTime() - new Date(t.start_date ?? t.due).getTime()) / 86400000;
                          return s + Math.max(0, diff);
                        }, 0) / mDone.length)
                      : null;
                    if (mTasks.length === 0) return null;
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 500 }}>{m.name}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{mTasks.length}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--green)' }}>{mDone.length}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            background: rate >= 80 ? 'rgba(34,197,94,.12)' : rate >= 50 ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.12)',
                            color: rate >= 80 ? 'var(--green)' : rate >= 50 ? 'var(--amber)' : 'var(--red)',
                          }}>
                            {rate}%
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: mOverdue.length > 0 ? 'var(--red)' : 'var(--text-3)' }}>
                          {mOverdue.length}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                          {avgDays !== null ? `${avgDays}d` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabla detalle */}
        <div className="card">
          <div className="card-head">
            <span className="title">Listado de tareas</span>
            <span className="micro" style={{ marginLeft: 'auto' }}>{periodTasks.length} tareas en el período</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Código', 'Título', 'Área', 'Asignado', 'Estado', 'Vence', 'Tiempo'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodTasks.slice(0, 50).map(t => {
                  const area   = areas.find(a => a.id === t.area);
                  const member = members.find(m => m.id === t.assignee);
                  const isOver = t.status !== 'done' && t.due < today;
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 14px', fontFamily: 'JetBrains Mono,monospace', color: 'var(--text-3)', fontSize: 11 }}>{t.code}</td>
                      <td style={{ padding: '8px 14px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                      <td style={{ padding: '8px 14px' }}>
                        {area && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: area.color, flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{area.name}</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 14px', color: 'var(--text-2)' }}>{member?.name?.split(' ')[0] ?? t.assignee}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: STATUS_COLORS[t.status] + '20', color: STATUS_COLORS[t.status] }}>
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 14px', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: isOver ? 'var(--red)' : 'var(--text-3)' }}>{t.due}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: 'var(--text-3)' }}>{t.time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {periodTasks.length > 50 && (
              <div style={{ padding: '10px 14px', color: 'var(--text-3)', fontSize: 12 }}>
                Mostrando 50 de {periodTasks.length} tareas. Exportá CSV para ver todas.
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
