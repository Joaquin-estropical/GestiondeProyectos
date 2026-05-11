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
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 300px', height: 'calc(100% - 89px)' }}>

        {/* Filters */}
        <aside style={{ borderRight: '1px solid var(--border)', padding: '16px', overflowY: 'auto' }}>
          <div className="micro mb-10">Áreas</div>
          <div className="col gap-6 mb-20">
            {areas.map(a => (
              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', padding: '3px 0' }}>
                <input
                  type="checkbox"
                  checked={activeAreas.includes(a.id)}
                  onChange={() => toggleArea(a.id)}
                  style={{ accentColor: a.color, width: 13, height: 13, flexShrink: 0 }}
                />
                <span style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }}></span>
                <span style={{ flex: 1, color: activeAreas.includes(a.id) ? 'var(--text-1)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)' }}>
                  {taskByDay ? Object.values(taskByDay).flat().filter(t => t.area === a.id && t.status !== 'done').length : 0}
                </span>
              </label>
            ))}
            {areas.length === 0 && <div className="text-3 f-xs">Sin áreas</div>}
          </div>
          <div className="micro mb-10">Personas</div>
          <div className="col gap-6">
            {members.map(m => (
              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer', padding: '3px 0' }}>
                <input
                  type="checkbox"
                  checked={activePeople.includes(m.id)}
                  onChange={() => togglePerson(m.id)}
                  style={{ accentColor: 'var(--teal)', width: 13, height: 13, flexShrink: 0 }}
                />
                <Avatar name={m.name} size={18} />
                <span style={{ flex: 1, color: activePeople.includes(m.id) ? 'var(--text-1)' : 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name.split(' ')[0]} {m.name.split(' ')[1]?.[0]}.</span>
              </label>
            ))}
            {members.length === 0 && <div className="text-3 f-xs">Sin miembros</div>}
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
