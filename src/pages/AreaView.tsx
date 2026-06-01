import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Folder, ListTodo, Percent, Users, UserPlus, Plus, Pencil, MoreHorizontal, Pen, Trash2, Layers } from 'lucide-react';
import { useAreas, useSubAreas, useProjects, useTasks, useMembers } from '@/hooks/useSupabase';
import { fmtDate, dueColor } from '@/lib/mock-data';
import { Avatar } from '@/components/shared/Avatar';
import { StatusPill, PriorityPill } from '@/components/shared/Badges';
import { PageHead } from '@/components/shared/PageHead';
import { useAppStore } from '@/stores/app';
import { deleteSubArea } from '@/lib/db';

// ── Dropdown menu for project cards ──
function ProjectMenu({ projectId, projectName, onEdit }: { projectId: string; projectName: string; onEdit: () => void }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { removeProject, refreshAll } = useAppStore();
  const navigate = useNavigate();
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideBtn  = btnRef.current?.contains(target);
      const insideMenu = menuRef.current?.contains(target);
      if (!insideBtn && !insideMenu) setPos(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setPos(null); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPos(null);
    if (!confirm(`¿Eliminar el proyecto "${projectName}" y todas sus tareas? Esta acción no se puede deshacer.`)) return;
    try {
      const { deleteProject } = await import('@/lib/db');
      await deleteProject(projectId);
      removeProject(projectId);
      await refreshAll();
      navigate(window.location.pathname);
    } catch (err) {
      alert('Error al eliminar: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const menuItem = (icon: React.ReactNode, label: string, color: string, onClick: (e: React.MouseEvent) => void) => (
    <button
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', color, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
      onClick={e => { e.stopPropagation(); setPos(null); onClick(e); }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {icon} {label}
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        className="btn btn-ghost btn-sm btn-icon"
        style={{ width: 26, height: 26, opacity: 0.7 }}
        onClick={toggle}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && pos && (
        <div ref={menuRef} style={{
          position: 'fixed', top: pos.top, right: pos.right, zIndex: 9000,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '4px 0', minWidth: 180,
          boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}>
          {menuItem(<Pen size={13} color="var(--text-2)" />, 'Renombrar / editar', 'var(--text-1)', (_e) => onEdit())}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          {menuItem(<Trash2 size={13} color="var(--red)" />, 'Eliminar proyecto', 'var(--red)', handleDelete)}
        </div>
      )}
    </>
  );
}

// ── Dropdown menu for subarea cards ──
function SubAreaMenu({ subareaId, subareaName }: { subareaId: string; subareaName: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openNewSubArea, removeSubArea, refreshAll } = useAppStore();
  const open = pos !== null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setPos(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setPos(null); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPos(null);
    if (!confirm(`¿Eliminar la sub-área "${subareaName}" y sus proyectos y tareas? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteSubArea(subareaId);
      removeSubArea(subareaId);
      await refreshAll();
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <>
      <button ref={btnRef} className="btn btn-ghost btn-sm btn-icon" style={{ width: 26, height: 26, opacity: 0.7 }} onClick={toggle}>
        <MoreHorizontal size={14} />
      </button>
      {open && pos && (
        <div ref={menuRef} style={{
          position: 'fixed', top: pos.top, right: pos.right, zIndex: 9000,
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '4px 0', minWidth: 180,
          boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}>
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            onClick={() => { setPos(null); openNewSubArea(undefined, subareaId); }}
          >
            <Pen size={13} color="var(--text-2)" /> Renombrar / editar
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: 'var(--red)', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            onClick={handleDelete}
          >
            <Trash2 size={13} color="var(--red)" /> Eliminar sub-área
          </button>
        </div>
      )}
    </>
  );
}

export default function AreaView() {
  const { areaId, subareaId } = useParams<{ areaId: string; subareaId?: string }>();
  const navigate   = useNavigate();
  const { openTask, openNewProject, openNewSubArea, openNewArea, openEditProject } = useAppStore();

  const id = areaId ?? '';

  const { data: areas    = [], loading } = useAreas();
  const { data: subareas = [] }          = useSubAreas(id);
  const { data: allProjects = [] }       = useProjects(id);
  const { data: tasks    = [] }          = useTasks({ areaId: id });
  const { data: members  = [] }          = useMembers();
  const resolveMember = (memberId: string) => members.find(m => m.id === memberId);

  const a = areas.find(x => x.id === id);
  const sa = subareaId ? subareas.find(x => x.id === subareaId) : null;

  // Filter projects by sub-area when viewing a sub-area
  const projects = subareaId ? allProjects.filter(p => p.subarea === subareaId) : allProjects;

  // For sub-area view, also filter tasks
  const filteredTasks = subareaId
    ? tasks.filter(t => projects.some(p => p.id === t.project))
    : tasks;

  if (loading) return <div className="page-body" style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando área...</div>;
  if (!a) return <div className="page-body">Área no encontrada.</div>;
  if (subareaId && !sa) return <div className="page-body">Sub-área no encontrada.</div>;

  const isEdificio = a.type === 'edificio';

  const open     = filteredTasks.filter(t => t.status !== 'done').length;
  const done     = filteredTasks.filter(t => t.status === 'done').length;
  const pct      = Math.round(done / Math.max(filteredTasks.length, 1) * 100);
  const critical = filteredTasks
    .filter(t => t.status !== 'done' && (t.priority === 'urg' || t.priority === 'alta'))
    .slice(0, 5);

  // ─── Mode: NON-EDIFICIO AREA (list of projects directly) ──
  if (!isEdificio && !subareaId) {
    return (
      <>
        <PageHead
          title={a.name}
          subtitle={`${allProjects.length} proyectos · ${open} tareas abiertas`}
          right={
            <div className="row gap-8">
              <button className="btn btn-ghost btn-md" onClick={() => openNewArea(a.id)}><Pencil size={14} /> <span className="hide-mob">Editar</span></button>
              <button className="btn btn-primary btn-md" onClick={() => openNewProject(a.id)}><Plus size={14} /> <span className="hide-mob">Nuevo proyecto</span></button>
            </div>
          }
        />
        <div className="page-body">
          <div className="grid mb-24" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
            <div className="card kpi"><div className="lbl"><Folder size={13} /> Proyectos</div><div className="val">{allProjects.length}</div></div>
            <div className="card kpi"><div className="lbl"><ListTodo size={13} /> Tareas abiertas</div><div className="val">{open}</div></div>
            <div className="card kpi"><div className="lbl"><Percent size={13} /> Completado</div><div className="val">{pct}%</div></div>
          </div>
          <div className="section-title">Proyectos</div>
          <div className="grid mb-24" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {allProjects.map(p => (
              <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/proyecto/${p.id}`)}>
                <div className="card-pad">
                  <div className="row between items-center">
                    <span className="fw-6" style={{ fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{p.name}</span>
                    <span className="micro mono" style={{ flexShrink: 0 }}>{p.progress}%</span>
                    <ProjectMenu projectId={p.id} projectName={p.name} onEdit={() => openEditProject(p.id)} />
                  </div>
                  <div className="text-2 f-xs mt-4">{fmtDate(p.due)} · {p.count} tareas</div>
                  <div className="progress mt-16"><div style={{ width: p.progress + '%', background: a.color }}></div></div>
                </div>
              </div>
            ))}
            {allProjects.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '24px 18px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Sin proyectos. Hacé clic en "Nuevo proyecto" para crear uno.
              </div>
            )}
          </div>
          {critical.length > 0 && (
            <>
              <div className="section-title">Tareas críticas</div>
              <div className="card area-tasks-card" style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: 460 }}>
                  <tbody>
                    {critical.map(t => (
                      <tr key={t.id} onClick={() => openTask(t.id)}>
                        <td style={{ width: 30 }}><span className="check"></span></td>
                        <td>{t.title}</td>
                        <td style={{ width: 130 }}>
                          <div className="row gap-8 items-center">
                            <Avatar name={resolveMember(t.assignee)?.name ?? t.assignee} size={20} />
                            <span className="f-xs text-2">{resolveMember(t.assignee)?.short ?? t.assignee}</span>
                          </div>
                        </td>
                        <td style={{ width: 100 }}><span className="mono f-xs" style={{ color: dueColor(t.due) }}>{fmtDate(t.due)}</span></td>
                        <td style={{ width: 90 }}><PriorityPill priority={t.priority} /></td>
                        <td style={{ width: 120 }}><StatusPill status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // ─── Mode: EDIFICIO (list of sub-areas) ───────────────────
  if (!subareaId) {
    return (
      <>
        <PageHead
          title={a.name}
          subtitle={`${subareas.length} sub-áreas · ${allProjects.length} proyectos · ${open} tareas abiertas`}
          right={
            <div className="row gap-8">
              <button className="btn btn-ghost btn-md" onClick={() => openNewArea(a.id)}><Pencil size={14} /> <span className="hide-mob">Editar</span></button>
              <button className="btn btn-primary btn-md" onClick={() => openNewSubArea(a.id)}><Plus size={14} /> <span className="hide-mob">Nueva sub-área</span></button>
            </div>
          }
        />
        <div className="page-body">
          <div className="grid mb-24" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
            <div className="card kpi">
              <div className="lbl"><Layers size={13} /> Sub-áreas</div>
              <div className="val">{subareas.length}</div>
            </div>
            <div className="card kpi">
              <div className="lbl"><Folder size={13} /> Proyectos</div>
              <div className="val">{allProjects.length}</div>
            </div>
            <div className="card kpi">
              <div className="lbl"><ListTodo size={13} /> Tareas abiertas</div>
              <div className="val">{open}</div>
            </div>
            <div className="card kpi">
              <div className="lbl"><Percent size={13} /> Completado</div>
              <div className="val">{pct}%</div>
            </div>
          </div>

          <div className="section-title">Sub-áreas</div>
          <div className="grid mb-24" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
            {subareas.map(s => {
              const subProjs = allProjects.filter(p => p.subarea === s.id);
              const subTasks = tasks.filter(t => subProjs.some(p => p.id === t.project));
              const subOpen  = subTasks.filter(t => t.status !== 'done').length;
              return (
                <div
                  key={s.id}
                  className="card"
                  style={{ cursor: 'pointer', borderLeft: `3px solid ${s.color}` }}
                  onClick={() => navigate(`/area/${a.id}/sub/${s.id}`)}
                >
                  <div className="card-pad">
                    <div className="row between items-center">
                      <span className="fw-6" style={{ fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                        {s.name}
                      </span>
                      <SubAreaMenu subareaId={s.id} subareaName={s.name} />
                    </div>
                    <div className="text-2 f-xs mt-4">{subProjs.length} proyectos · {subOpen} tareas abiertas</div>
                    {s.description && (
                      <div className="text-3 f-xs mt-8" style={{ lineHeight: 1.4 }}>{s.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {subareas.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '32px 18px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Esta área no tiene sub-áreas todavía. Hacé clic en "Nueva sub-área" para crear una.
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Mode: SUBAREA (list of projects) ─────────────────────
  return (
    <>
      <PageHead
        title={sa?.name ?? ''}
        subtitle={`${a.name} · ${projects.length} proyectos · ${open} tareas abiertas`}
        right={
          <div className="row gap-8">
            <button className="btn btn-ghost btn-md" onClick={() => navigate(`/area/${a.id}`)}>← <span className="hide-mob">{a.name}</span></button>
            <button className="btn btn-secondary btn-md hide-mob"><UserPlus size={14} /> Invitar</button>
            <button className="btn btn-primary btn-md" onClick={() => openNewProject(a.id, sa?.id)}><Plus size={14} /> <span className="hide-mob">Nuevo proyecto</span></button>
          </div>
        }
      />
      <div className="page-body">
        <div className="grid mb-24" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
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
            <div className="val">{new Set(filteredTasks.map(t => t.assignee).filter(Boolean)).size}</div>
          </div>
        </div>

        <div className="section-title">Proyectos</div>
        <div className="grid mb-24" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {projects.map(p => (
            <div
              key={p.id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/proyecto/${p.id}`)}
            >
              <div className="card-pad">
                <div className="row between items-center">
                  <span className="fw-6" style={{ fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{p.name}</span>
                  <span className="micro mono" style={{ flexShrink: 0 }}>{p.progress}%</span>
                  <ProjectMenu projectId={p.id} projectName={p.name} onEdit={() => openEditProject(p.id)} />
                </div>
                <div className="text-2 f-xs mt-4">Entrega {fmtDate(p.due)} · {p.count} tareas</div>
                <div className="progress mt-16">
                  <div style={{ width: p.progress + '%', background: sa?.color ?? a.color }}></div>
                </div>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '24px 18px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              Sin proyectos en esta sub-área. Hacé clic en "Nuevo proyecto" para crear uno.
            </div>
          )}
        </div>

        <div className="section-title">Tareas críticas</div>
        <div className="card area-tasks-card" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: 460 }}>
            <tbody>
              {critical.map(t => (
                <tr key={t.id} onClick={() => openTask(t.id)}>
                  <td style={{ width: 30 }}><span className="check"></span></td>
                  <td>{t.title}</td>
                  <td style={{ width: 130 }}>
                    <div className="row gap-8 items-center">
                      <Avatar name={resolveMember(t.assignee)?.name ?? t.assignee} size={20} />
                      <span className="f-xs text-2">{resolveMember(t.assignee)?.short ?? t.assignee}</span>
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
