// ════════════ Screens · part 1: Dashboard, MyDay, Calendar, Reports, AI, Settings, Empty ════════════

// ─── Dashboard ───
const Dashboard = ({ navigate, openTask }) => {
  const today = window.TASKS.filter(t => t.status !== 'done' && window.daysFromToday(t.due) >= -1 && window.daysFromToday(t.due) <= 1);
  const overdue = window.TASKS.filter(t => t.status !== 'done' && window.daysFromToday(t.due) < 0);
  const risk = window.TASKS.filter(t => t.status === 'block' || (t.status !== 'done' && window.daysFromToday(t.due) >= 0 && window.daysFromToday(t.due) <= 2 && t.priority !== 'baja'));

  const myTasks = window.TASKS.filter(t => t.assignee === 'joa' && t.status !== 'done').slice(0, 5);
  const activityIcon = (k) => k === 'done' ? 'circle-check' : k === 'comment' ? 'message-square' : k === 'block' ? 'octagon-alert' : k === 'assign' ? 'user-plus' : k === 'create' ? 'plus' : 'arrow-right';
  const activityColor = (k) => k === 'done' ? 'var(--green)' : k === 'block' ? 'var(--red)' : k === 'create' ? 'var(--teal)' : 'var(--text-2)';

  const areaLoad = window.AREAS.map(a => {
    const proj = window.PROJECTS.filter(p => p.area === a.id);
    const tasks = window.TASKS.filter(t => t.area === a.id);
    const open = tasks.filter(t => t.status !== 'done').length;
    return { ...a, projects: proj.length, openTasks: open, progress: Math.round(proj.reduce((s, p) => s + p.progress, 0) / Math.max(proj.length, 1)) };
  });

  return (
    <>
      <PageHead
        title="Hola, Joaquín"
        subtitle="Martes 10 de marzo · 5 áreas activas · 18 tareas abiertas"
        right={<div className="row gap-8">
          <button className="btn btn-secondary btn-md"><Ico name="filter" /> Filtros</button>
          <button className="btn btn-primary btn-md"><Ico name="plus" /> Nueva tarea</button>
        </div>}
      />
      <div className="page-body" style={{ display:'flex', flexDirection:'column', gap:24 }}>

        {/* KPIs */}
        <div className="grid" style={{ gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
          <div className="card kpi"><div className="lbl"><Ico name="list-todo" size={13} /> Tareas hoy</div><div className="val">8</div><div className="sub">+2 vs ayer</div></div>
          <div className="card kpi danger"><div className="lbl"><Ico name="circle-alert" size={13} /> Vencidas</div><div className="val">2</div><div className="sub">En 2 áreas</div></div>
          <div className="card kpi warn"><div className="lbl"><Ico name="triangle-alert" size={13} /> En riesgo</div><div className="val">3</div><div className="sub">Fecha próxima</div></div>
          <div className="card kpi ok"><div className="lbl"><Ico name="circle-check" size={13} /> Completadas semana</div><div className="val">24</div><div className="sub">+15% vs semana pasada</div></div>
        </div>

        {/* AI summary */}
        <div className="card" style={{ borderColor:'rgba(20,184,166,.25)', background:'linear-gradient(180deg, rgba(20,184,166,.04), transparent)' }}>
          <div className="card-pad">
            <div className="row gap-10 items-center">
              <span style={{ width:28, height:28, borderRadius:6, background:'var(--teal-bg)', display:'grid', placeItems:'center', color:'var(--teal)' }}>
                <Ico name="sparkles" size={14} />
              </span>
              <div className="fw-6">Resumen IA del día</div>
              <span className="micro" style={{ marginLeft:'auto' }}>Generado hace 2 min</span>
            </div>
            <p style={{ margin:'14px 0 0', color:'var(--text-1)', fontSize:14, lineHeight:1.6, maxWidth:780 }}>
              Tenés <span className="fw-6">2 tareas vencidas</span> que requieren atención inmediata, ambas en Outlet Centro y bloqueando el avance de Remodelación local. <span className="fw-6">Migración POS</span> presenta riesgo: la tarea crítica de backup vence hoy y está en revisión. Las áreas de <span className="fw-6">Bodega Sur</span> y <span className="fw-6">Edificio Corporativo</span> bajaron su ritmo de cierre esta semana — recomiendo reasignar carga de Carlos R.
            </p>
            <div className="row gap-8 mt-16">
              <button className="btn btn-secondary btn-sm"><Ico name="zap" /> Resolver vencidas</button>
              <button className="btn btn-secondary btn-sm"><Ico name="users" /> Rebalancear carga</button>
              <button className="btn btn-ghost btn-sm">Ver detalle <Ico name="arrow-right" /></button>
            </div>
          </div>
        </div>

        {/* Two columns */}
        <div className="grid" style={{ gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
          <div className="card">
            <div className="card-head">
              <span className="title">Mis tareas hoy</span>
              <span className="micro" style={{ marginLeft:'auto' }}>{myTasks.length} pendientes</span>
            </div>
            <div>
              {myTasks.map(t => {
                const m = window.MEMBER(t.assignee);
                const due = window.daysFromToday(t.due);
                const dueLbl = due < 0 ? `Vencida · ${window.fmtDate(t.due)}` : due === 0 ? 'Hoy' : due === 1 ? 'Mañana' : window.fmtDate(t.due);
                return (
                  <div key={t.id} onClick={() => openTask(t.id)}
                    style={{ padding:'10px 18px', borderBottom:'1px solid var(--border)', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
                    <span className="check"></span>
                    <span style={{ flex:1, fontSize:13.5 }}>{t.title}</span>
                    <AreaPill id={t.area} mini />
                    <span className="mono" style={{ fontSize:12, color:window.dueColor(t.due), minWidth:80, textAlign:'right' }}>{dueLbl}</span>
                    <StatusPill status={t.status} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <span className="title">Actividad reciente</span>
            </div>
            <div style={{ padding:'8px 18px 12px' }}>
              {window.ACTIVITY.map((a, i) => {
                const m = window.MEMBER(a.who);
                return (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom: i < window.ACTIVITY.length - 1 ? '1px solid var(--border)' : '' }}>
                    <Avatar name={m.name} size={22} />
                    <div style={{ flex:1, fontSize:12.5, lineHeight:1.5 }}>
                      <span className="fw-5">{m.short}</span> <span className="text-2">{a.action}</span> <span className="fw-5">{a.target}</span>
                      <div className="mono" style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{a.when}</div>
                    </div>
                    <span style={{ color: activityColor(a.kind), marginTop:2 }}>
                      <Ico name={activityIcon(a.kind)} size={14} color={activityColor(a.kind)} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Areas */}
        <div>
          <div className="section-title">Áreas más activas</div>
          <div className="grid" style={{ gridTemplateColumns:'repeat(5, 1fr)', gap:12 }}>
            {areaLoad.map(a => (
              <div key={a.id} className="card card-pad" style={{ cursor:'pointer' }} onClick={() => navigate(`area/${a.id}`)}>
                <div className="row gap-8 items-center">
                  <span style={{ width:18, height:18, borderRadius:4, background:a.color, display:'grid', placeItems:'center', color:'#0A0A0B' }}>
                    <Ico name={a.icon} size={10} />
                  </span>
                  <span style={{ fontSize:13, fontWeight:600 }}>{a.name}</span>
                </div>
                <div className="row between items-center mt-12">
                  <span className="micro">{a.projects} proyectos</span>
                  <span className="mono" style={{ fontSize:12, color:'var(--text-1)' }}>{a.progress}%</span>
                </div>
                <div className="progress mt-8"><div style={{ width: a.progress + '%', background: a.color }}></div></div>
                <div className="mono mt-8" style={{ fontSize:11, color:'var(--text-3)' }}>{a.openTasks} tareas abiertas</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── My Day ───
const MyDay = ({ openTask }) => {
  const mine = window.TASKS.filter(t => t.assignee === 'joa');
  const today = mine.filter(t => t.status !== 'done' && window.daysFromToday(t.due) <= 1);
  const upcoming = mine.filter(t => t.status !== 'done' && window.daysFromToday(t.due) > 1);
  const review = mine.filter(t => t.status === 'rev');
  const [timing, setTiming] = React.useState(null);

  const grouped = (list) => {
    const map = {};
    list.forEach(t => { (map[t.project] = map[t.project] || []).push(t); });
    return map;
  };

  const TaskRow = ({ t }) => {
    const isTiming = timing === t.id;
    return (
      <div style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }} onClick={() => openTask(t.id)}>
        <span className="check"></span>
        <span style={{ flex:1, fontSize:13.5 }}>{t.title}</span>
        <PriorityPill p={t.priority} iconOnly />
        <span className="mono" style={{ fontSize:12, color: window.dueColor(t.due), minWidth:60, textAlign:'right' }}>{window.fmtDate(t.due)}</span>
        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setTiming(isTiming ? null : t.id); }}
          style={isTiming ? { color:'var(--teal)' } : {}}>
          <Ico name={isTiming ? 'pause' : 'play'} size={12} />
          <span className="mono">{t.time}</span>
        </button>
      </div>
    );
  };

  return (
    <>
      <PageHead title="Mi día" subtitle="Martes 10 de marzo · 6 tareas asignadas" />
      <div className="page-body" style={{ maxWidth:980 }}>
        <div className="card mb-16">
          <div className="card-head"><span className="title">Hoy</span><span className="micro" style={{ marginLeft:'auto' }}>{today.length} tareas</span></div>
          <div style={{ padding:'0 18px 8px' }}>
            {Object.entries(grouped(today)).map(([pid, list]) => {
              const p = window.PROJECT(pid);
              return (
                <div key={pid} style={{ marginTop:14 }}>
                  <div className="row gap-8 items-center mb-8"><AreaPill id={p.area} mini /><span className="micro">{p.name}</span></div>
                  {list.map(t => <TaskRow key={t.id} t={t} />)}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card mb-16">
          <div className="card-head"><span className="title">En revisión</span><span className="micro" style={{ marginLeft:'auto' }}>{review.length}</span></div>
          <div style={{ padding:'0 18px 8px' }}>
            {review.length === 0 && <div style={{ padding:'18px 0', color:'var(--text-3)', fontSize:13 }}>Nada en revisión.</div>}
            {review.map(t => <TaskRow key={t.id} t={t} />)}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="title">Próximas</span><span className="micro" style={{ marginLeft:'auto' }}>{upcoming.length}</span></div>
          <div style={{ padding:'0 18px 8px' }}>
            {upcoming.map(t => <TaskRow key={t.id} t={t} />)}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Global Calendar ───
const CalendarView = ({ openTask }) => {
  // March 2026: starts on Sunday (1 = Sun). Use Monday-first grid.
  const [sel, setSel] = React.useState('2026-03-10');
  const [filtAreas, setFiltAreas] = React.useState(window.AREAS.map(a => a.id));
  const [filtPeople, setFiltPeople] = React.useState(window.TEAM.map(m => m.id));

  const toggleArea = (id) => setFiltAreas(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const togglePerson = (id) => setFiltPeople(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // Build days for March 2026 grid (Mon-first)
  const monthStart = new Date('2026-03-01T12:00:00');
  // weekday: 0=Sun..6=Sat → Mon-first offset
  const startWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = 31;
  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(monthStart);
    d.setDate(d.getDate() - (startWeekday - i));
    cells.push({ date: d, muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(2026, 2, i, 12), muted: false });
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last); d.setDate(d.getDate() + 1);
    cells.push({ date: d, muted: true });
    if (cells.length >= 42) break;
  }

  const isoOf = (d) => d.toISOString().slice(0, 10);
  const filteredTasks = window.TASKS.filter(t => filtAreas.includes(t.area) && filtPeople.includes(t.assignee));
  const taskByDay = {};
  filteredTasks.forEach(t => { (taskByDay[t.due] = taskByDay[t.due] || []).push(t); });

  const dayTasks = taskByDay[sel] || [];

  return (
    <>
      <PageHead
        title="Calendario global"
        subtitle="Marzo 2026 · todas las áreas"
        right={<div className="row gap-8">
          <button className="btn btn-secondary btn-sm"><Ico name="chevron-left" /></button>
          <button className="btn btn-secondary btn-sm">Hoy</button>
          <button className="btn btn-secondary btn-sm"><Ico name="chevron-right" /></button>
          <div className="tabs" style={{ marginLeft:8 }}>
            <span className="tab active">Mes</span>
            <span className="tab">Semana</span>
            <span className="tab">Día</span>
          </div>
        </div>}
      />
      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr 320px', height:'calc(100% - 89px)' }}>
        {/* Filters */}
        <aside style={{ borderRight:'1px solid var(--border)', padding:'20px', overflowY:'auto' }}>
          <div className="micro mb-12">Áreas</div>
          <div className="col gap-8 mb-24">
            {window.AREAS.map(a => (
              <label key={a.id} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={filtAreas.includes(a.id)} onChange={() => toggleArea(a.id)}
                  style={{ accentColor: a.color, width:14, height:14 }} />
                <span className="sb-area-dot" style={{ background: a.color }}></span>
                <span style={{ flex:1, color: filtAreas.includes(a.id) ? 'var(--text-1)' : 'var(--text-3)' }}>{a.name}</span>
              </label>
            ))}
          </div>
          <div className="micro mb-12">Personas</div>
          <div className="col gap-8">
            {window.TEAM.map(m => (
              <label key={m.id} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, cursor:'pointer' }}>
                <input type="checkbox" checked={filtPeople.includes(m.id)} onChange={() => togglePerson(m.id)}
                  style={{ accentColor:'var(--teal)', width:14, height:14 }} />
                <Avatar name={m.name} size={20} />
                <span style={{ flex:1, color: filtPeople.includes(m.id) ? 'var(--text-1)' : 'var(--text-3)' }}>{m.short}</span>
              </label>
            ))}
          </div>
        </aside>

        {/* Calendar grid */}
        <div style={{ overflowY:'auto' }}>
          <div className="cal-grid">
            {window.DAYS_ES.map(d => <div key={d} className="cal-wkh">{d}</div>)}
            {cells.map((c, i) => {
              const iso = isoOf(c.date);
              const isToday = iso === window.TODAY;
              const isSel = iso === sel;
              const events = taskByDay[iso] || [];
              return (
                <div key={i} className={`cal-cell ${c.muted ? 'muted' : ''} ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`}
                  onClick={() => setSel(iso)}>
                  <span className="num">{c.date.getDate()}</span>
                  {events.slice(0, 3).map(t => {
                    const a = window.AREA(t.area);
                    return (
                      <div key={t.id} className="cal-event" style={{ background: a.color + '20', color: 'var(--text-1)' }}>
                        <span className="dot" style={{ background: a.color }}></span>{t.title}
                      </div>
                    );
                  })}
                  {events.length > 3 && <div className="micro" style={{ paddingLeft:4 }}>+{events.length - 3} más</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <aside style={{ borderLeft:'1px solid var(--border)', padding:'20px', overflowY:'auto' }}>
          <div className="micro mb-8">Detalle del día</div>
          <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-.01em' }} className="mono">{window.fmtDate(sel)} 2026</div>
          <div className="text-2 f-sm mt-4">{dayTasks.length} tareas con vencimiento</div>
          <div className="mt-20 col gap-8">
            {dayTasks.length === 0 && <div className="text-3 f-sm" style={{ padding:'18px 0' }}>Sin tareas en este día.</div>}
            {dayTasks.map(t => (
              <div key={t.id} className="card card-pad" style={{ padding:12, cursor:'pointer' }} onClick={() => openTask(t.id)}>
                <div className="row gap-8 items-center" style={{ marginBottom:8 }}>
                  <AreaPill id={t.area} mini /><span className="micro" style={{ marginLeft:'auto' }} className="mono">{t.code}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:500, lineHeight:1.4 }}>{t.title}</div>
                <div className="row gap-8 items-center mt-12">
                  <Avatar name={window.MEMBER(t.assignee).name} size={20} />
                  <span className="f-xs text-2">{window.MEMBER(t.assignee).short}</span>
                  <span style={{ marginLeft:'auto' }}><StatusPill status={t.status} /></span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
};

// ─── AI Assistant ───
const AIAssistant = () => {
  const agents = [
    { id: 'sum',  name: 'Resumen diario',          desc: 'Estado de cada área cada mañana', icon: 'sun' },
    { id: 'bloc', name: 'Detector de bloqueos',    desc: 'Alerta cuando algo se atasca >24h', icon: 'octagon-alert' },
    { id: 'rep',  name: 'Generador de reportes',   desc: 'Reportes semanales por proyecto', icon: 'file-bar-chart' },
    { id: 'prio', name: 'Priorización',            desc: 'Reordena tu día por impacto', icon: 'target' },
  ];
  const [active, setActive] = React.useState('sum');
  const [msg, setMsg] = React.useState('');
  const [msgs, setMsgs] = React.useState([
    { who: 'ai', text: 'Buen día Joaquín. Revisé tus 18 tareas abiertas. Tenés 2 vencidas en Outlet Centro y la migración POS necesita atención hoy. ¿Querés que reagende las tareas vencidas?' },
    { who: 'me', text: '¿Quién tiene más carga esta semana?' },
    { who: 'ai', text: 'Carlos Rojas tiene 7 tareas abiertas, 2 bloqueadas. Andrea M. tiene 5 y va al día. Recomiendo mover la auditoría de protocolos a Andrea — Carlos sigue en planos eléctricos pendientes del ingeniero externo.' },
  ]);

  const send = () => {
    if (!msg.trim()) return;
    setMsgs([...msgs, { who: 'me', text: msg }, { who: 'ai', text: 'Procesando tu solicitud...' }]);
    setMsg('');
  };

  const quickActions = [
    { name: 'Brainstorm',         desc: 'Genera ideas para un proyecto', icon: 'lightbulb' },
    { name: 'Crear tarea',        desc: 'Nueva tarea con asignación automática', icon: 'plus' },
    { name: 'Actualizar estados', desc: 'Revisa y actualiza estados batch', icon: 'refresh-cw' },
    { name: 'Recordatorio',       desc: 'Programar un recordatorio', icon: 'bell' },
  ];

  return (
    <>
      <PageHead title="Asistente IA" subtitle="Tu copiloto operativo · Bandeja con 3 actualizaciones nuevas" />
      <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', height:'calc(100% - 89px)' }}>
        <aside style={{ borderRight:'1px solid var(--border)', padding:'20px', overflowY:'auto' }}>
          <div className="row between items-center mb-12">
            <span className="micro">Mis agentes</span>
            <button className="btn btn-ghost btn-sm" style={{ padding:4 }}><Ico name="plus" size={13} /></button>
          </div>
          <div className="col gap-4">
            {agents.map(a => (
              <div key={a.id} onClick={() => setActive(a.id)}
                style={{ padding:10, borderRadius:6, cursor:'pointer',
                  background: active === a.id ? 'var(--surface-1)' : 'transparent',
                  border: active === a.id ? '1px solid var(--border-hover)' : '1px solid transparent' }}>
                <div className="row gap-8 items-center">
                  <span style={{ width:24, height:24, borderRadius:5, background:'var(--surface-2)', display:'grid', placeItems:'center', color: active === a.id ? 'var(--teal)' : 'var(--text-2)' }}>
                    <Ico name={a.icon} size={13} />
                  </span>
                  <span style={{ fontSize:13, fontWeight:500 }}>{a.name}</span>
                </div>
                <div className="f-xs text-2" style={{ marginTop:6, lineHeight:1.4 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </aside>

        <div style={{ display:'flex', flexDirection:'column', maxHeight:'100%' }}>
          <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
            <div style={{ maxWidth:780, margin:'0 auto' }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'16px 0', borderBottom: i < msgs.length - 1 ? '1px solid var(--border)' : '' }}>
                  {m.who === 'ai' ? (
                    <span style={{ width:28, height:28, borderRadius:6, background:'var(--teal-bg)', display:'grid', placeItems:'center', color:'var(--teal)', flex:'none' }}>
                      <Ico name="sparkles" size={14} />
                    </span>
                  ) : (
                    <Avatar name="Joaquín Rivera" size={28} />
                  )}
                  <div style={{ fontSize:13.5, lineHeight:1.6, color:'var(--text-1)', flex:1 }}>
                    <div className="micro mb-4">{m.who === 'ai' ? 'Asistente IA' : 'Joaquín'}</div>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop:'1px solid var(--border)', padding:'20px 32px 24px' }}>
            <div style={{ maxWidth:780, margin:'0 auto' }}>
              <div className="input" style={{ height:'auto', padding:'12px 14px', alignItems:'flex-start' }}>
                <Ico name="sparkles" color="var(--teal)" />
                <textarea rows="2" value={msg} onChange={e => setMsg(e.target.value)}
                  placeholder="Pregunta cualquier cosa sobre tus proyectos, equipos o tareas..."
                  style={{ flex:1, resize:'none' }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
                />
                <div className="col gap-4" style={{ marginLeft:8 }}>
                  <button className="btn btn-ghost btn-sm btn-icon"><Ico name="paperclip" size={13} /></button>
                  <button className="btn btn-primary btn-sm btn-icon" onClick={send}><Ico name="arrow-up" size={13} /></button>
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginTop:12 }}>
                {quickActions.map(qa => (
                  <div key={qa.name} className="card" style={{ padding:12, cursor:'pointer' }}>
                    <div className="row gap-8 items-center">
                      <span style={{ color:'var(--teal)' }}><Ico name={qa.icon} size={13} /></span>
                      <span style={{ fontSize:12.5, fontWeight:600 }}>{qa.name}</span>
                    </div>
                    <div className="f-xs text-2 mt-4" style={{ lineHeight:1.4 }}>{qa.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

Object.assign(window, { Dashboard, MyDay, CalendarView, AIAssistant });

// ─── AI Inbox (dedicated) ───
const AIInbox = ({ openTask }) => {
  const [, force] = React.useReducer(x => x + 1, 0);
  const [tab, setTab] = React.useState('all');
  const [items, setItems] = React.useState([
    { id:1, kind:'block',   read:false, title:'Bloqueo detectado · Migración POS sucursal norte', body:'Tarea sin avance hace 48h. Asignada a Carlos R. Recomiendo escalar a Diego A. o reasignar a Andrea M. (con capacidad).', when:'hace 12 min', target:'t8' },
    { id:2, kind:'risk',    read:false, title:'2 tareas vencidas en Outlet Centro', body:'Cotizar proveedores LED y Revisar permisos obra mayor pasaron su fecha límite ayer. Sugiero replanificar a +3 días.', when:'hace 38 min', target:'t1' },
    { id:3, kind:'summary', read:false, title:'Resumen diario · 10 mar 2026', body:'18 tareas abiertas. 2 vencidas, 3 en riesgo, 24 completadas la semana pasada (+15%). Bodega Sur bajó ritmo de cierre.', when:'hoy 08:00', target:null },
    { id:4, kind:'load',    read:true,  title:'Sobrecarga de Carlos R.', body:'7 tareas abiertas, 2 bloqueadas. Andrea M. tiene 5 y va al día. Mover auditoría de protocolos.', when:'ayer 17:42', target:null },
    { id:5, kind:'win',     read:true,  title:'Hito alcanzado · Remodelación 67%', body:'El proyecto pasó la marca de 2/3. Próximo hito crítico: aprobación municipal (mar 15).', when:'ayer 14:10', target:null },
    { id:6, kind:'report',  read:true,  title:'Reporte semanal listo', body:'Semana 10 · carga, % completado por área, evolución. Listo para enviar a dirección.', when:'lun 09:00', target:null },
  ]);
  const meta = (k) => ({
    block:   { ico:'octagon-alert',  color:'var(--red)',   label:'Bloqueo' },
    risk:    { ico:'triangle-alert', color:'var(--amber)', label:'Riesgo' },
    summary: { ico:'sparkles',       color:'var(--teal)',  label:'Resumen' },
    load:    { ico:'users',          color:'var(--blue)',  label:'Carga' },
    win:     { ico:'circle-check',   color:'var(--green)', label:'Logro' },
    report:  { ico:'file-bar-chart', color:'var(--text-2)', label:'Reporte' },
  }[k]);
  const filtered = tab === 'all' ? items : tab === 'unread' ? items.filter(i => !i.read) : items.filter(i => i.kind === tab);
  const [sel, setSel] = React.useState(items[0].id);
  const cur = items.find(i => i.id === sel) || items[0];
  const m = meta(cur.kind);
  const markRead = (id) => { items.find(i => i.id === id).read = true; force(); };
  return (
    <>
      <PageHead title="Bandeja IA" subtitle="Avisos automáticos · resúmenes · bloqueos detectados"
        right={<div className="row gap-8"><button className="btn btn-secondary btn-sm"><Ico name="check-square" /> Marcar todo leído</button><button className="btn btn-secondary btn-sm"><Ico name="settings" /> Reglas IA</button></div>} />
      <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', height:'calc(100% - 89px)' }}>
        <aside style={{ borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', minHeight:0 }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:6, flexWrap:'wrap' }}>
            {[['all','Todos'],['unread','No leídos'],['block','Bloqueos'],['risk','Riesgos'],['summary','Resúmenes']].map(([k,l]) => (
              <span key={k} onClick={() => setTab(k)} className={`pill ${tab === k ? 'pill-status-curso' : ''}`} style={{ cursor:'pointer' }}>{l}</span>
            ))}
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {filtered.map(it => {
              const mm = meta(it.kind);
              return (
                <div key={it.id} onClick={() => { setSel(it.id); markRead(it.id); }}
                  style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                    background: sel === it.id ? 'var(--surface-1)' : 'transparent',
                    borderLeft: sel === it.id ? '2px solid var(--teal)' : '2px solid transparent',
                    paddingLeft: sel === it.id ? 14 : 16 }}>
                  <div className="row gap-8 items-center" style={{ marginBottom:6 }}>
                    <Ico name={mm.ico} size={13} color={mm.color} />
                    <span className="micro" style={{ color:mm.color }}>{mm.label}</span>
                    {!it.read && <span style={{ width:6, height:6, borderRadius:999, background:'var(--teal)' }}></span>}
                    <span className="mono f-xs text-3" style={{ marginLeft:'auto' }}>{it.when}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight: it.read ? 500 : 600, color:'var(--text-1)', lineHeight:1.4 }}>{it.title}</div>
                  <div className="f-xs text-2" style={{ marginTop:6, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{it.body}</div>
                </div>
              );
            })}
          </div>
        </aside>
        <div style={{ overflowY:'auto', padding:'28px 36px' }}>
          <div className="row gap-8 items-center mb-12">
            <Ico name={m.ico} size={14} color={m.color} />
            <span className="micro" style={{ color:m.color }}>{m.label}</span>
            <span className="mono f-xs text-3" style={{ marginLeft:'auto' }}>{cur.when}</span>
          </div>
          <h2 style={{ margin:'0 0 16px', fontSize:22, fontWeight:600, letterSpacing:'-.01em', lineHeight:1.3 }}>{cur.title}</h2>
          <p style={{ color:'var(--text-1)', fontSize:14, lineHeight:1.65, maxWidth:680 }}>{cur.body}</p>
          <div className="row gap-8 mt-24">
            {cur.target && <button className="btn btn-primary btn-md" onClick={() => openTask(cur.target)}><Ico name="arrow-right" /> Ver tarea</button>}
            <button className="btn btn-secondary btn-md"><Ico name="check" /> Marcar resuelto</button>
            <button className="btn btn-ghost btn-md"><Ico name="bell-off" /> Silenciar regla</button>
          </div>
          <div className="card mt-32" style={{ maxWidth:680 }}>
            <div className="card-head"><span className="title">Acciones sugeridas por IA</span></div>
            <div style={{ padding:'4px 4px 8px' }}>
              {['Replanificar tarea a mar 13','Reasignar a Andrea Mendoza','Notificar a Joaquín por mensaje directo','Crear subtarea de seguimiento'].map((a,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderTop: i ? '1px solid var(--border)' : '' }}>
                  <Ico name="sparkles" size={12} color="var(--teal)" />
                  <span style={{ flex:1, fontSize:13 }}>{a}</span>
                  <button className="btn btn-ghost btn-sm">Aplicar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
Object.assign(window, { AIInbox });
