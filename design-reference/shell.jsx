// ════════════ Shared UI: Avatar, Pill, Sidebar, Topbar, Icon ════════════

const Ico = ({ name, size, stroke, color, style }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && window.lucide) {
      ref.current.innerHTML = '';
      const el = document.createElement('i');
      el.setAttribute('data-lucide', name);
      ref.current.appendChild(el);
      window.lucide.createIcons({ icons: window.lucide.icons, nameAttr: 'data-lucide' });
    }
  }, [name]);
  const s = size || 14;
  return <span ref={ref} style={{ display:'inline-flex', width:s, height:s, color: color || 'currentColor', ...style }}
    data-stroke={stroke || 1.6} />;
};

const Avatar = ({ name, size = 24, title }) => {
  const sz = size;
  const fs = size <= 20 ? 9.5 : size <= 24 ? 10.5 : size <= 32 ? 12.5 : 18;
  return (
    <span title={title || name} style={{
      width:sz, height:sz, borderRadius:999, display:'inline-grid',
      placeItems:'center', fontSize:fs, fontWeight:600, color:'#0A0A0B',
      background: window.avatarColor(name), flex:'none',
    }}>{window.initials(name)}</span>
  );
};

const AvatarStack = ({ ids, size = 24, more, max = 4 }) => {
  const list = ids.slice(0, max);
  const rest = (more != null ? more : Math.max(0, ids.length - max));
  return (
    <span className="avatar-stack avatar-stack-bordered">
      {list.map(id => {
        const m = window.MEMBER(id);
        return <Avatar key={id} name={m.name} size={size} />;
      })}
      {rest > 0 && (
        <span style={{
          width:size, height:size, borderRadius:999, display:'inline-grid',
          placeItems:'center', fontSize:10, fontWeight:600, color:'var(--text-2)',
          background:'var(--surface-2)', border:'1.5px solid var(--bg)', marginLeft:-6,
        }} className="mono">+{rest}</span>
      )}
    </span>
  );
};

const StatusPill = ({ status, mini }) => (
  <span className={`pill pill-status-${status}`}>
    <span className="dot"></span>{window.STATUS_LABELS[status]}
  </span>
);
const PriorityPill = ({ p, iconOnly }) => (
  <span className={`pill pill-prio-${p}`} style={iconOnly ? { padding:'2px 6px', background:'transparent', border:0 } : {}}>
    <Ico name="flag" size={11} />
    {!iconOnly && window.PRIORITY_LABELS[p]}
  </span>
);
const AreaPill = ({ id, mini }) => {
  const a = window.AREA(id);
  if (!a) return null;
  return (
    <span className="pill pill-area">
      <span className="ico" style={{ background: a.color }}>
        <Ico name={a.icon} size={9} />
      </span>
      {!mini && a.name}
    </span>
  );
};

