import { useState } from 'react';
import { Plus, UserPlus, MoreHorizontal, Pencil, Trash2, Flag, GripVertical, X, Check } from 'lucide-react';
import { TEAM } from '@/lib/mock-data';
import { useTemplates, useTemplateTasks } from '@/hooks/useSupabase';
import { deleteArea, deleteTemplate, createTemplate, createTemplateTask, deleteTemplateTask } from '@/lib/db';
import { useAppStore } from '@/stores/app';
import { Avatar } from '@/components/shared/Avatar';
import { PageHead } from '@/components/shared/PageHead';
import type { AreaType, TaskPriority } from '@/types';

const TABS = [
  { id: 'areas',     label: 'Áreas'      },
  { id: 'templates', label: 'Plantillas' },
  { id: 'members',   label: 'Miembros'   },
  { id: 'billing',   label: 'Facturación'},
];

const AREA_TYPE_LABELS: Record<AreaType, string> = {
  sucursal: 'Sucursal', outlet: 'Outlet', edificio: 'Edificio', bodega: 'Bodega', general: 'General',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urg: '#EF4444', alta: '#F59E0B', med: '#3B82F6', baja: '#5A5A60',
};
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urg: 'Urgente', alta: 'Alta', med: 'Media', baja: 'Baja',
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

// ── Template task row (editable) ─────────────────────────
function TemplateTaskRow({
  tt, onDelete,
}: { tt: { id: string; title: string; priority: TaskPriority; day_offset: number; sort_order: number }; onDelete: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 6 }}>
      <GripVertical size={13} color="var(--text-3)" style={{ flexShrink: 0, cursor: 'grab' }} />
      <Flag size={12} color={PRIORITY_COLORS[tt.priority]} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13 }}>{tt.title}</span>
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>
        Día +{tt.day_offset}
      </span>
      <button
        className="btn btn-ghost btn-sm btn-icon"
        style={{ width: 22, height: 22 }}
        onClick={() => onDelete(tt.id)}
        title="Eliminar tarea"
      >
        <X size={11} color="var(--text-3)" />
      </button>
    </div>
  );
}

