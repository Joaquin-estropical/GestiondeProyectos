// ════════════ Overlays: Task slide-over, Command Palette, New Task modal ════════════

const TaskDetail = ({ taskId, onClose }) => {
  const t0 = window.TASKS.find(x => x.id === taskId);
  const [t, setT] = React.useState(t0);
  const [timing, setTiming] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [comment, setComment] = React.useState('');
  React.useEffect(() => { if (!timing) return; const id = setInterval(() => setElapsed(e => e + 1), 1000); return () => clearInterval(id); }, [timing]);
  if (!t) return null;
  const m = window.MEMBER(t.assignee);
  const p = window.PROJECT(t.project);
  const a = window.AREA(t.area);
  const fmtSec = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <>
      <div className="slide-bd" onClick={onClose}></div>
      <aside className="slide-over">
        <div className="slide-head">
          <div className="row gap-10 items-center">
            <span className="mono f-xs text-3">{t.code}</span>
            <span style={{ flex:1 }}></span>
            <button className="btn btn-ghost btn-sm btn-icon"><Ico name="link" size={13} /></button>
            <button className="btn btn-ghost btn-sm btn-icon"><Ico name="more-horizontal" size={13} /></button>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><Ico name="x" size={14} /></button>
          </div>
          <h2 style={{ margin:'12px 0 0', fontSize:20, fontWeight:600, letterSpacing:'-.005em', lineHeight:1.3 }}>{t.title}</h2>
          <div className="row gap-8 items-center mt-10">
            <StatusPill status={t.status} />
            <PriorityPill p={t.priority} />
            <AreaPill id={t.area} mini />
            <span className="micro" style={{ marginLeft:'auto' }}>Creado hace 4 días</span>
          </div>
        </div>

        <div className="slide-body">
          {/* description */}
          <div className="micro mb-8">Descripción</div>
          <div className="card-pad" style={{ background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:6, fontSize:13.5, lineHeight:1.55, color:'var(--text-1)' }}>
            Solicitar cotizaciones formales a los tres proveedores preferidos de la zona (Lumicom, Iluminar SA y FocoMax) para la totalidad del techo de la zona ventas, oficinas y depósito. <br /><br />
            Especificación: paneles LED 60×60, 36W, 4000K. Incluir transporte y mano de obra. Plazo máximo: 7 días para responder.
          </div>

          {/* meta grid */}
          <div className="micro mt-24 mb-8">Detalles</div>
          <div className="meta-grid">
            <div className="lbl">Asignado</div>
            <div className="row gap-8 items-center"><Avatar name={m.name} size={22} /><span style={{ fontSize:13 }}>{m.name}</span></div>
            <div className="lbl">Fecha límite</div>
            <div className="mono f-sm" style={{ color: window.dueColor(t.due) }}>{window.fmtDate(t.due)} 2026</div>
            <div className="lbl">Prioridad</div>
            <div><PriorityPill p={t.priority} /></div>
            <div className="lbl">Estado</div>
            <div><StatusPill status={t.status} /></div>
            <div className="lbl">Área</div>
            <div><AreaPill id={t.area} mini /></div>
            <div className="lbl">Proyecto</div>
            <div style={{ fontSize:13 }}>{p.name}</div>
            <div className="lbl">Tiempo total</div>
            <div className="mono f-sm">{t.time}</div>
            <div className="lbl">Etiquetas</div>
            <div className="row gap-4"><span className="pill">obra-mayor</span><span className="pill">proveedores</span></div>
          </div>

          {/* Time tracker */}
          <div className="micro mt-24 mb-8">Tiempo</div>
          <div className="card-pad" style={{ background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:6, display:'flex', alignItems:'center', gap:14 }}>
            <button className="btn btn-primary btn-md btn-icon" style={{ width:40, height:40, borderRadius:999 }} onClick={() => setTiming(v => !v)}>
              <Ico name={timing ? 'pause' : 'play'} size={15} />
            </button>
            <div style={{ flex:1 }}>
              <div className="mono" style={{ fontSize:22, fontWeight:600, letterSpacing:'.02em', color: timing ? 'var(--teal)' : 'var(--text-1)' }}>{fmtSec(elapsed)}</div>
              <div className="f-xs text-2 mt-4">{timing ? 'Cronometrando ahora...' : `Total registrado: ${t.time}`}</div>
            </div>
            <button className="btn btn-ghost btn-sm">Agregar manual</button>
          </div>

          {/* Subtasks */}
          <div className="row between items-center mt-24 mb-8">
            <span className="micro">Subtareas <span className="mono" style={{ marginLeft:4 }}>{t.subtasks.done}/{t.subtasks.total}</span></span>
            <button className="btn btn-ghost btn-sm"><Ico name="plus" /> Agregar</button>
          </div>
          <div className="card-pad" style={{ background:'var(--surface-1)', border:'1px solid var(--border)', borderRadius:6, padding:0 }}>
            {[
              { d:true, t:'Listar proveedores aprobados', mn:'AM' },
              { d:true, t:'Enviar pliego de especificaciones', mn:'JR' },
              { d:false, t:'Hacer seguimiento por teléfono jueves', mn:'JR' },
              { d:false, t:'Comparar precios en planilla', mn:'AM' },
            ].slice(0, t.subtasks.total).map((s, i) => (
              <div key={i} style={{ padding:'10px 14px', borderBottom: i < t.subtasks.total - 1 ? '1px solid var(--border)' : '', display:'flex', alignItems:'center', gap:10 }}>
                <span className={`check ${s.d ? 'done' : ''}`}></span>
                <span style={{ flex:1, fontSize:13, textDecoration: s.d ? 'line-through' : 'none', color: s.d ? 'var(--text-2)' : 'var(--text-1)' }}>{s.t}</span>
                <span style={{ width:20, height:20, borderRadius:999, fontSize:9, fontWeight:600, background:'var(--surface-2)', display:'grid', placeItems:'center', color:'var(--text-2)' }}>{s.mn}</span>
              </div>
            ))}
          </div>

          {/* Comments + activity */}
          <div className="micro mt-24 mb-8">Comentarios</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', gap:10 }}>
              <Avatar name="Andrea Mendoza" size={26} />
              <div style={{ flex:1, fontSize:13, lineHeight:1.5 }}>
                <div><span className="fw-5">Andrea M.</span> <span className="mono f-xs text-3" style={{ marginLeft:6 }}>hace 2h</span></div>
                <div className="text-1 mt-4">Lumicom respondió, espera el pliego revisado hoy. FocoMax pidió plano del techo, lo subo a la tarea de relevamiento.</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <Avatar name="Carlos Rojas" size={26} />
              <div style={{ flex:1, fontSize:13, lineHeight:1.5 }}>
                <div><span className="fw-5">Carlos R.</span> <span className="mono f-xs text-3" style={{ marginLeft:6 }}>ayer</span></div>
                <div className="text-1 mt-4">Sumar pliego: deben cubrir mano de obra y garantía mínima 2 años.</div>
              </div>
            </div>
          </div>

          <div className="row gap-8 mt-16">
            <Avatar name="Joaquín Rivera" size={26} />
            <div className="input" style={{ flex:1, height:'auto', padding:'8px 12px' }}>
              <input type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="Escribí un comentario..." />
              <button className="btn btn-ghost btn-sm btn-icon"><Ico name="at-sign" size={13} /></button>
              <button className="btn btn-ghost btn-sm btn-icon"><Ico name="paperclip" size={13} /></button>
              <button className="btn btn-primary btn-sm btn-icon"><Ico name="arrow-up" size={12} /></button>
            </div>
          </div>

          <div className="micro mt-24 mb-8">Actividad</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:12, color:'var(--text-2)' }}>
            <div><span style={{ color:'var(--text-1)' }}>Joaquín</span> cambió estado a <span className="fw-5" style={{ color:'var(--text-1)' }}>{window.STATUS_LABELS[t.status]}</span> · <span className="mono">hace 3h</span></div>
            <div><span style={{ color:'var(--text-1)' }}>Andrea</span> agregó un comentario · <span className="mono">hace 2h</span></div>
            <div><span style={{ color:'var(--text-1)' }}>IA</span> sugirió mover la fecha a +2 días · <span className="mono">ayer</span></div>
            <div><span style={{ color:'var(--text-1)' }}>Joaquín</span> creó la tarea · <span className="mono">4 mar</span></div>
          </div>
        </div>
      </aside>
    </>
  );
};

