// ════════════ App — router + shell ════════════

const App = () => {
  const [route, setRoute] = React.useState({ page:'dashboard' });
  const [collapsed, setCollapsed] = React.useState(false);
  const [mopen, setMopen] = React.useState(false);
  const [taskId, setTaskId] = React.useState(null);
  const [cmd, setCmd] = React.useState(false);
  const [view, setView] = React.useState('list');
  const [showLanding, setShowLanding] = React.useState(false);

  const navigate = (path) => {
    if (path === 'landing') { setShowLanding(true); return; }
    const parts = path.split('/');
    if (parts[0] === 'project') setRoute({ page:'project', id: parts[1] });
    else if (parts[0] === 'area') setRoute({ page:'area', id: parts[1] });
    else setRoute({ page: parts[0] });
    setShowLanding(false);
  };
  const openTask = (id) => setTaskId(id);

  React.useEffect(() => {
    const fn = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmd(c => !c); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Breadcrumb
  const breadcrumb = (() => {
    if (route.page === 'dashboard') return ['Inicio'];
    if (route.page === 'myday') return ['Mi día'];
    if (route.page === 'calendar') return ['Calendario global'];
      if (route.page === 'inbox') return ['Bandeja IA'];
    if (route.page === 'ai') return ['Asistente IA'];
    if (route.page === 'reports') return ['Reportes'];
    if (route.page === 'settings') return ['Configuración'];
    if (route.page === 'empty') return ['Empty states'];
    if (route.page === 'area') { const a = window.AREA(route.id); return ['Áreas', a.name]; }
    if (route.page === 'project') { const p = window.PROJECT(route.id); const a = window.AREA(p.area); return [a.name, p.name]; }
    return [];
  })();

  // Page body
  const renderPage = () => {
    switch (route.page) {
      case 'dashboard': return <Dashboard navigate={navigate} openTask={openTask} />;
      case 'myday': return <MyDay openTask={openTask} />;
      case 'calendar': return <CalendarView openTask={openTask} />;
      case 'ai': return <AIAssistant />;
      case 'inbox': return <AIInbox openTask={openTask} />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      case 'empty': return <EmptyStates />;
      case 'area': return <AreaView areaId={route.id} navigate={navigate} openTask={openTask} />;
      case 'project': {
        const p = window.PROJECT(route.id);
        return (
          <div style={{ height:'100%', overflow:'auto', display:'flex', flexDirection:'column' }}>
            <ProjectHeader project={p} view={view} setView={setView} />
            <div style={{ flex:1 }}>
              {view === 'list' && <ProjectList project={p} openTask={openTask} />}
              {view === 'kanban' && <ProjectKanban project={p} openTask={openTask} />}
              {view === 'gantt' && <ProjectGantt project={p} openTask={openTask} />}
              {view === 'cal' && <div style={{ padding:32 }}><EmptyStates /></div>}
              {view === 'table' && <ProjectList project={p} openTask={openTask} />}
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  if (showLanding) {
    return <Landing onEnter={() => { setShowLanding(false); setRoute({ page:'dashboard' }); }} />;
  }

  return (
    <div className={`app ${collapsed ? 'collapsed' : ''} ${mopen ? 'mopen' : ''}`}>
      <Sidebar route={route} navigate={(p) => { navigate(p); setMopen(false); }} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="main">
        <Topbar breadcrumb={breadcrumb} onOpenCmd={() => setCmd(true)} onShowLanding={() => setShowLanding(true)} onBurger={() => setMopen(o => !o)} />
        <div className="content">{renderPage()}</div>
      </main>
      {taskId && <TaskDetail taskId={taskId} onClose={() => setTaskId(null)} />}
      {cmd && <CmdK onClose={() => setCmd(false)} navigate={navigate} openTask={openTask} />}
    </div>
  );
};

// ─── Sidebar ───
const Sidebar = ({ route, navigate, collapsed, setCollapsed }) => {
  const [expanded, setExpanded] = React.useState({ outlet:true, norte:true, corp:false, bodega:true, plaza:false });
  const wsItems = [
    { id:'dashboard', label:'Inicio',            icon:'home' },
    { id:'myday',     label:'Mi día',            icon:'sun' },
    { id:'inbox',     label:'Bandeja IA',        icon:'inbox', badge:3 },
    { id:'ai',        label:'Asistente IA',      icon:'sparkles' },
    { id:'calendar',  label:'Calendario global', icon:'calendar' },
    { id:'reports',   label:'Reportes',          icon:'bar-chart-3' },
  ];

  const isActiveArea = (aid) => route.page === 'area' && route.id === aid;
  const isActiveProject = (pid) => route.page === 'project' && route.id === pid;

  return (
    <aside className="sidebar">
      <div className="sb-head">
        <span className="ot-logo">OT</span>
        {!collapsed && <span className="ot-name">Operaciones Tropical</span>}
        {!collapsed && <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft:'auto', width:22, height:22 }} onClick={() => setCollapsed(true)}><Ico name="panel-left-close" size={13} /></button>}
        {collapsed && <button className="btn btn-ghost btn-sm btn-icon" style={{ width:22, height:22 }} onClick={() => setCollapsed(false)}><Ico name="panel-left-open" size={13} /></button>}
      </div>

      <div className="sb-scroll">
        {!collapsed && <div className="sb-section">Workspace</div>}
        {wsItems.map(it => (
          <div key={it.id} className={`sb-item ${route.page === it.id ? 'active' : ''}`} onClick={() => navigate(it.id)} title={collapsed ? it.label : ''}>
            <Ico name={it.icon} size={14} />
            {!collapsed && <span>{it.label}</span>}
            {!collapsed && it.badge && <span className="sb-badge">{it.badge}</span>}
          </div>
        ))}

        {!collapsed && <div className="sb-section">Áreas</div>}
        {window.AREAS.map(a => {
          const projects = window.PROJECTS.filter(p => p.area === a.id);
          const key = a.id;
          const isOpen = expanded[key];
          return (
            <div key={a.id}>
              <div className={`sb-item ${isActiveArea(a.id) ? 'active' : ''}`}
                onClick={() => { setExpanded(s => ({ ...s, [key]: !s[key] })); navigate(`area/${a.id}`); }}
                title={collapsed ? a.name : ''}>
                {!collapsed && <Ico name={isOpen ? 'chevron-down' : 'chevron-right'} size={12} color="var(--text-3)" />}
                <span className="sb-area-dot" style={{ background: a.color }}></span>
                {!collapsed && <span>{a.name}</span>}
                {!collapsed && <span className="sb-count">{projects.length}</span>}
              </div>
              {!collapsed && isOpen && (
                <div className="sb-sub">
                  {projects.map(p => (
                    <div key={p.id} className={`sb-item ${isActiveProject(p.id) ? 'active' : ''}`} onClick={() => navigate(`project/${p.id}`)}>
                      <Ico name="check-square" size={12} />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!collapsed && (
          <div className="sb-item" style={{ color:'var(--text-3)', marginTop:4 }}>
            <Ico name="plus" size={12} /><span>Nueva área</span>
          </div>
        )}

        {!collapsed && (
          <>
            <div className="sb-section">Sistema</div>
            <div className={`sb-item ${route.page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Ico name="settings" size={14} /><span>Configuración</span></div>
            <div className={`sb-item ${route.page === 'empty' ? 'active' : ''}`} onClick={() => navigate('empty')}><Ico name="layout-template" size={14} /><span>Empty states</span></div>
          </>
        )}
      </div>

      <div className="sb-foot">
        <Avatar name="Joaquín Rivera" size={28} />
        {!collapsed && (
          <div style={{ flex:1, minWidth:0 }}>
            <div className="fw-5 f-sm" style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Joaquín Rivera</div>
            <div className="f-xs text-3">Admin · Operaciones</div>
          </div>
        )}
        {!collapsed && <button className="btn btn-ghost btn-sm btn-icon"><Ico name="settings" size={13} /></button>}
      </div>
    </aside>
  );
};

// ─── Topbar ───
const Topbar = ({ breadcrumb, onOpenCmd, onShowLanding, onBurger }) => (
  <div className="topbar">
    <button className="btn btn-ghost btn-sm btn-icon mobile-burger" onClick={onBurger}><Ico name="menu" size={15} /></button>
    <div className="breadcrumb hide-mob">
      {breadcrumb.map((b, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Ico name="chevron-right" size={11} color="var(--text-3)" />}
          <span className={i === breadcrumb.length - 1 ? 'fw-5' : ''} style={i === breadcrumb.length - 1 ? { color:'var(--text-1)' } : {}}>{b}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="tb-search" onClick={onOpenCmd}>
      <Ico name="search" size={13} color="var(--text-2)" />
      <input placeholder="Buscar tareas, proyectos, personas..." readOnly />
      <span className="kbd">⌘K</span>
    </div>
    <div className="row gap-8 items-center" style={{ marginLeft:'auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={onShowLanding} title="Ver landing pública"><Ico name="globe" size={13} /></button>
      <button className="btn btn-secondary btn-sm"><Ico name="sparkles" size={13} color="var(--teal)" /> Asistente IA</button>
      <span className="avatar-stack avatar-stack-bordered" style={{ marginLeft:4 }}>
        {window.TEAM.slice(0, 4).map(m => <Avatar key={m.id} name={m.name} size={24} />)}
      </span>
      <button className="btn btn-primary btn-sm"><Ico name="plus" /> Nuevo</button>
    </div>
  </div>
);

Object.assign(window, { App, Sidebar, Topbar });

// mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