// ─── Sidebar ───
const Sidebar = ({ route, navigate, collapsed, onToggleCollapse }) => {
  const [expanded, setExpanded] = React.useState({ outlet: true, norte: false, corp: false, bodega: false, plaza: false });
  const isActive = (r) => route === r || route.startsWith(r + '/');
  const projectsByArea = (areaId) => window.PROJECTS.filter(p => p.area === areaId);

  return (
    <aside className="app-sidebar">
      <div className="sb-brand">
        <div className="sb-logo">OT</div>
        <div className="sb-name">Operaciones Tropical</div>
        <span className="sb-collapse" onClick={onToggleCollapse} title={collapsed ? 'Expandir' : 'Colapsar'}>
          <Ico name={collapsed ? 'panel-left-open' : 'panel-left-close'} size={14} />
        </span>
      </div>

      <div className="sb-section">
        <div className="sb-label">Workspace</div>
        <div className={`sb-item ${isActive('dashboard') ? 'active' : ''}`} onClick={() => navigate('dashboard')}>
          <Ico name="home" /><span>Inicio</span>
        </div>
        <div className={`sb-item ${isActive('my-day') ? 'active' : ''}`} onClick={() => navigate('my-day')}>
          <Ico name="sun" /><span>Mi día</span>
        </div>
        <div className={`sb-item ${isActive('ai') ? 'active' : ''}`} onClick={() => navigate('ai')}>
          <Ico name="sparkles" /><span>Bandeja IA</span>
          <span className="badge">3</span>
        </div>
        <div className={`sb-item ${isActive('calendar') ? 'active' : ''}`} onClick={() => navigate('calendar')}>
          <Ico name="calendar-days" /><span>Calendario global</span>
        </div>
        <div className={`sb-item ${isActive('reports') ? 'active' : ''}`} onClick={() => navigate('reports')}>
          <Ico name="bar-chart-3" /><span>Reportes</span>
        </div>
      </div>

      <div className="sb-section">
        <div className="sb-label">Áreas</div>
        {window.AREAS.map(a => {
          const isExp = expanded[a.id];
          const projs = projectsByArea(a.id);
          const areaActive = route === `area/${a.id}`;
          return (
            <div key={a.id}>
              <div className={`sb-item ${areaActive ? 'active' : ''}`}
                onClick={() => navigate(`area/${a.id}`)}>
                <span style={{ display:'inline-flex', cursor:'pointer' }} onClick={(e) => { e.stopPropagation(); setExpanded({ ...expanded, [a.id]: !isExp }); }}>
                  <Ico name={isExp ? 'chevron-down' : 'chevron-right'} size={12} color="var(--text-3)" />
                </span>
                <span className="sb-area-dot" style={{ background: a.color }}></span>
                <span>{a.name}</span>
              </div>
              {isExp && (
                <div className="sb-tree">
                  {projs.map(p => (
                    <div key={p.id}
                      className={`sb-item ${route === `project/${p.id}` || route.startsWith(`project/${p.id}/`) ? 'active' : ''}`}
                      onClick={() => navigate(`project/${p.id}`)}>
                      <span className="dot" style={{ background: a.color }}></span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="sb-item" style={{ color:'var(--text-3)' }}>
          <Ico name="plus" /><span>Nueva área</span>
        </div>
      </div>

      <div style={{ height: 24 }}></div>

      <div className="sb-foot">
        <span className="uavatar" style={{ background: window.avatarColor('Joaquín Rivera') }}>JR</span>
        <span className="uname">Joaquín Rivera</span>
        <span className="sb-settings" onClick={() => navigate('settings')}>
          <Ico name="settings" size={14} />
        </span>
      </div>
    </aside>
  );
};

// ─── Topbar ───
const Topbar = ({ crumbs, onOpenCmdK, onOpenAI }) => (
  <header className="app-topbar">
    <div className="tb-crumb">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Ico name="chevron-right" />}
          <span className={i === crumbs.length - 1 ? 'cur' : ''}>{c}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="tb-search" onClick={onOpenCmdK} style={{ marginLeft: 20 }}>
      <Ico name="search" />
      <span style={{ flex:1 }}>Buscar tareas, proyectos, personas...</span>
      <span className="key">⌘K</span>
    </div>
    <div className="tb-right">
      <button className="tb-ai" onClick={onOpenAI}>
        <Ico name="sparkles" /> Asistente IA
      </button>
      <span className="avatar-stack avatar-stack-bordered">
        {window.TEAM.slice(0,3).map(m => <Avatar key={m.id} name={m.name} size={26} />)}
      </span>
      <button className="btn btn-primary btn-sm"><Ico name="plus" /> Nuevo</button>
    </div>
  </header>
);

// ─── Page header ───
const PageHead = ({ title, subtitle, right }) => (
  <div className="page-head">
    <div className="row between items-center">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {right && <div>{right}</div>}
    </div>
  </div>
);

// ─── Donut chart (SVG) ───
const Donut = ({ data, size = 140, stroke = 18, center }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      {data.map((d, i) => {
        const frac = d.value / total;
        const dash = c * frac;
        const offset = -c * acc;
        acc += frac;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={d.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`} />
        );
      })}
      {center && (
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          fill="var(--text-1)" fontSize="22" fontFamily="JetBrains Mono" fontWeight="600">{center}</text>
      )}
    </svg>
  );
};

// ─── Sparkline (SVG) ───
const Spark = ({ data, w = 80, h = 24, color = 'var(--teal)' }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / rng) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Expose ───
Object.assign(window, {
  Ico, Avatar, AvatarStack,
  StatusPill, PriorityPill, AreaPill,
  Sidebar, Topbar, PageHead,
  Donut, Spark,
});