// ─── Command Palette ───
const CmdK = ({ onClose, navigate, openTask }) => {
  const [q, setQ] = React.useState('');
  const sections = React.useMemo(() => {
    const Q = q.toLowerCase().trim();
    const nav = [
      { kind:'Ir a', label:'Inicio',             ico:'home',          go:() => navigate('dashboard'),  k:'inicio' },
      { kind:'Ir a', label:'Mi día',             ico:'sun',           go:() => navigate('myday'),      k:'mi dia' },
      { kind:'Ir a', label:'Calendario global',  ico:'calendar',      go:() => navigate('calendar'),   k:'calendario' },
      { kind:'Ir a', label:'Bandeja IA',         ico:'inbox',         go:() => navigate('ai'),         k:'bandeja ia' },
      { kind:'Ir a', label:'Reportes',           ico:'bar-chart-3',   go:() => navigate('reports'),    k:'reportes' },
      { kind:'Ir a', label:'Configuración',      ico:'settings',      go:() => navigate('settings'),   k:'config' },
    ];
    const proj = window.PROJECTS.map(p => ({ kind:'Proyecto', label:p.name, ico:'folder', sub: window.AREA(p.area).name, go:() => navigate(`project/${p.id}`), k: p.name.toLowerCase() }));
    const tasks = window.TASKS.slice(0, 10).map(t => ({ kind:'Tarea', label:t.title, ico:'check-square', sub:t.code + ' · ' + window.AREA(t.area).name, go:() => openTask(t.id), k: t.title.toLowerCase() }));
    const actions = [
      { kind:'Crear', label:'Nueva tarea',    ico:'plus',         k:'nueva tarea' },
      { kind:'Crear', label:'Nuevo proyecto', ico:'folder-plus',  k:'nuevo proyecto' },
      { kind:'Crear', label:'Nueva área',     ico:'map-pin',      k:'nueva area' },
      { kind:'IA',    label:'Resumen del día',         ico:'sparkles', k:'resumen ia' },
      { kind:'IA',    label:'Detector de bloqueos',    ico:'octagon-alert', k:'bloqueos' },
      { kind:'IA',    label:'Generar reporte semanal', ico:'file-bar-chart', k:'reporte ia' },
    ];
    const all = [...nav, ...proj, ...tasks, ...actions];
    const filtered = Q ? all.filter(x => x.k.includes(Q) || x.label.toLowerCase().includes(Q)) : all;
    const byKind = {};
    filtered.forEach(it => { (byKind[it.kind] = byKind[it.kind] || []).push(it); });
    return byKind;
  }, [q]);

  const flat = Object.values(sections).flat();
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => { setIdx(0); }, [q]);

  React.useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter')     { const it = flat[idx]; if (it && it.go) { it.go(); onClose(); } }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [flat, idx, onClose]);

  return (
    <>
      <div className="modal-bd" onClick={onClose}></div>
      <div className="cmdk">
        <div className="cmdk-search">
          <Ico name="search" size={14} color="var(--text-2)" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar o ejecutar comandos..." />
          <span className="kbd">ESC</span>
        </div>
        <div className="cmdk-list">
          {flat.length === 0 && (
            <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--text-3)', fontSize:13 }}>
              Sin resultados para “{q}”
            </div>
          )}
          {Object.entries(sections).map(([sec, items]) => (
            <div key={sec}>
              <div className="cmdk-sec">{sec}</div>
              {items.map((it, i) => {
                const flatIdx = flat.indexOf(it);
                return (
                  <div key={i} className={`cmdk-item ${flatIdx === idx ? 'active' : ''}`}
                    onMouseEnter={() => setIdx(flatIdx)}
                    onClick={() => { if (it.go) { it.go(); onClose(); } }}>
                    <Ico name={it.ico} size={14} color="var(--text-2)" />
                    <span>{it.label}</span>
                    {it.sub && <span className="hint">{it.sub}</span>}
                    {flatIdx === idx && <span className="kbd" style={{ marginLeft: it.sub ? 8 : 'auto' }}>↵</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmdk-foot">
          <span><span className="kbd">↑↓</span> Navegar</span>
          <span><span className="kbd">↵</span> Ejecutar</span>
          <span><span className="kbd">ESC</span> Cerrar</span>
          <span style={{ marginLeft:'auto' }}>Operaciones Tropical · Cmd+K</span>
        </div>
      </div>
    </>
  );
};

Object.assign(window, { TaskDetail, CmdK });
