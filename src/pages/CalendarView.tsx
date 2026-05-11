import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AREAS, TEAM, TASKS, TODAY, DAYS_ES, fmtDate, getMember } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, AreaPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import { getArea } from '@/lib/mock-data';

export default function CalendarView() {
  const { openTask } = useAppStore();
  const [sel, setSel] = useState('2026-03-10');
  const [filtAreas, setFiltAreas] = useState<string[]>(AREAS.map(a => a.id));
  const [filtPeople, setFiltPeople] = useState<string[]>(TEAM.map(m => m.id));

  const toggleArea = (id: string) =>
    setFiltAreas(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const togglePerson = (id: string) =>
    setFiltPeople(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // Build days for March 2026 grid (Mon-first)
  const monthStart = new Date('2026-03-01T12:00:00');
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = 31;
  const cells: { date: Date; muted: boolean }[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startWeekday - i));
    cells.push({ date: d, muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(2026, 2, i, 12), muted: false });
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, muted: true });
    if (cells.length >= 42) break;
  }

  const isoOf = (d: Date) => d.toISOString().slice(0, 10);
  const filteredTasks = TASKS.filter(t => filtAreas.includes(t.area) && filtPeople.includes(t.assignee));
  const taskByDay: Record<string, typeof TASKS> = {};
  filteredTasks.forEach(t => { (taskByDay[t.due] = taskByDay[t.due] || []).push(t); });

  const dayTasks = taskByDay[sel] || [];

  return (
    <>
      <PageHead
        title="Calendario global"
        subtitle="Marzo 2026 · todas las áreas"
        right={
          <div className="row gap-8">
            <button className="btn btn-secondary btn-sm"><ChevronLeft size={14} /></button>
            <button className="btn btn-secondary btn-sm">Hoy</button>
            <button className="btn btn-secondary btn-sm"><ChevronRight size={14} /></button>
            <div className="tabs" style={{ marginLeft: 8 }}>
              <span className="tab active">Mes</span>
              <span className="tab">Semana</span>
              <span className="tab">Día</span>
            </div>
          </div>
        }
      />
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 320px', height: 'calc(100% - 89px)' }}>
        {/* Filters */}
        <aside style={{ borderRight: '1px solid var(--border)', padding: '20px', overflowY: 'auto' }}>
          <div className="micro mb-12">Áreas</div>
          <div className="col gap-8 mb-24">
            {AREAS.map(a => (
              <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filtAreas.includes(a.id)}
                  onChange={() => toggleArea(a.id)}
                  style={{ accentColor: a.color, width: 14, height: 14 }}
                />
                <span className="sb-area-dot" style={{ background: a.color }}></span>
                <span style={{ flex: 1, color: filtAreas.includes(a.id) ? 'var(--text-1)' : 'var(--text-3)' }}>{a.name}</span>
              </label>
            ))}
          </div>
          <div className="micro mb-12">Personas</div>
          <div className="col gap-8">
            {TEAM.map(m => (
              <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filtPeople.includes(m.id)}
                  onChange={() => togglePerson(m.id)}
                  style={{ accentColor: 'var(--teal)', width: 14, height: 14 }}
                />
                <Avatar name={m.name} size={20} />
                <span style={{ flex: 1, color: filtPeople.includes(m.id) ? 'var(--text-1)' : 'var(--text-3)' }}>{m.short}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* Calendar grid */}
        <div style={{ overflowY: 'auto' }}>
          <div className="cal-grid">
            {DAYS_ES.map(d => <div key={d} className="cal-wkh">{d}</div>)}
            {cells.map((c, i) => {
              const iso = isoOf(c.date);
              const isToday = iso === TODAY;
              const isSel = iso === sel;
              const events = taskByDay[iso] || [];
              return (
                <div
                  key={i}
                  className={`cal-cell ${c.muted ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
                  onClick={() => setSel(iso)}
                >
                  <span className="num">{c.date.getDate()}</span>
                  {events.slice(0, 3).map(t => {
                    const a = getArea(t.area)!;
                    return (
                      <div key={t.id} className="cal-event" style={{ background: a.color + '20' }}>
                        <span className="dot" style={{ background: a.color }}></span>{t.title}
                      </div>
                    );
                  })}
                  {events.length > 3 && <div className="micro" style={{ paddingLeft: 4 }}>+{events.length - 3} más</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <aside style={{ borderLeft: '1px solid var(--border)', padding: '20px', overflowY: 'auto' }}>
          <div className="micro mb-8">Detalle del día</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-.01em' }} className="mono">{fmtDate(sel)} 2026</div>
          <div className="text-2 f-sm mt-4">{dayTasks.length} tareas con vencimiento</div>
          <div className="mt-20 col gap-8">
            {dayTasks.length === 0 && (
              <div className="text-3 f-sm" style={{ padding: '18px 0' }}>Sin tareas en este día.</div>
            )}
            {dayTasks.map(t => (
              <div key={t.id} className="card card-pad" style={{ padding: 12, cursor: 'pointer' }} onClick={() => openTask(t.id)}>
                <div className="row gap-8 items-center" style={{ marginBottom: 8 }}>
                  <AreaPill areaId={t.area} mini />
                  <span className="micro mono" style={{ marginLeft: 'auto' }}>{t.code}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{t.title}</div>
                <div className="row gap-8 items-center mt-12">
                  <Avatar name={getMember(t.assignee)?.name ?? ''} size={20} />
                  <span className="f-xs text-2">{getMember(t.assignee)?.short}</span>
                  <span style={{ marginLeft: 'auto' }}><StatusPill status={t.status} /></span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
