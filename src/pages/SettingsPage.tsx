import { useState } from 'react';
import { Plus, MoreHorizontal, UserPlus, Pencil, Trash2, ChevronDown, ChevronRight, Flag } from 'lucide-react';
import { TEAM } from '@/lib/mock-data';
import { useTemplates, useTemplateTasks } from '@/hooks/useSupabase';
import { deleteArea, deleteTemplate, createTemplate, createTemplateTask, deleteTemplateTask } from '@/lib/db';
import { useAppStore } from '@/stores/app';
import { Avatar } from '@/components/shared/Avatar';
import { PageHead } from '@/components/shared/PageHead';
import type { AreaType, TaskPriority } from '@/types';

const TABS = [
  { id: 'areas',     label: 'Áreas'         },
  { id: 'templates', label: 'Plantillas'     },
  { id: 'members',   label: 'Miembros'       },
  { id: 'billing',   label: 'Facturación'    },
];

const AREA_TYPE_LABELS: Record<AreaType, string> = {
  sucursal: 'Sucursal', outlet: 'Outlet', edificio: 'Edificio', bodega: 'Bodega', general: 'General',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urg: 'var(--red)', alta: 'var(--amber)', med: 'var(--blue)', baja: 'var(--text-3)',
};

// ── Tab: Áreas ───────────────────────────────────────────
function AreasTab() {
  const { areas, projects, tasks, openNewArea, refreshAll } = useAppStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deleteArea(id);
    await refreshAll();
    setConfirmDelete(null);
  };

  return (
    <>
      <div className="row between items-center mb-16">
        <div>
          <div className="fw-6">Áreas del workspace</div>
          <div className="f-xs text-2 mt-4">Cada área tiene un tipo, color único y agrupa sus proyectos.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openNewArea()}>
          <Plus size={14} /> Nueva área
        </button>
      </div>
      <div className="card">
        {areas.map((a, i) => {
          const aProjects = projects.filter(p => p.area === a.id);
          const aTasks    = tasks.filter(t => t.area === a.id);
          return (
            <div
              key={a.id}
              style={{ padding: '14px 18px', borderBottom: i < areas.length - 1 ? '1px solid var(--border)' : '', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 999, background: a.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="fw-5" style={{ fontSize: 14 }}>{a.name}</div>
                <div className="f-xs text-2 mt-2">
                  {AREA_TYPE_LABELS[a.type]} · {aProjects.length} proyectos · {aTasks.filter(t => t.status !== 'done').length} tareas abiertas
                </div>
              </div>
              <div className="row gap-6 items-center">
                <span className="avatar-stack" style={{ display: 'inline-flex' }}>
                  {TEAM.slice(0, 3).map(m => <Avatar key={m.id} name={m.name} size={22} style={{ border: '1.5px solid var(--bg)' }} />)}
                </span>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openNewArea(a.id)}>
                  <Pencil size={13} />
                </button>
                {confirmDelete === a.id ? (
                  <div className="row gap-6">
                    <button className="btn btn-destructive btn-sm" onClick={() => handleDelete(a.id)}>Confirmar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setConfirmDelete(a.id)} title="Eliminar área">
                    <Trash2 size={13} color="var(--red)" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {areas.length === 0 && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            No hay áreas creadas. Hacé clic en "Nueva área" para empezar.
          </div>
        )}
      </div>
    </>
  );
}

// ── Tab: Plantillas ──────────────────────────────────────
function TemplateRow({ templateId, onDeleted }: { templateId: string; onDeleted: () => void }) {
  const { data: ttasks, reload } = useTemplateTasks(templateId);
  const [expanded,  setExpanded]  = useState(false);
  const [newTitle,  setNewTitle]  = useState('');
  const [newPrio,   setNewPrio]   = useState<TaskPriority>('med');
  const [adding,    setAdding]    = useState(false);

  const handleAddTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    await createTemplateTask(templateId, newTitle.trim(), newPrio, 0, ttasks.length);
    setNewTitle(''); reload();
    setAdding(false);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTemplateTask(id);
    reload();
  };

  return (
    <div>
      <div
        className="row gap-10 items-center"
        style={{ cursor: 'pointer', padding: '4px 0' }}
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? <ChevronDown size={13} color="var(--text-3)" /> : <ChevronRight size={13} color="var(--text-3)" />}
        <span className="f-xs text-2 mono">{ttasks.length} tareas</span>
        <button
          className="btn btn-ghost btn-sm btn-icon"
          style={{ marginLeft: 'auto' }}
          onClick={e => { e.stopPropagation(); onDeleted(); }}
          title="Eliminar plantilla"
        >
          <Trash2 size={12} color="var(--red)" />
        </button>
      </div>

      {expanded && (
        <div style={{ paddingLeft: 20, marginTop: 4 }}>
          {ttasks.map(tt => (
            <div key={tt.id} className="row gap-8 items-center" style={{ padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <Flag size={11} color={PRIORITY_COLORS[tt.priority]} />
              <span style={{ flex: 1, fontSize: 12.5 }}>{tt.title}</span>
              <span className="mono f-xs text-3">+{tt.day_offset}d</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeleteTask(tt.id)}>
                <Trash2 size={11} color="var(--text-3)" />
              </button>
            </div>
          ))}
          <div className="row gap-8 items-center mt-8">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Nueva tarea en plantilla..."
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: 'var(--text-1)', outline: 'none' }}
            />
            <select
              value={newPrio}
              onChange={e => setNewPrio(e.target.value as TaskPriority)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', fontSize: 11, color: 'var(--text-1)', cursor: 'pointer' }}
            >
              <option value="urg">Urgente</option>
              <option value="alta">Alta</option>
              <option value="med">Media</option>
              <option value="baja">Baja</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleAddTask} disabled={adding || !newTitle.trim()}>
              <Plus size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatesTab() {
  const { data: templates, reload } = useTemplates();
  const [newName,     setNewName]     = useState('');
  const [newType,     setNewType]     = useState<AreaType>('sucursal');
  const [creating,    setCreating]    = useState(false);
  const [showNew,     setShowNew]     = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await createTemplate({ name: newName.trim(), area_type: newType });
    setNewName(''); setShowNew(false); reload();
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    reload();
  };

  const byType = (type: AreaType) => templates.filter(t => t.area_type === type);
  const types: AreaType[] = ['sucursal', 'outlet', 'edificio', 'bodega', 'general'];

  return (
    <>
      <div className="row between items-center mb-16">
        <div>
          <div className="fw-6">Plantillas de tareas</div>
          <div className="f-xs text-2 mt-4">Las plantillas se aplican al crear un nuevo proyecto según el tipo de área.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowNew(v => !v)}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {showNew && (
        <div className="card card-pad mb-16">
          <div className="fw-5 mb-12">Nueva plantilla</div>
          <div className="row gap-12">
            <div className="input" style={{ flex: 2 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre de la plantilla..."
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="input" style={{ padding: 0, flex: 1 }}>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as AreaType)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '0 12px', height: 36, color: 'var(--text-1)', fontSize: 13, cursor: 'pointer' }}
              >
                {types.map(t => <option key={t} value={t}>{AREA_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-md" onClick={handleCreate} disabled={creating || !newName.trim()}>
              Crear
            </button>
            <button className="btn btn-ghost btn-md" onClick={() => setShowNew(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {types.map(type => {
        const list = byType(type);
        if (list.length === 0) return null;
        return (
          <div key={type} className="mb-20">
            <div className="micro mb-8">{AREA_TYPE_LABELS[type]}</div>
            <div className="card">
              {list.map((tpl, i) => (
                <div key={tpl.id} style={{ padding: '12px 18px', borderBottom: i < list.length - 1 ? '1px solid var(--border)' : '' }}>
                  <div className="fw-5" style={{ fontSize: 13, marginBottom: 6 }}>{tpl.name}</div>
                  <TemplateRow templateId={tpl.id} onDeleted={() => handleDelete(tpl.id)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {templates.length === 0 && !showNew && (
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="ill"><Plus size={22} /></div>
          <p className="t">Sin plantillas</p>
          <p className="d">Crea una plantilla para automatizar las tareas al crear nuevos proyectos.</p>
        </div>
      )}
    </>
  );
}

// ── Tab: Miembros ────────────────────────────────────────
function MembersTab() {
  return (
    <>
      <div className="row between items-center mb-16">
        <div>
          <div className="fw-6">Miembros del workspace</div>
          <div className="f-xs text-2 mt-4">Gestioná quién tiene acceso y qué puede hacer.</div>
        </div>
        <button className="btn btn-primary btn-sm"><UserPlus size={14} /> Invitar</button>
      </div>
      <div className="card">
        {TEAM.map((m, i) => (
          <div
            key={m.id}
            style={{ padding: '12px 18px', borderBottom: i < TEAM.length - 1 ? '1px solid var(--border)' : '', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <Avatar name={m.name} size={32} />
            <div style={{ flex: 1 }}>
              <div className="fw-5" style={{ fontSize: 13 }}>{m.name}</div>
              <div className="f-xs text-2">{m.role}</div>
            </div>
            <span className="pill" style={{ fontSize: 11 }}>
              {m.id === 'joa' ? 'Admin' : 'Miembro'}
            </span>
            <button className="btn btn-ghost btn-sm btn-icon"><MoreHorizontal size={13} /></button>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main ─────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState('areas');

  return (
    <>
      <PageHead title="Configuración" subtitle="Áreas, plantillas y miembros del workspace" />
      <div style={{ padding: '0 32px', borderBottom: '1px solid var(--border)' }}>
        <div className="tabs" style={{ background: 'transparent', border: 0, padding: 0 }}>
          {TABS.map(t => (
            <span
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              style={{ borderRadius: 0, borderBottom: tab === t.id ? '2px solid var(--teal)' : '2px solid transparent', padding: '10px 12px', background: 'transparent' }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 920 }}>
        {tab === 'areas'     && <AreasTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'members'   && <MembersTab />}
        {tab === 'billing'   && (
          <div className="empty" style={{ marginTop: 48 }}>
            <div className="ill">💳</div>
            <p className="t">Facturación</p>
            <p className="d">Gestión de plan y facturación próximamente.</p>
          </div>
        )}
      </div>
    </>
  );
}
