import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DAYS_ES, getMember } from '@/lib/mock-data';
import { useAreas, useTasks, useMembers } from '@/hooks/useSupabase';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, AreaPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import type { Task } from '@/types';

const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function CalendarView() {
  const { openTask } = useAppStore();
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [sel,   setSel]   = useState(today.toISOString().slice(0, 10));

  const { data: areas   = [] } = useAreas();
  const { data: tasks   = [] } = useTasks();
  const { data: members = [] } = useMembers();

  const [filtAreas,  setFiltAreas]  = useState<string[] | null>(null);
  const [filtPeople, setFiltPeople] = useState<string[] | null>(null);

  const activeAreas  = filtAreas  ?? areas.map(a => a.id);
  const activePeople = filtPeople ?? members.map(m => m.id);

  const toggleArea = (id: string) =>
    setFiltAreas(prev => {
      const cur = prev ?? areas.map(a => a.id);
      return cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    });
  const togglePerson = (id: string) =>
    setFiltPeople(prev => {
      const cur = prev ?? members.map(m => m.id);
      return cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    });

  // Build calendar grid
  const monthStart   = new Date(year, month, 1);
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; muted: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startWeekday - i));
    cells.push({ date: d, muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(year, month, i, 12), muted: false });
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, muted: true });
    if (cells.length >= 42) break;
  }

  const isoOf    = (d: Date) => d.toISOString().slice(0, 10);
  const todayIso = today.toISOString().slice(0, 10);

  const filtered: Task[] = tasks.filter(t => activeAreas.includes(t.area) && activePeople.includes(t.assignee));
  const taskByDay: Record<string, Task[]> = {};
  filtered.forEach(t => { (taskByDay[t.due] = taskByDay[t.due] || []).push(t); });

  const dayTasks = taskByDay[sel] || [];

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSel(todayIso); };

  const areaColor = (id: string) => areas.find(a => a.id === id)?.color ?? 'var(--text-3)';

  return (
    <>
      <PageHead
        title="Calendario global"
        subtitle={`${MONTHS_FULL[month]} ${year} · ${filtered.filter(t => t.status !== 'done').length} tareas abiertas`}
        right={
          <div className="row gap-8">
            <button className="btn btn-secondary btn-sm" onClick={prev}><ChevronLeft size={14} /></button>
            <button className="btn btn-secondary btn-sm" onClick={goToday}>Hoy</button>
            <button className="btn btn-secondary btn-sm" onClick={next}><ChevronRight size={14} /></button>
          </div>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 300px', height: 'calc(100% - 89px)' }}>

        {/* Filters */}
        <aside style={{ borderRight: '1px solid var(--border)', padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="micro">Áreas</span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: '0 6px', height: 20 }}
              onClick={() => setFiltAreas(activeAreas.length === areas.length ? [] : null)}
            >
              {activeAreas.length === areas.length ? 'Ninguna' : 'Todas'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
            {areas.map(a => {
              const on = activeAreas.includes(a.id);
              const cnt = Object.values(taskByDay).flat().filter(t => t.area === a.id && t.status !== 'done').length;
              return (
                <button
                  key={a.id}
                  onClick={() => toggleArea(a.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
                    background: on ? a.color + '15' : 'transparent',
                    outline: on ? `1px solid ${a.color}40` : '1px solid transparent',
                    transition: 'background 0.12s, outline 0.12s',
                  }}
                >
                  <span style={{
                    width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                    background: on ? a.color : 'var(--border-hover)',
                    transition: 'background 0.12s',
                  }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: on ? 'var(--text-1)' : 'var(--text-3)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  {cnt > 0 && <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: on ? a.color : 'var(--text-3)', background: on ? a.color + '20' : 'var(--surface-2)', padding: '0 5px', borderRadius: 999, lineHeight: 1.6 }}>{cnt}</span>}
                </button>
              );
            })}
            {areas.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>Sin áreas creadas</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span className="micro">Personas</span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: '0 6px', height: 20 }}
              onClick={() => setFiltPeople(activePeople.length === members.length ? [] : null)}
            >
              {activePeople.length === members.length ? 'Ninguna' : 'Todas'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {members.map(m => {
              const on = activePeople.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => togglePerson(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 6, cursor: 'pointer', border: 'none',
                    background: on ? 'var(--teal-bg)' : 'transparent',
                    outline: on ? '1px solid rgba(20,184,166,.3)' : '1px solid transparent',
                    transition: 'background 0.12s, outline 0.12s',
                  }}
                >
                  <Avatar name={m.name} size={24} style={{ opacity: on ? 1 : 0.4, transition: 'opacity .12s' }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: on ? 'var(--text-1)' : 'var(--text-3)', textAlign: 'left' }}>{m.name.split(' ')[0]} {m.name.split(' ')[1]?.[0]}.</span>
                  {on && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--teal)', flexShrink: 0 }} />}
                </button>
              );
            })}
            {members.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '8px 0' }}>Sin miembros</div>}
          </div>
        </aside>

        {/* Calendar grid */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="cal-grid" style={{ flex: 1 }}>
            {DAYS_ES.map(d => <div key={d} className="cal-wkh">{d}</div>)}
            {cells.map((c, i) => {
              const iso    = isoOf(c.date);
              const isToday = iso === todayIso;
              const isSel   = iso === sel;
              const evts    = taskByDay[iso] || [];
              return (
                <div
                  key={i}
                  className={`cal-cell ${c.muted ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
                  onClick={() => setSel(iso)}
                >
                  <span className="num">{c.date.getDate()}</span>
                  {evts.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      className="cal-event"
                      style={{ background: areaColor(t.area) + '22', color: 'var(--text-1)' }}
                      onClick={e => { e.stopPropagation(); openTask(t.id); }}
                    >
                      <span className="dot" style={{ background: areaColor(t.area) }}></span>
                      {t.title}
                    </div>
                  ))}
                  {evts.length > 3 && <div className="micro" style={{ paddingLeft: 4, color: 'var(--text-3)' }}>+{evts.length - 3} más</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <aside style={{ borderLeft: '1px solid var(--border)', padding: '16px', overflowY: 'auto' }}>
          <div className="micro mb-6">Detalle del día</div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.01em', marginBottom: 4 }}>
            {sel ? new Date(sel + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}
          </div>
          <div className="text-2 f-sm mb-16">{dayTasks.length} tareas con vencimiento</div>
          <div className="col gap-8">
            {dayTasks.length === 0 && (
              <div style={{ padding: '20px 0', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>Sin tareas este día.</div>
            )}
            {dayTasks.map(t => {
              const member = members.find(m => m.id === t.assignee) ?? getMember(t.assignee);
              return (
                <div key={t.id} className="card" style={{ padding: 12, cursor: 'pointer' }} onClick={() => openTask(t.id)}>
                  <div className="row gap-8 items-center mb-8">
                    <AreaPill areaId={t.area} mini />
                    <span className="micro mono" style={{ marginLeft: 'auto' }}>{t.code}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, marginBottom: 10 }}>{t.title}</div>
                  <div className="row gap-8 items-center">
                    <Avatar name={member?.name ?? '?'} size={20} />
                    <span className="f-xs text-2" style={{ flex: 1 }}>{member?.name?.split(' ')[0]}</span>
                    <StatusPill status={t.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