// ── Template editor panel ─────────────────────────────────
function TemplateEditor({ templateId, templateName, onClose }: { templateId: string; templateName: string; onClose: () => void }) {
  const { data: ttasks, reload } = useTemplateTasks(templateId);

  const [title,    setTitle]    = useState('');
  const [priority, setPriority] = useState<TaskPriority>('med');
  const [dayOff,   setDayOff]   = useState(0);
  const [adding,   setAdding]   = useState(false);
  const [error,    setError]    = useState('');

  const handleAdd = async () => {
    const t = title.trim();
    if (!t) { setError('El título es obligatorio'); return; }
    setError('');
    setAdding(true);
    await createTemplateTask(templateId, t, priority, dayOff, ttasks.length);
    setTitle(''); setDayOff(0); reload();
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplateTask(id);
    reload();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 560, maxWidth: '94vw', maxHeight: '85vh', background: 'var(--surface-1)', border: '1px solid var(--border-hover)', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{templateName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{ttasks.length} tarea{ttasks.length !== 1 ? 's' : ''} en esta plantilla</div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={onClose}><X size={14} /></button>
        </div>

        {/* Task list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {ttasks.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
              Esta plantilla no tiene tareas aún. Agregá la primera abajo.
            </div>
          )}
          {ttasks.map(tt => (
            <TemplateTaskRow key={tt.id} tt={tt} onDelete={handleDelete} />
          ))}
        </div>

        {/* Add task form */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', borderRadius: '0 0 10px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-3)', marginBottom: 10 }}>Agregar tarea a la plantilla</div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Título de la tarea..."
              autoFocus
              style={{
                flex: 1, background: 'var(--surface-1)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 6, padding: '0 12px', height: 36, fontSize: 13, color: 'var(--text-1)', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Priority */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(['urg','alta','med','baja'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    height: 30, padding: '0 10px', borderRadius: 5, border: `1px solid ${priority === p ? PRIORITY_COLORS[p] + '80' : 'var(--border)'}`,
                    background: priority === p ? PRIORITY_COLORS[p] + '18' : 'var(--surface-1)',
                    color: priority === p ? PRIORITY_COLORS[p] : 'var(--text-3)',
                    fontSize: 11.5, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Flag size={10} color={PRIORITY_COLORS[p]} />
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Day offset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', height: 30 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Día</span>
              <input
                type="number"
                min={0}
                max={365}
                value={dayOff}
                onChange={e => setDayOff(Number(e.target.value))}
                style={{ width: 44, background: 'transparent', border: 0, outline: 0, fontSize: 13, color: 'var(--text-1)', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleAdd}
              disabled={adding || !title.trim()}
              style={{ height: 30 }}
            >
              {adding ? '...' : <><Check size={12} /> Agregar</>}
            </button>
          </div>
          {error && <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 6 }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Template card ─────────────────────────────────────────
function TemplateCard({
  tpl, onDelete, onEdit,
}: { tpl: { id: string; name: string; area_type: AreaType }; onDelete: () => void; onEdit: () => void }) {
  const { data: ttasks } = useTemplateTasks(tpl.id);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Card header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: ttasks.length > 0 ? '1px solid var(--border)' : 'none' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{ttasks.length} tarea{ttasks.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          <Pencil size={12} /> Editar tareas
        </button>
        {confirmDel ? (
          <div className="row gap-6">
            <button className="btn btn-destructive btn-sm" onClick={onDelete}>Eliminar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(false)}>Cancelar</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setConfirmDel(true)} title="Eliminar plantilla">
            <Trash2 size={13} color="var(--red)" />
          </button>
        )}
      </div>

      {/* Task preview (up to 4) */}
      {ttasks.length > 0 && (
        <div style={{ padding: '8px 16px 12px' }}>
          {ttasks.slice(0, 4).map((tt, i) => (
            <div key={tt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i < Math.min(ttasks.length, 4) - 1 ? '1px solid var(--border)' : 'none' }}>
              <Flag size={10} color={PRIORITY_COLORS[tt.priority]} />
              <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-2)' }}>{tt.title}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>+{tt.day_offset}d</span>
            </div>
          ))}
          {ttasks.length > 4 && (
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', paddingTop: 6 }}>+{ttasks.length - 4} más...</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: Plantillas ──────────────────────────────────────
function TemplatesTab() {
  const { data: templates, reload } = useTemplates();
  const [newName,    setNewName]    = useState('');
  const [newType,    setNewType]    = useState<AreaType>('sucursal');
  const [creating,   setCreating]   = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [nameError,  setNameError]  = useState('');

  const types: AreaType[] = ['sucursal', 'outlet', 'edificio', 'bodega', 'general'];

  const handleCreate = async () => {
    const n = newName.trim();
    if (!n) { setNameError('El nombre es obligatorio'); return; }
    setNameError('');
    setCreating(true);
    await createTemplate({ name: n, area_type: newType });
    setNewName(''); setShowForm(false); reload();
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    reload();
  };

  const editingTemplate = templates.find(t => t.id === editingId);

  const byType = (type: AreaType) => templates.filter(t => t.area_type === type);

  return (
    <>
      {/* Editor overlay */}
      {editingId && editingTemplate && (
        <TemplateEditor
          templateId={editingId}
          templateName={editingTemplate.name}
          onClose={() => setEditingId(null)}
        />
      )}

      <div className="row between items-center mb-20">
        <div>
          <div className="fw-6">Plantillas de tareas</div>
          <div className="f-xs text-2 mt-4">Definen las tareas que se crean automáticamente al iniciar un nuevo proyecto.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {/* New template form */}
      {showForm && (
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Nueva plantilla</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 2 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => { setNewName(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Nombre de la plantilla (ej: Apertura de sucursal)"
                style={{
                  width: '100%', background: 'var(--surface-2)', border: `1px solid ${nameError ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 6, padding: '0 12px', height: 36, fontSize: 13, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {nameError && <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 4 }}>{nameError}</div>}
            </div>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as AreaType)}
              style={{ height: 36, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text-1)', cursor: 'pointer', outline: 'none' }}
            >
              {types.map(t => <option key={t} value={t}>{AREA_TYPE_LABELS[t]}</option>)}
            </select>
            <button className="btn btn-primary btn-md" onClick={handleCreate} disabled={creating}>Crear</button>
            <button className="btn btn-ghost btn-md" onClick={() => { setShowForm(false); setNameError(''); }}>Cancelar</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>
            Después de crear la plantilla podrás agregar y ordenar sus tareas.
          </div>
        </div>
      )}

      {/* Templates by type */}
      {types.map(type => {
        const list = byType(type);
        if (list.length === 0) return null;
        return (
          <div key={type} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="micro">{AREA_TYPE_LABELS[type]}</span>
              <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
              <span className="micro" style={{ color: 'var(--text-3)' }}>{list.length} plantilla{list.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {list.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  tpl={tpl}
                  onDelete={() => handleDelete(tpl.id)}
                  onEdit={() => setEditingId(tpl.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {templates.length === 0 && !showForm && (
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="ill"><Plus size={22} /></div>
          <p className="t">Sin plantillas</p>
          <p className="d">Crea una plantilla para automatizar las tareas al crear nuevos proyectos según el tipo de área.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <Plus size={13} /> Crear primera plantilla
          </button>
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

      <div className="page-body" style={{ maxWidth: 960 }}>
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
