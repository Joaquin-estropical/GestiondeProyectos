// ════════════ Screens · part 2: Project (List/Kanban/Gantt), Area, Reports, Settings ════════════

const ProjectHeader = ({ project, view, setView }) => {
  const a = window.AREA(project.area);
  const team = ['joa','and','car','sof'];
  return (
    <div style={{ padding:'20px 32px 0' }}>
      <div className="row gap-12 items-center">
        <AreaPill id={project.area} />
        <h1 style={{ margin:0, fontSize:22, fontWeight:600, letterSpacing:'-.005em' }}>{project.name}</h1>
        <span className="pill pill-status-curso" style={{ marginLeft:4 }}><span className="dot"></span>En curso</span>
        <span style={{ marginLeft:'auto' }} className="avatar-stack avatar-stack-bordered">
          {team.map(id => <Avatar key={id} name={window.MEMBER(id).name} size={26} />)}
        </span>
        <button className="btn btn-secondary btn-sm"><Ico name="user-plus" /></button>
        <button className="btn btn-secondary btn-sm"><Ico name="more-horizontal" /></button>
      </div>
      <div className="row gap-16 items-center mt-12 f-xs text-2">
        <span><Ico name="calendar" size={12} /> Entrega {window.fmtDate(project.due)}</span>
        <span><Ico name="list-todo" size={12} /> {project.count} tareas</span>
        <span><Ico name="percent" size={12} /> {project.progress}% completado</span>
      </div>
      <div className="row gap-12 items-center mt-20" style={{ borderBottom:'1px solid var(--border)' }}>
        <div className="tabs" style={{ background:'transparent', border:0, padding:0, gap:0 }}>
          {[
            { id:'list',   label:'Lista',     icon:'list' },
            { id:'kanban', label:'Kanban',    icon:'kanban' },
            { id:'gantt',  label:'Gantt',     icon:'gantt-chart' },
            { id:'cal',    label:'Calendario', icon:'calendar' },
            { id:'table',  label:'Tabla',     icon:'table' },
          ].map(v => (
            <span key={v.id} onClick={() => setView(v.id)}
              className={`tab ${view === v.id ? 'active' : ''}`}
              style={{ borderRadius:0, borderBottom: view === v.id ? '2px solid var(--teal)' : '2px solid transparent', padding:'8px 12px', color: view === v.id ? 'var(--text-1)' : 'var(--text-2)', background:'transparent' }}>
              <Ico name={v.icon} size={13} /> {v.label}
            </span>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, paddingBottom:8 }}>
          <button className="btn btn-secondary btn-sm"><Ico name="filter" /> Filtros</button>
          <button className="btn btn-secondary btn-sm"><Ico name="arrow-down-wide-narrow" /> Agrupar</button>
        </div>
      </div>
    </div>
  );
};

// ─── Project: List ───
const ProjectList = ({ project, openTask }) => {
  const tasks = window.TASKS.filter(t => t.project === project.id);
  const grouped = window.STATUS_ORDER.map(s => ({ status: s, tasks: tasks.filter(t => t.status === s) })).filter(g => g.tasks.length);

  return (
    <div style={{ padding:'8px 32px 48px' }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width:32 }}></th>
            <th>Nombre</th>
            <th style={{ width:130 }}>Asignado</th>
            <th style={{ width:100 }}>Fecha</th>
            <th style={{ width:90 }}>Prioridad</th>
            <th style={{ width:120 }}>Estado</th>
            <th style={{ width:70 }}>Tiempo</th>
            <th style={{ width:60 }}><Ico name="message-square" size={12} /></th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(g => (
            <React.Fragment key={g.status}>
              <tr className="group"><td colSpan={8}><div className="gh">
                <span className="dot" style={{
                  width:6, height:6, borderRadius:999,
                  background: g.status === 'done' ? 'var(--green)' : g.status === 'block' ? 'var(--red)' : g.status === 'rev' ? 'var(--amber)' : g.status === 'curso' ? 'var(--blue)' : 'var(--text-3)'
                }}></span>
                {window.STATUS_LABELS[g.status]} <span className="cnt">{g.tasks.length}</span>
              </div></td></tr>
              {g.tasks.map(t => {
                const m = window.MEMBER(t.assignee);
                const done = t.status === 'done';
                return (
                  <tr key={t.id} onClick={() => openTask(t.id)}>
                    <td><span className={`check ${done ? 'done' : ''}`}></span></td>
                    <td><span style={done ? { textDecoration:'line-through', color:'var(--text-2)' } : {}}>{t.title}</span></td>
                    <td><div className="row gap-8 items-center"><Avatar name={m.name} size={22} /><span className="f-xs text-2">{m.short}</span></div></td>
                    <td><span className="mono f-xs" style={{ color: window.dueColor(t.due) }}>{window.fmtDate(t.due)}</span></td>
                    <td><PriorityPill p={t.priority} /></td>
                    <td><StatusPill status={t.status} /></td>
                    <td><span className="mono f-xs text-2">{t.time !== '00:00' ? t.time : '—'}</span></td>
                    <td><span className="f-xs text-3 mono">{t.comments > 0 ? t.comments : ''}</span></td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div style={{ padding:'14px 12px', color:'var(--text-3)', fontSize:13, cursor:'pointer' }} className="row gap-8 items-center">
        <Ico name="plus" /> Agregar tarea
      </div>
    </div>
  );
};

// ─── Project: Kanban (with DnD) ───
const ProjectKanban = ({ project, openTask }) => {
  const [, force] = React.useReducer(x => x + 1, 0);
  const [drag, setDrag] = React.useState(null); // task id
  const [over, setOver] = React.useState(null); // status

  const tasks = window.TASKS.filter(t => t.project === project.id);
  const onDragStart = (e, t) => { setDrag(t.id); e.dataTransfer.effectAllowed = 'move'; };
  const onDragEnd = () => { setDrag(null); setOver(null); };
  const onDragOver = (e, s) => { e.preventDefault(); setOver(s); };
  const onDrop = (e, s) => {
    e.preventDefault();
    const t = window.TASKS.find(x => x.id === drag);
    if (t && t.status !== s) { t.status = s; force(); }
    setDrag(null); setOver(null);
  };

  return (
    <div className="kanban">
      {window.STATUS_ORDER.map(s => {
        const list = tasks.filter(t => t.status === s);
        const dotColor = s === 'done' ? 'var(--green)' : s === 'block' ? 'var(--red)' : s === 'rev' ? 'var(--amber)' : s === 'curso' ? 'var(--blue)' : 'var(--text-3)';
        return (
          <div key={s} className="kan-col">
            <div className="kan-col-head">
              <span style={{ width:6, height:6, borderRadius:999, background:dotColor }}></span>
              <span className="micro" style={{ color:'var(--text-1)' }}>{window.STATUS_LABELS[s]}</span>
              <span className="cnt">{list.length}</span>
              <button className="btn btn-ghost btn-sm btn-icon" style={{ width:20, height:20, marginLeft:4 }}><Ico name="plus" size={12} /></button>
            </div>
            <div className={`kan-col-body ${over === s ? 'dragover' : ''}`}
              onDragOver={(e) => onDragOver(e, s)} onDrop={(e) => onDrop(e, s)} onDragLeave={() => setOver(null)}>
              {list.map(t => {
                const m = window.MEMBER(t.assignee);
                return (
                  <div key={t.id} className={`kan-card ${drag === t.id ? 'dragging' : ''}`}
                    draggable onDragStart={(e) => onDragStart(e, t)} onDragEnd={onDragEnd}
                    onClick={() => openTask(t.id)}>
                    <div className="row gap-6 items-center mb-8">
                      <PriorityPill p={t.priority} iconOnly />
                      <span className="mono f-xs text-3">{t.code}</span>
                      <span style={{ marginLeft:'auto' }}><AreaPill id={t.area} mini /></span>
                    </div>
                    <div className="title">{t.title}</div>
                    {t.subtasks.total > 0 && (
                      <div className="row gap-6 items-center mt-12 f-xs text-2">
                        <Ico name="check-square" size={11} />
                        <span className="mono">{t.subtasks.done}/{t.subtasks.total}</span>
                        <div className="progress" style={{ flex:1, marginLeft:6 }}>
                          <div style={{ width: (t.subtasks.done / t.subtasks.total * 100) + '%', background:'var(--text-3)' }}></div>
                        </div>
                      </div>
                    )}
                    <div className="meta">
                      <Avatar name={m.name} size={20} />
                      <span style={{ color: window.dueColor(t.due) }} className="mono">{window.fmtDate(t.due)}</span>
                      <div className="right">
                        {t.comments > 0 && <span className="row gap-4 items-center"><Ico name="message-square" size={11} /><span className="mono">{t.comments}</span></span>}
                        {t.time !== '00:00' && <span className="row gap-4 items-center"><Ico name="clock" size={11} /><span className="mono">{t.time}</span></span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Project: Gantt ───
const ProjectGantt = ({ project, openTask }) => {
  const tasks = window.TASKS.filter(t => t.project === project.id);
  // Build a timeline from feb 20 to apr 5
  const start = new Date('2026-02-20T12:00:00');
  const end   = new Date('2026-04-05T12:00:00');
  const totalDays = Math.round((end - start) / 86400000);
  const colW = 26; // px per day
  const totalW = totalDays * colW;
  const [, force] = React.useReducer(x => x + 1, 0);
  const [offsets, setOffsets] = React.useState({}); // id -> day offset
  // Fake task spans (each task assigned a start..end range relative to its due)
  const taskBars = tasks.map((t, i) => {
    const dueD = new Date(t.due + 'T12:00:00');
    const len = 4 + (i % 5) * 2;
    const taskStart = new Date(dueD); taskStart.setDate(dueD.getDate() - len);
    return { t, start: taskStart, end: dueD, len };
  });
  const xOf = (d) => Math.round((d - start) / 86400000) * colW;
  const todayX = xOf(new Date(window.TODAY + 'T12:00:00')) + colW / 2;

  // Ticks
  const weeks = [];
  for (let i = 0; i < totalDays; i += 7) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    weeks.push({ d, x: i * colW, label: `${d.getDate()} ${window.MONTHS_ES[d.getMonth()]}` });
  }
  // Milestone: project due
  const dueX = xOf(new Date(project.due + 'T12:00:00'));

  const statusColor = (s) => s === 'done' ? 'var(--green)' : s === 'block' ? 'var(--red)' : s === 'rev' ? 'var(--amber)' : s === 'curso' ? 'var(--blue)' : 'var(--text-3)';

  return (
    <div style={{ padding:'8px 0 48px' }}>
      <div style={{ padding:'0 32px 12px', display:'flex', gap:8, alignItems:'center' }}>
        <div className="tabs">
          <span className="tab">Día</span>
          <span className="tab active">Semana</span>
          <span className="tab">Mes</span>
          <span className="tab">Trim.</span>
        </div>
        <span className="text-3 f-xs" style={{ marginLeft:'auto' }}>20 feb — 5 abr 2026</span>
      </div>
      <div className="gantt-shell">
        <div className="gantt-left">
          <div className="gantt-row" style={{ borderBottom:'1px solid var(--border)', background:'transparent', color:'var(--text-3)', fontSize:11, textTransform:'uppercase', letterSpacing:'.05em', fontWeight:500 }}>
            Tarea
          </div>
          {taskBars.map(({ t }) => (
            <div key={t.id} className="gantt-row" onClick={() => openTask(t.id)} style={{ cursor:'pointer' }}>
              <PriorityPill p={t.priority} iconOnly />
              <span style={{ marginLeft:8, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:12.5 }}>{t.title}</span>
              <Avatar name={window.MEMBER(t.assignee).name} size={20} />
            </div>
          ))}
        </div>
        <div className="gantt-right">
          <div style={{ width: totalW, position:'relative' }}>
            <div className="gantt-header">
              {weeks.map((w, i) => (
                <div key={i} className="gantt-tick" style={{ width: 7 * colW }}>{w.label}</div>
              ))}
            </div>

            {/* today */}
            <div className="gantt-today" style={{ left: todayX, height: 36 + taskBars.length * 36 }}></div>

            {taskBars.map(({ t, start: ts, end: te, len }, i) => {
              const off = (offsets[t.id] || 0);
              const x = xOf(ts) + off * colW, w = len * colW;
              const onDown = (e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startOff = offsets[t.id] || 0;
                const move = (ev) => {
                  const delta = Math.round((ev.clientX - startX) / colW);
                  setOffsets(o => ({ ...o, [t.id]: startOff + delta }));
                };
                const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
                window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
              };
              return (
                <div key={t.id} className="gantt-body-row">
                  <div className="gantt-bar"
                    onMouseDown={onDown}
                    onClick={(e) => { if (!e.defaultPrevented) openTask(t.id); }}
                    style={{ left: x, width: w, background: t.status === 'done' ? statusColor(t.status) : statusColor(t.status) + '40', color: t.status === 'done' ? '#0A0A0B' : 'var(--text-1)', borderLeft:`3px solid ${statusColor(t.status)}` }}>
                    {t.title}
                  </div>
                </div>
              );
            })}

            {/* Milestone diamond */}
            <div className="gantt-milestone" style={{ left: dueX - 8, top: 8 + taskBars.length * 36 + 4, color:'var(--teal)' }}></div>

            {/* Dependencies (simple connector lines between consecutive tasks) */}
            <svg style={{ position:'absolute', left:0, top:36, pointerEvents:'none' }} width={totalW} height={taskBars.length * 36}>
              {taskBars.slice(0, -1).map(({ end: te }, i) => {
                const x1 = xOf(te);
                const y1 = i * 36 + 18;
                const next = taskBars[i + 1];
                const x2 = xOf(next.start);
                const y2 = (i + 1) * 36 + 18;
                return (
                  <path key={i} d={`M${x1} ${y1} L${x1 + 6} ${y1} L${x1 + 6} ${y2} L${x2} ${y2}`}
                    stroke="var(--border-hover)" strokeWidth="1" fill="none" />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Area view ───
const AreaView = ({ areaId, navigate, openTask }) => {
  const a = window.AREA(areaId);
  const projs = window.PROJECTS.filter(p => p.area === areaId);
  const tasks = window.TASKS.filter(t => t.area === areaId);
  const open = tasks.filter(t => t.status !== 'done').length;
  const done = tasks.filter(t => t.status === 'done').length;
  const pct = Math.round(done / Math.max(tasks.length, 1) * 100);
  const critical = tasks.filter(t => t.priority === 'urg' || (t.status !== 'done' && window.daysFromToday(t.due) <= 1)).slice(0, 5);

  return (
    <>
      <PageHead
        title={a.name}
        subtitle={`${projs.length} proyectos activos · ${open} tareas abiertas`}
        right={<div className="row gap-8">
          <button className="btn btn-secondary btn-md"><Ico name="user-plus" /> Invitar</button>
          <button className="btn btn-primary btn-md"><Ico name="plus" /> Nuevo proyecto</button>
        </div>}
      />
      <div className="page-body">
        <div className="grid mb-24" style={{ gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <div className="card kpi"><div className="lbl"><Ico name="folder" size={13} /> Proyectos activos</div><div className="val">{projs.length}</div></div>
          <div className="card kpi"><div className="lbl"><Ico name="list-todo" size={13} /> Tareas abiertas</div><div className="val">{open}</div></div>
          <div className="card kpi"><div className="lbl"><Ico name="percent" size={13} /> Completado</div><div className="val">{pct}%</div></div>
          <div className="card kpi"><div className="lbl"><Ico name="users" size={13} /> Miembros</div><div className="val">5</div></div>
        </div>

        <div className="section-title">Proyectos</div>
        <div className="grid mb-24" style={{ gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {projs.map(p => (
            <div key={p.id} className="card" style={{ cursor:'pointer' }} onClick={() => navigate(`project/${p.id}`)}>
              <div className="card-pad">
                <div className="row between items-center">
                  <span className="fw-6" style={{ fontSize:14 }}>{p.name}</span>
                  <span className="micro mono">{p.progress}%</span>
                </div>
                <div className="text-2 f-xs mt-4">Entrega {window.fmtDate(p.due)} · {p.count} tareas</div>
                <div className="progress mt-16"><div style={{ width: p.progress + '%', background: a.color }}></div></div>
              </div>
            </div>
          ))}
        </div>

        <div className="section-title">Tareas críticas</div>
        <div className="card">
          <table className="table">
            <tbody>
              {critical.map(t => (
                <tr key={t.id} onClick={() => openTask(t.id)}>
                  <td style={{ width:30 }}><span className="check"></span></td>
                  <td>{t.title}</td>
                  <td style={{ width:130 }}><div className="row gap-8 items-center"><Avatar name={window.MEMBER(t.assignee).name} size={20} /><span className="f-xs text-2">{window.MEMBER(t.assignee).short}</span></div></td>
                  <td style={{ width:100 }}><span className="mono f-xs" style={{ color: window.dueColor(t.due) }}>{window.fmtDate(t.due)}</span></td>
                  <td style={{ width:90 }}><PriorityPill p={t.priority} /></td>
                  <td style={{ width:120 }}><StatusPill status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

// ─── Reports ───
const Reports = () => {
  const workload = window.TEAM.map(m => ({
    name: m.short,
    open: window.TASKS.filter(t => t.assignee === m.id && t.status !== 'done').length,
    done: window.TASKS.filter(t => t.assignee === m.id && t.status === 'done').length,
  }));
  const maxW = Math.max(...workload.map(w => w.open + w.done));

  const areaPct = window.AREAS.map(a => {
    const total = window.TASKS.filter(t => t.area === a.id).length;
    const done = window.TASKS.filter(t => t.area === a.id && t.status === 'done').length;
    return { name: a.name, value: total ? Math.round(done / total * 100) : 0, color: a.color };
  });

  const statusData = window.STATUS_ORDER.map(s => ({
    name: window.STATUS_LABELS[s],
    value: window.TASKS.filter(t => t.status === s).length,
    color: s === 'done' ? '#22C55E' : s === 'block' ? '#EF4444' : s === 'rev' ? '#F59E0B' : s === 'curso' ? '#3B82F6' : '#5A5A60',
  }));

  const evolution = [4, 6, 5, 9, 12, 8, 14];

  return (
    <>
      <PageHead title="Reportes" subtitle="Marzo 2026 · todos los proyectos"
        right={<div className="row gap-8">
          <div className="tabs"><span className="tab">7d</span><span className="tab active">30d</span><span className="tab">90d</span></div>
          <button className="btn btn-secondary btn-sm"><Ico name="download" /> Exportar</button>
        </div>}
      />
      <div className="page-body">
        <div className="grid" style={{ gridTemplateColumns:'1.4fr 1fr', gap:16, marginBottom:16 }}>
          <div className="card">
            <div className="card-head"><span className="title">Carga de trabajo por persona</span></div>
            <div style={{ padding:'14px 18px' }}>
              {workload.map(w => (
                <div key={w.name} className="bar-row">
                  <span className="lbl">{w.name}</span>
                  <div className="bar"><div style={{ width: ((w.open + w.done) / maxW * 100) + '%', background:'var(--text-2)' }}>
                    <div style={{ width: (w.done / Math.max(w.open + w.done, 1) * 100) + '%', height:'100%', background:'var(--green)' }}></div>
                  </div></div>
                  <span className="val">{w.open}<span className="text-3"> / {w.done}</span></span>
                </div>
              ))}
              <div className="row gap-12 mt-12 f-xs">
                <span className="row gap-6 items-center"><span style={{ width:10, height:10, background:'var(--text-2)', borderRadius:2 }}></span><span className="text-2">Abiertas</span></span>
                <span className="row gap-6 items-center"><span style={{ width:10, height:10, background:'var(--green)', borderRadius:2 }}></span><span className="text-2">Completadas</span></span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span className="title">Tareas por estado</span></div>
            <div style={{ padding:'18px', display:'flex', gap:24, alignItems:'center' }}>
              <Donut data={statusData} size={140} center={window.TASKS.length} />
              <div className="donut-legend grow">
                {statusData.map(d => (
                  <div key={d.name} className="li">
                    <span className="sw" style={{ background:d.color }}></span>
                    <span className="nm">{d.name}</span>
                    <span className="pct">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns:'1fr 1.4fr', gap:16, marginBottom:16 }}>
          <div className="card">
            <div className="card-head"><span className="title">% completado por área</span></div>
            <div style={{ padding:'18px', display:'flex', gap:24, alignItems:'center' }}>
              <Donut data={areaPct.map(a => ({ value: a.value, color: a.color }))} size={140} center={Math.round(areaPct.reduce((s,a) => s + a.value, 0) / areaPct.length) + '%'} />
              <div className="donut-legend grow">
                {areaPct.map(a => (
                  <div key={a.name} className="li">
                    <span className="sw" style={{ background:a.color }}></span>
                    <span className="nm">{a.name}</span>
                    <span className="pct">{a.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><span className="title">Tiempo registrado por proyecto</span></div>
            <div style={{ padding:'14px 18px' }}>
              {window.PROJECTS.slice(0, 6).map(p => {
                const hrs = (p.progress * 0.4 + 8).toFixed(1);
                const max = 40;
                return (
                  <div key={p.id} className="bar-row">
                    <span className="lbl">{p.name}</span>
                    <div className="bar"><div style={{ width: (hrs / max * 100) + '%', background: window.AREA(p.area).color }}></div></div>
                    <span className="val">{hrs}h</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><span className="title">Evolución semanal · tareas completadas</span></div>
          <div style={{ padding:'18px' }}>
            <svg width="100%" height="180" viewBox="0 0 700 180" preserveAspectRatio="none">
              {[0, 1, 2, 3].map(i => <line key={i} x1="40" x2="700" y1={20 + i * 40} y2={20 + i * 40} stroke="var(--border)" />)}
              {[0, 4, 8, 12, 16].map((v, i) => <text key={i} x="32" y={164 - i * 36} fill="var(--text-3)" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">{v}</text>)}
              {(() => {
                const points = evolution.map((v, i) => `${50 + i * 100},${160 - v * 9}`).join(' ');
                return <>
                  <polyline points={points} fill="none" stroke="var(--teal)" strokeWidth="2" />
                  {evolution.map((v, i) => (
                    <g key={i}>
                      <circle cx={50 + i * 100} cy={160 - v * 9} r="3" fill="var(--teal)" />
                      <text x={50 + i * 100} y={175} fill="var(--text-3)" fontSize="10" textAnchor="middle" fontFamily="Inter">S{i + 1}</text>
                    </g>
                  ))}
                </>;
              })()}
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Settings ───
const Settings = () => {
  const [tab, setTab] = React.useState('areas');
  return (
    <>
      <PageHead title="Configuración" subtitle="Áreas, miembros y permisos del workspace" />
      <div style={{ padding:'0 32px', borderBottom:'1px solid var(--border)' }}>
        <div className="tabs" style={{ background:'transparent', border:0, padding:0 }}>
          {[
            { id:'areas', label:'Áreas' },
            { id:'members', label:'Miembros' },
            { id:'roles', label:'Roles' },
            { id:'integr', label:'Integraciones' },
            { id:'billing', label:'Facturación' },
          ].map(t => (
            <span key={t.id} onClick={() => setTab(t.id)}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              style={{ borderRadius:0, borderBottom: tab === t.id ? '2px solid var(--teal)' : '2px solid transparent', padding:'10px 12px', background:'transparent' }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="page-body" style={{ maxWidth:920 }}>
        {tab === 'areas' && (
          <>
            <div className="row between items-center mb-16">
              <div>
                <div className="fw-6">Áreas del workspace</div>
                <div className="f-xs text-2 mt-4">Cada área tiene un color único y agrupa sus proyectos.</div>
              </div>
              <button className="btn btn-primary btn-sm"><Ico name="plus" /> Nueva área</button>
            </div>
            <div className="card">
              {window.AREAS.map((a, i) => (
                <div key={a.id} style={{ padding:'14px 18px', borderBottom: i < window.AREAS.length - 1 ? '1px solid var(--border)' : '', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ width:32, height:32, borderRadius:6, background:a.color, display:'grid', placeItems:'center', color:'#0A0A0B' }}>
                    <Ico name={a.icon} size={15} />
                  </span>
                  <div style={{ flex:1 }}>
                    <div className="fw-5" style={{ fontSize:13.5 }}>{a.name}</div>
                    <div className="f-xs text-2 mt-4">{window.PROJECTS.filter(p => p.area === a.id).length} proyectos · {window.TASKS.filter(t => t.area === a.id).length} tareas</div>
                  </div>
                  <span className="avatar-stack avatar-stack-bordered">
                    {window.TEAM.slice(0, 3).map(m => <Avatar key={m.id} name={m.name} size={22} />)}
                  </span>
                  <button className="btn btn-ghost btn-sm btn-icon"><Ico name="more-horizontal" /></button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'members' && (
          <>
            <div className="row between items-center mb-16">
              <div>
                <div className="fw-6">Miembros</div>
                <div className="f-xs text-2 mt-4">5 miembros activos · 2 invitaciones pendientes.</div>
              </div>
              <button className="btn btn-primary btn-sm"><Ico name="user-plus" /> Invitar</button>
            </div>
            <div className="card">
              <table className="table">
                <thead>
                  <tr><th>Nombre</th><th>Rol</th><th>Áreas</th><th style={{ width:120 }}>Permiso</th><th style={{ width:60 }}></th></tr>
                </thead>
                <tbody>
                  {window.TEAM.map(m => (
                    <tr key={m.id}>
                      <td><div className="row gap-10 items-center"><Avatar name={m.name} size={28} /><div><div className="fw-5">{m.name}</div><div className="f-xs text-2 mt-4">{m.name.toLowerCase().replace(/ /g, '.')}@tropical.co</div></div></div></td>
                      <td><span className="f-xs text-2">{m.role}</span></td>
                      <td><div className="row gap-4">{window.AREAS.slice(0, 3).map(a => <span key={a.id} style={{ width:12, height:12, borderRadius:3, background:a.color }}></span>)}</div></td>
                      <td><span className="pill">{m.id === 'joa' ? 'Admin' : 'Editor'}</span></td>
                      <td><button className="btn btn-ghost btn-sm btn-icon"><Ico name="more-horizontal" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab !== 'areas' && tab !== 'members' && (
          <div className="empty"><div className="ill"><Ico name="settings" size={26} /></div>
            <p className="t">Próximamente</p>
            <p className="d">Esta sección estará disponible en la próxima versión.</p>
          </div>
        )}
      </div>
    </>
  );
};

// ─── Empty States gallery ───
const EmptyStates = () => {
  const items = [
    { ill:'inbox', t:'Sin tareas pendientes', d:'No tenés nada asignado para hoy. ¿Revisar mañana?', cta:'Ver mañana' },
    { ill:'list-todo', t:'Lista vacía', d:'Este proyecto todavía no tiene tareas.', cta:'Crear primera tarea', primary:true },
    { ill:'kanban', t:'Tablero vacío', d:'Empezá moviendo tareas a En curso.', cta:'Crear tarea', primary:true },
    { ill:'calendar-x-2', t:'Calendario vacío', d:'No hay eventos ni tareas con fecha en este mes.', cta:'Crear tarea', primary:true },
    { ill:'search-x', t:'Sin resultados', d:'Probá con otro término o limpiá los filtros activos.', cta:'Limpiar filtros' },
    { ill:'sparkles', t:'IA sin contexto', d:'Agregá un proyecto para que la IA pueda ayudarte.', cta:'Ver proyectos' },
    { ill:'users', t:'Sin miembros', d:'Invitá a tu equipo para empezar a colaborar.', cta:'Invitar', primary:true },
    { ill:'bar-chart-3', t:'Sin datos para graficar', d:'Los reportes aparecerán cuando haya actividad.', cta:'Volver al dashboard' },
    { ill:'gantt-chart', t:'Sin tareas para Gantt', d:'Asigná fechas a tus tareas para verlas en línea de tiempo.', cta:'Ir a Lista' },
  ];
  return (
    <>
      <PageHead title="Empty states" subtitle="Galería de estados vacíos · misma rejilla para todas las vistas" />
      <div className="page-body">
        <div className="grid" style={{ gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
          {items.map((it, i) => (
            <div key={i} className="card">
              <div className="empty">
                <div className="ill"><Ico name={it.ill} size={26} /></div>
                <p className="t">{it.t}</p>
                <p className="d">{it.d}</p>
                <button className={`btn ${it.primary ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                  {it.primary && <Ico name="plus" />} {it.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

Object.assign(window, { ProjectHeader, ProjectList, ProjectKanban, ProjectGantt, AreaView, Reports, Settings, EmptyStates });
