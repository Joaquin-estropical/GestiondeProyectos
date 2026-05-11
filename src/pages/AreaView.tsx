import { useParams, useNavigate } from 'react-router-dom';
import { Folder, ListTodo, Percent, Users, UserPlus, Plus, Pencil } from 'lucide-react';
import { useAreas, useProjects, useTasks } from '@/hooks/useSupabase';
import { getMember, fmtDate, dueColor } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';

export default function AreaView() {
  const { areaId } = useParams<{ areaId: string }>();
  const navigate   = useNavigate();
  const { openTask, openNewProject, openNewArea } = useAppStore();

  const id = areaId ?? '';

  const { data: areas    = [], loading } = useAreas();
  const { data: projects = [] }          = useProjects(id);
  const { data: tasks    = [] }          = useTasks({ areaId: id });

  const a = areas.find(x => x.id === id);

  if (loading) return <div className="page-body" style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando área...</div>;
  if (!a) return <div className="page-body">Área no encontrada.</div>;

  const open     = tasks.filter(t => t.status !== 'done').length;
  const done     = tasks.filter(t => t.status === 'done').length;
  const pct      = Math.round(done / Math.max(tasks.length, 1) * 100);
  const critical = tasks
    .filter(t => t.priority === 'urg' || (t.status !== 'done' && new Date(t.due) <= new Date('2026-03-11')))
    .slice(0, 5);

  return (
    <>
      <PageHead
        title={a.name}
        subtitle={`${projects.length} proyectos activos · ${open} tareas abiertas`}
        right={
          <div className="row gap-8">
            <button className="btn btn-ghost btn-md" onClick={() => openNewArea(a.id)}><Pencil size={14} /> Editar</button>
            <button className="btn btn-secondary btn-md"><UserPlus size={14} /> Invitar</button>
            <button className="btn btn-primary btn-md" onClick={() => openNewProject(a.id)}><Plus size={14} /> Nuevo proyecto</button>
          </div>
        }
      />
      <div className="page-body">
        <div className="grid mb-24" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <div className="card kpi">
            <div className="lbl"><Folder size={13} /> Proyectos activos</div>
            <div className="val">{projects.length}</div>
          </div>
          <div className="card kpi">
            <div className="lbl"><ListTodo size={13} /> Tareas abiertas</div>
            <div className="val">{open}</div>
          </div>
          <div className="card kpi">
            <div className="lbl"><Percent size={13} /> Completado</div>
            <div className="val">{pct}%</div>
          </div>
          <div className="card kpi">
            <div className="lbl"><Users size={13} /> Miembros</div>
            <div className="val">5</div>
          </div>
        </div>

        <div className="section-title">Proyectos</div>
        <div className="grid mb-24" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {projects.map(p => (
            <div
              key={p.id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/proyecto/${p.id}`)}
            >
              <div className="card-pad">
                <div className="row between items-center">
                  <span className="fw-6" style={{ fontSize: 14 }}>{p.name}</span>
                  <span className="micro mono">{p.progress}%</span>
                </div>
                <div className="text-2 f-xs mt-4">Entrega {fmtDate(p.due)} · {p.count} tareas</div>
                <div className="progress mt-16">
                  <div style={{ width: p.progress + '%', background: a.color }}></div>
                </div>
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
                  <td style={{ width: 30 }}><span className="check"></span></td>
                  <td>{t.title}</td>
                  <td style={{ width: 130 }}>
                    <div className="row gap-8 items-center">
                      <Avatar name={getMember(t.assignee)?.name ?? ''} size={20} />
                      <span className="f-xs text-2">{getMember(t.assignee)?.short}</span>
                    </div>
                  </td>
                  <td style={{ width: 100 }}>
                    <span className="mono f-xs" style={{ color: dueColor(t.due) }}>{fmtDate(t.due)}</span>
                  </td>
                  <td style={{ width: 90 }}><PriorityPill priority={t.priority} /></td>
                  <td style={{ width: 120 }}><StatusPill status={t.status} /></td>
                </tr>
              ))}
              {critical.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '18px', color: 'var(--text-3)', fontSize: 13 }}>Sin tareas críticas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
