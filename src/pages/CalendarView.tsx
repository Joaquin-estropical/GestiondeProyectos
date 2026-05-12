import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { DAYS_ES } from '@/lib/mock-data';
import { useAreas, useTasks, useMembers } from '@/hooks/useSupabase';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, AreaPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import type { Task } from '@/types';

const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type CalView = 'month' | 'week' | 'year';

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - day);
  r.setHours(0, 0, 0, 0);
  return r;
}

// ── Month view ───────────────────────────────────────────────
function MonthGrid({ year, month, todayIso, sel, tasks, areaColor, onSelect, onNewTask }: {
  year: number; month: number; todayIso: string; sel: string;
  tasks: Task[]; areaColor: (id: string) => string;
  onSelect: (iso: string) => void; onNewTask: (iso: string) => void;
}) {
  const monthStart   = new Date(year, month, 1);
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const cells: { date: Date; muted: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(monthStart); d.setDate(d.getDate() - (startWeekday - i));
    cells.push({ date: d, muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(year, month, i, 12), muted: false });
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last); d.setDate(d.getDate() + 1);
    cells.push({ date: d, muted: true });
    if (cells.length >= 42) break;
  }
  const taskByDay: Record<string, Task[]> = {};
  tasks.forEach(t => { (taskByDay[t.due] = taskByDay[t.due] || []).push(t); });

  return (
    <div className="cal-grid" style={{ flex: 1 }}>
      {DAYS_ES.map(d => <div key={d} className="cal-wkh">{d}</div>)}
      {cells.map((c, i) => {
        const iso     = isoDate(c.date);
        const isToday = iso === todayIso;
        const isSel   = iso === sel;
        const evts    = taskByDay[iso] || [];
        return (
          <div
            key={i}
            className={`cal-cell${c.muted ? ' muted' : ''}${isToday ? ' today' : ''}${isSel ? ' sel' : ''}`}
            onClick={() => onSelect(iso)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 18 }}>
              <span className="num">{c.date.getDate()}</span>
              {!c.muted && (
                <button
                  className="btn btn-ghost btn-icon cal-add-btn"
                  style={{ width: 16, height: 16 }}
                  onClick={e => { e.stopPropagation(); onNewTask(iso); }}
                  title="Nueva tarea"
                >
                  <Plus size={10} />
                </button>
              )}
            </div>
            {evts.slice(0, 3).map(t => (
              <div key={t.id} className="cal-event" style={{ background: areaColor(t.area) + '22' }} title={t.title}>
                <span className="dot" style={{ background: areaColor(t.area) }}></span>
                {t.title}
              </div>
            ))}
            {evts.length > 3 && <div className="micro" style={{ paddingLeft: 4, color: 'var(--text-3)' }}>+{evts.length - 3} más</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Week view ────────────────────────────────────────────────
function WeekGrid({ weekStart, todayIso, sel, tasks, areaColor, onSelect, onNewTask }: {
  weekStart: Date; todayIso: string; sel: string;
  tasks: Task[]; areaColor: (id: string) => string;
  onSelect: (iso: string) => void; onNewTask: (iso: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const taskByDay: Record<string, Task[]> = {};
  tasks.forEach(t => { (taskByDay[t.due] = taskByDay[t.due] || []).push(t); });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {days.map((d, i) => {
        const iso     = isoDate(d);
        const isToday = iso === todayIso;
        const isSel   = iso === sel;
        const evts    = taskByDay[iso] || [];
        return (
          <div
            key={i}
            onClick={() => onSelect(iso)}
            style={{
              borderRight: i < 6 ? '1px solid var(--border)' : 'none',
              background: isSel ? 'var(--surface-1)' : isToday ? 'rgba(20,184,166,.04)' : 'transparent',
              cursor: 'pointer', minHeight: 120, display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{DAYS_ES[i]}</div>
                <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2, marginTop: 2, color: isToday ? 'var(--teal)' : isSel ? 'var(--text-1)' : 'var(--text-2)' }}>
                  {d.getDate()}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                style={{ width: 22, height: 22 }}
                onClick={e => { e.stopPropagation(); onNewTask(iso); }}
                title="Nueva tarea"
              >
                <Plus size={12} />
              </button>
            </div>
            <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
              {evts.map(t => (
                <div
                  key={t.id}
                  style={{
                    padding: '3px 7px', borderRadius: 4, fontSize: 11.5, lineHeight: 1.4,
                    background: areaColor(t.area) + '22',
                    borderLeft: `2px solid ${areaColor(t.area)}`,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                  title={t.title}
                >
                  {t.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Year view ────────────────────────────────────────────────
function YearGrid({ year, todayIso, tasks, onSelect }: {
  year: number; todayIso: string; tasks: Task[]; onSelect: (iso: string) => void;
}) {
  const taskByDay: Record<string, number> = {};
  tasks.forEach(t => { taskByDay[t.due] = (taskByDay[t.due] || 0) + 1; });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {Array.from({ length: 12 }, (_, m) => {
        const monthStart   = new Date(year, m, 1);
        const startWeekday = (monthStart.getDay() + 6) % 7;
        const daysInMonth  = new Date(year, m + 1, 0).getDate();
        const cells: (number | null)[] = [];
        for (let i = 0; i < startWeekday; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(i);
        while (cells.length % 7 !== 0) cells.push(null);
        return (
          <div key={m} style={{ background: 'var(--surface-1)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>{MONTHS_SHORT[m]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {['L','M','X','J','V','S','D'].map(d => (
                <div key={d} style={{ fontSize: 9, textAlign: 'center', color: 'var(--text-3)', fontWeight: 600, paddingBottom: 2 }}>{d}</div>
              ))}
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const iso      = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday  = iso === todayIso;
                const cnt      = taskByDay[iso] || 0;
                return (
                  <div
                    key={i}
                    onClick={() => onSelect(iso)}
                    title={cnt > 0 ? `${cnt} tarea${cnt > 1 ? 's' : ''}` : iso}
                    style={{
                      fontSize: 9.5, textAlign: 'center', lineHeight: '17px', borderRadius: 3,
                      cursor: 'pointer', position: 'relative',
                      background: isToday ? 'var(--teal)' : cnt > 0 ? 'var(--teal-bg)' : 'transparent',
                      color: isToday ? '#00302A' : cnt > 0 ? 'var(--teal)' : 'var(--text-3)',
                      fontWeight: isToday || cnt > 0 ? 600 : 400,
                    }}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────
export default function CalendarView() {
  const { openTask, openNewTask } = useAppStore();
  const today    = new Date();
  const todayIso = isoDate(today);

  const [view,      setView]      = useState<CalView>('month');
  const [year,      setYear]      = useState(today.getFullYear());
  const [month,     setMonth]     = useState(today.getMonth());
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [sel,       setSel]       = useState(todayIso);

  const { data: areas   = [] } = useAreas();
  const { data: tasks   = [] } = useTasks();
  const { data: members = [] } = useMembers();

  const [filtAreas,  setFiltAreas]  = useState<string[] | null>(null);
  const [filtPeople, setFiltPeople] = useState<string[] | null>(null);

  const activeAreas  = filtAreas  ?? areas.map(a => a.id);
  const activePeople = filtPeople ?? members.map(m => m.id);

  const toggleArea = (id: string) =>
    setFiltAreas(prev => { const cur = prev ?? areas.map(a => a.id); return cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; });
  const togglePerson = (id: string) =>
    setFiltPeople(prev => { const cur = prev ?? members.map(m => m.id); return cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; });

  const filtered = tasks.filter(t => activeAreas.includes(t.area) && activePeople.includes(t.assignee));
  const areaColor = (id: string) => areas.find(a => a.id === id)?.color ?? 'var(--text-3)';

  const taskByDay: Record<string, Task[]> = {};
  filtered.forEach(t => { (taskByDay[t.due] = taskByDay[t.due] || []).push(t); });

  const prevPeriod = () => {
    if (view === 'month')      { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
    else if (view === 'week')  { setWeekStart(d => addDays(d, -7)); }
    else                       { setYear(y => y - 1); }
  };
  const nextPeriod = () => {
    if (view === 'month')      { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }
    else if (view === 'week')  { setWeekStart(d => addDays(d, 7)); }
    else                       { setYear(y => y + 1); }
  };
  const goToday = () => {
    setYear(today.getFullYear()); setMonth(today.getMonth());
    setWeekStart(startOfWeek(today)); setSel(todayIso);
  };

  const handleSelect = (iso: string) => {
    setSel(iso);
    if (view === 'year') {
      const d = new Date(iso + 'T12:00:00');
      setYear(d.getFullYear()); setMonth(d.getMonth()); setView('month');
    }
  };
  const handleNewTask = (iso: string) => { setSel(iso); openNewTask(undefined, iso); };

  const dayTasks = taskByDay[sel] || [];
  const periodLabel = view === 'month' ? `${MONTHS_FULL[month]} ${year}`
    : view === 'week' ? `${addDays(weekStart, 0).getDate()} – ${addDays(weekStart, 6).getDate()} ${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    : String(year);

  return (
    <>
      <PageHead
        title="Calendario global"
        subtitle={`${periodLabel} · ${filtered.filter(t => t.status !== 'done').length} tareas abiertas`}
        right={
          <div className="row gap-8">
            <div className="tabs">
              {(['month', 'week', 'year'] as CalView[]).map(v => (
                <button key={v} className={`tab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
                  {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Año'}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={prevPeriod}><ChevronLeft size={14} /></button>
            <button className="btn btn-secondary btn-sm" onClick={goToday}>Hoy</button>
            <button className="btn btn-secondary btn-sm" onClick={nextPeriod}><ChevronRight size={14} /></button>
            <button className="btn btn-primary btn-sm" onClick={() => handleNewTask(sel)}><Plus size={13} /> Nueva tarea</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: view === 'year' ? '240px 1fr' : '240px 1fr 280px', height: 'calc(100% - 89px)' }}>

        {/* Sidebar filtros */}
        <aside style={{ borderRight: '1px solid var(--border)', padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="micro">Áreas</span>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '0 6px', height: 20 }}
              onClick={() => setFiltAreas(activeAreas.length === areas.length ? [] : null)}>
              {activeAreas.length === areas.length ? 'Ninguna' : 'Todas'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
            {areas.map(a => {
              const on  = activeAreas.includes(a.id);
              const cnt = Object.values(taskByDay).flat().filter(t => t.area === a.id && t.status !== 'done').length;
              return (
                <button key={a.id} onClick={() => toggleArea(a.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 6,
                  cursor: 'pointer', border: 'none',
                  background: on ? a.color + '15' : 'transparent',
                  outline: on ? `1px solid ${a.color}40` : '1px solid transparent',
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: on ? a.color : 'var(--border-hover)' }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: on ? 'var(--text-1)' : 'var(--text-3)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  {cnt > 0 && <span style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono,monospace', color: on ? a.color : 'var(--text-3)', background: on ? a.color + '20' : 'var(--surface-2)', padding: '0 5px', borderRadius: 999, lineHeight: 1.6 }}>{cnt}</span>}
                </button>
              );
            })}
            {areas.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '6px 0' }}>Sin áreas</div>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="micro">Personas</span>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '0 6px', height: 20 }}
              onClick={() => setFiltPeople(activePeople.length === members.length ? [] : null)}>
              {activePeople.length === members.length ? 'Ninguna' : 'Todas'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {members.map(m => {
              const on = activePeople.includes(m.id);
              return (
                <button key={m.id} onClick={() => togglePerson(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 6,
                  cursor: 'pointer', border: 'none',
                  background: on ? 'var(--teal-bg)' : 'transparent',
                  outline: on ? '1px solid rgba(20,184,166,.3)' : '1px solid transparent',
                }}>
                  <Avatar name={m.name} size={22} style={{ opacity: on ? 1 : 0.4 }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: on ? 'var(--text-1)' : 'var(--text-3)', textAlign: 'left' }}>
                    {m.name.split(' ')[0]} {m.name.split(' ')[1]?.[0]}.
                  </span>
                  {on && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--teal)', flexShrink: 0 }} />}
                </button>
              );
            })}
            {members.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 12, padding: '6px 0' }}>Sin miembros</div>}
          </div>
        </aside>

        {/* Vista principal */}
        <div style={{ overflowY: view === 'year' ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column', padding: view === 'year' ? 16 : 0 }}>
          {view === 'month' && <MonthGrid year={year} month={month} todayIso={todayIso} sel={sel} tasks={filtered} areaColor={areaColor} onSelect={handleSelect} onNewTask={handleNewTask} />}
          {view === 'week'  && <WeekGrid  weekStart={weekStart} todayIso={todayIso} sel={sel} tasks={filtered} areaColor={areaColor} onSelect={handleSelect} onNewTask={handleNewTask} />}
          {view === 'year'  && <YearGrid  year={year} todayIso={todayIso} tasks={filtered} onSelect={handleSelect} />}
        </div>

        {/* Detalle del día (solo en month/week) */}
        {view !== 'year' && (
          <aside style={{ borderLeft: '1px solid var(--border)', padding: '14px', overflowY: 'auto' }}>
            <div className="micro mb-6">Detalle del día</div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-.01em', marginBottom: 4 }}>
              {sel ? new Date(sel + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}
            </div>
            <div className="text-2 f-sm mb-10">{dayTasks.length} tareas</div>
            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 14 }}
              onClick={() => handleNewTask(sel)}
            >
              <Plus size={13} /> Crear tarea este día
            </button>
            <div className="col gap-8">
              {dayTasks.length === 0 && (
                <div style={{ padding: '14px 0', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>Sin tareas este día.</div>
              )}
              {dayTasks.map(t => {
                const member = members.find(m => m.id === t.assignee);
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
        )}
      </div>
    </>
  );
}
