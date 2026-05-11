import { Filter, Plus, Zap, Users, ArrowRight, CircleAlert, TriangleAlert, CircleCheck, ListTodo, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TASKS, PROJECTS, AREAS, ACTIVITY, getMember, daysFromToday, fmtDate, dueColor } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, AreaPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';

export default function Dashboard() {
  const navigate = useNavigate();
  const { openTask } = useAppStore();

  const myTasks = TASKS.filter(t => t.assignee === 'joa' && t.status !== 'done').slice(0, 5);

  const activityIcon = (k: string) => {
    if (k === 'done') return <CircleCheck size={14} color="var(--green)" />;
    if (k === 'block') return <CircleAlert size={14} color="var(--red)" />;
    if (k === 'create') return <Plus size={14} color="var(--teal)" />;
    return <ArrowRight size={14} color="var(--text-2)" />;
  };

  const areaLoad = AREAS.map(a => {
    const proj = PROJECTS.filter(p => p.area === a.id);
    const tasks = TASKS.filter(t => t.area === a.id);
    const open = tasks.filter(t => t.status !== 'done').length;
    return {
      ...a,
      projects: proj.length,
      openTasks: open,
      progress: Math.round(proj.reduce((s, p) => s + p.progress, 0) / Math.max(proj.length, 1)),
    };
  });

  return (
    <>
      <PageHead
        title="Hola, Joaquín"
        subtitle="Martes 10 de marzo · 5 áreas activas · 18 tareas abiertas"
        right={
          <div className="row gap-8">
            <button className="btn btn-secondary btn-md">
              <Filter size={14} /> Filtros
            </button>
            <button className="btn btn-primary btn-md">
              <Plus size={14} /> Nueva tarea
            </button>
          </div>
        }
      />
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* KPIs */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div className="card kpi">
            <div className="lbl"><ListTodo size={13} /> Tareas hoy</div>
            <div className="val">8</div>
            <div className="sub">+2 vs ayer</div>
          </div>
          <div className="card kpi danger">
            <div className="lbl"><CircleAlert size={13} /> Vencidas</div>
            <div className="val">2</div>
            <div className="sub">En 2 áreas</div>
          </div>
          <div className="card kpi warn">
            <div className="lbl"><TriangleAlert size={13} /> En riesgo</div>
            <div className="val">3</div>
            <div className="sub">Fecha próxima</div>
          </div>
          <div className="card kpi ok">
            <div className="lbl"><CircleCheck size={13} /> Completadas semana</div>
            <div className="val">24</div>
            <div className="sub">+15% vs semana pasada</div>
          </div>
        </div>

        {/* AI summary */}
        <div className="card" style={{ borderColor: 'rgba(20,184,166,.25)', background: 'linear-gradient(180deg, rgba(20,184,166,.04), transparent)' }}>
          <div className="card-pad">
            <div className="row gap-10 items-center">
              <span style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--teal-bg)', display: 'grid', placeItems: 'center', color: 'var(--teal)' }}>
                <Sparkles size={14} />
              </span>
              <div className="fw-6">Resumen IA del día</div>
              <span className="micro" style={{ marginLeft: 'auto' }}>Generado hace 2 min</span>
            </div>
            <p style={{ margin: '14px 0 0', color: 'var(--text-1)', fontSize: 14, lineHeight: 1.6, maxWidth: 780 }}>
              Tenés <span className="fw-6">2 tareas vencidas</span> que requieren atención inmediata, ambas en Outlet Centro y bloqueando el avance de Remodelación local. <span className="fw-6">Migración POS</span> presenta riesgo: la tarea crítica de backup vence hoy y está en revisión. Las áreas de <span className="fw-6">Bodega Sur</span> y <span className="fw-6">Edificio Corporativo</span> bajaron su ritmo de cierre esta semana — recomiendo reasignar carga de Carlos R.
            </p>
            <div className="row gap-8 mt-16">
              <button className="btn btn-secondary btn-sm"><Zap size={14} /> Resolver vencidas</button>
              <button className="btn btn-secondary btn-sm"><Users size={14} /> Rebalancear carga</button>
              <button className="btn btn-ghost btn-sm">Ver detalle <ArrowRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* Two columns */}
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <span className="title">Mis tareas hoy</span>
              <span className="micro" style={{ marginLeft: 'auto' }}>{myTasks.length} pendientes</span>
            </div>
            <div>
              {myTasks.map(t => {
                const due = daysFromToday(t.due);
                const dueLbl = due < 0 ? `Vencida · ${fmtDate(t.due)}` : due === 0 ? 'Hoy' : due === 1 ? 'Mañana' : fmtDate(t.due);
                return (
                  <div
                    key={t.id}
                    onClick={() => openTask(t.id)}
                    style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <span className="check"></span>
                    <span style={{ flex: 1, fontSize: 13.5 }}>{t.title}</span>
                    <AreaPill areaId={t.area} mini />
                    <span className="mono" style={{ fontSize: 12, color: dueColor(t.due), minWidth: 80, textAlign: 'right' }}>{dueLbl}</span>
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
            <div style={{ padding: '8px 18px 12px' }}>
              {ACTIVITY.map((a, i) => {
                const m = getMember(a.who)!;
                return (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--border)' : '' }}
                  >
                    <Avatar name={m.name} size={22} />
                    <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.5 }}>
                      <span className="fw-5">{m.short}</span> <span className="text-2">{a.action}</span> <span className="fw-5">{a.target}</span>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{a.when}</div>
                    </div>
                    <span style={{ marginTop: 2 }}>{activityIcon(a.kind)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Areas */}
        <div>
          <div className="section-title">Áreas más activas</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {areaLoad.map(a => (
              <div
                key={a.id}
                className="card card-pad"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/area/${a.id}`)}
              >
                <div className="row gap-8 items-center">
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: a.color, display: 'grid', placeItems: 'center', color: '#0A0A0B', fontSize: 9 }}>
                    {a.name.slice(0, 1)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</span>
                </div>
                <div className="row between items-center mt-12">
                  <span className="micro">{a.projects} proyectos</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-1)' }}>{a.progress}%</span>
                </div>
                <div className="progress mt-8">
                  <div style={{ width: a.progress + '%', background: a.color }}></div>
                </div>
                <div className="mono mt-8" style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.openTasks} tareas abiertas</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
