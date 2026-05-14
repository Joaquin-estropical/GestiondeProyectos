import { useState } from 'react';
import { Plus, UserPlus, MoreHorizontal, Pencil, Trash2, X, Check, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { useTemplates, useTemplateTasks, useMembers } from '@/hooks/useSupabase';
import { deleteArea, deleteTemplate, createTemplate, createTemplateTask, deleteTemplateTask } from '@/lib/db';
import { useAppStore } from '@/stores/app';
import { Avatar } from '@/components/shared/Avatar';
import { PageHead } from '@/components/shared/PageHead';
import type { AreaType, TemplateTask } from '@/types';

const TABS = [
  { id: 'areas',     label: 'Áreas'      },
  { id: 'templates', label: 'Plantillas' },
  { id: 'members',   label: 'Miembros'   },
  { id: 'billing',   label: 'Facturación'},
];

const AREA_TYPE_LABELS: Record<AreaType, string> = {
  sucursal: 'Sucursal', outlet: 'Outlet', edificio: 'Edificio', bodega: 'Bodega', general: 'General', otros: 'Otros',
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
            <div key={a.id} style={{ padding: '14px 18px', borderBottom: i < areas.length - 1 ? '1px solid var(--border)' : '', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: a.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="fw-5" style={{ fontSize: 14 }}>{a.name}</div>
                <div className="f-xs text-2 mt-2">
                  {AREA_TYPE_LABELS[a.type]} · {aProjects.length} proyectos · {aTasks.filter(t => t.status !== 'done').length} tareas abiertas
                </div>
              </div>
              <div className="row gap-6 items-center">
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openNewArea(a.id)}><Pencil size={13} /></button>
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

// ════════════════════════════════════════════════════════════
// TEMPLATE EDITOR — full-page overlay (simple: fases + tareas)
// ════════════════════════════════════════════════════════════

function groupByPhase(tasks: TemplateTask[]): { phase: string | null; tasks: TemplateTask[] }[] {
  const map = new Map<string, TemplateTask[]>();
  const order: (string | null)[] = [];
  for (const t of tasks) {
    const key = t.phase_name ?? '__none__';
    if (!map.has(key)) { map.set(key, []); order.push(t.phase_name ?? null); }
    map.get(key)!.push(t);
  }
  return order.map(ph => ({ phase: ph, tasks: map.get(ph ?? '__none__')! }));
}

function PhaseSection({
  phase, tasks, onDeleteTask, templateId, totalTasks, onTaskAdded,
}: {
  phase: string | null;
  tasks: TemplateTask[];
  onDeleteTask: (id: string) => void;
  templateId: string;
  totalTasks: number;
  onTaskAdded: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [newTitle,  setNewTitle]  = useState('');

  const handleAddTask = async () => {
    const t = newTitle.trim();
    if (!t) return;
    setAdding(true);
    await createTemplateTask(templateId, t, 'med', totalTasks, totalTasks, { phaseName: phase, durationDays: 1 });
    setNewTitle('');
    onTaskAdded();
    setAdding(false);
  };

  const phaseColor = phase ? 'var(--teal)' : 'var(--text-3)';

  return (
    <div style={{ marginBottom: 12, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: phase ? 'rgba(20,184,166,.05)' : 'transparent', borderBottom: collapsed ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
        onClick={() => setCollapsed(v => !v)}
      >
        {collapsed ? <ChevronRight size={13} color="var(--text-3)" /> : <ChevronDown size={13} color="var(--text-3)" />}
        <Layers size={13} color={phaseColor} />
        <span style={{ fontWeight: 600, fontSize: 13, color: phase ? 'var(--text-1)' : 'var(--text-3)', flex: 1 }}>
          {phase ?? 'Sin fase'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{tasks.length} tarea{tasks.length !== 1 ? 's' : ''}</span>
      </div>

      {!collapsed && (
        <div>
          {tasks.map((tt, i) => (
            <div key={tt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 13, flex: 1, color: 'var(--text-1)' }}>{tt.title}</span>
              <button className="btn btn-ghost btn-sm btn-icon" style={{ width: 22, height: 22 }} onClick={() => onDeleteTask(tt.id)}>
                <X size={11} color="var(--text-3)" />
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, padding: '8px 14px', borderTop: tasks.length > 0 ? '1px solid var(--border)' : 'none', background: 'var(--bg)' }}>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              placeholder={`Nueva tarea${phase ? ` en "${phase}"` : ''}…`}
              style={{ flex: 1, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', height: 30, fontSize: 13, color: 'var(--text-1)', outline: 'none' }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddTask} disabled={adding || !newTitle.trim()} style={{ height: 30 }}>
              <Plus size={13} /> Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Full-page template editor
function TemplateEditor({ templateId, templateName, areaType, onClose }: {
  templateId: string; templateName: string; areaType: AreaType; onClose: () => void;
}) {
  const { data: ttasks, reload } = useTemplateTasks(templateId);

  const [newPhaseName,  setNewPhaseName]  = useState('');
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [localPhases,   setLocalPhases]   = useState<string[]>([]);

  const handleAddPhase = () => {
    const name = newPhaseName.trim();
    if (!name) return;
    const existing = groupByPhase(ttasks).map(g => g.phase).filter(Boolean);
    if (!existing.includes(name) && !localPhases.includes(name)) {
      setLocalPhases(prev => [...prev, name]);
    }
    setNewPhaseName(''); setShowPhaseForm(false);
  };

  const phasesWithTasks = new Set(ttasks.map(t => t.phase_name).filter(Boolean));
  const filteredLocalPhases = localPhases.filter(p => !phasesWithTasks.has(p));

  const handleDeleteTask = async (id: string) => { await deleteTemplateTask(id); reload(); };
  const groups = groupByPhase(ttasks);
  const hasContent = groups.length > 0 || filteredLocalPhases.length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', height: 52, borderBottom: '1px solid var(--border)', background: 'var(--surface-1)', flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>{templateName}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{AREA_TYPE_LABELS[areaType]}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowPhaseForm(v => !v)}>
            <Plus size={13} /> Nueva fase
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            <Check size={13} /> Listo
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
        {/* New phase inline form */}
        {showPhaseForm && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface-1)', border: '1px solid var(--teal)', borderRadius: 8, padding: '12px 14px' }}>
            <Layers size={14} color="var(--teal)" />
            <input
              autoFocus value={newPhaseName}
              onChange={e => setNewPhaseName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddPhase(); if (e.key === 'Escape') { setShowPhaseForm(false); setNewPhaseName(''); } }}
              placeholder='Nombre de la fase (ej: "Área Legal", "Diseño", "RRHH")…'
              style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddPhase} disabled={!newPhaseName.trim()}>Crear</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowPhaseForm(false); setNewPhaseName(''); }}>Cancelar</button>
          </div>
        )}

        {/* Empty state */}
        {!hasContent && !showPhaseForm && (
          <div style={{ textAlign: 'center', padding: '48px 0 24px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Plantilla vacía</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>Creá una fase para organizar las tareas por área o departamento.</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPhaseForm(true)}>
              <Plus size={13} /> Nueva fase
            </button>
          </div>
        )}

        {/* Phase sections (DB) */}
        {groups.map(({ phase, tasks }) => (
          <PhaseSection key={phase ?? '__none__'} phase={phase} tasks={tasks}
            onDeleteTask={handleDeleteTask} templateId={templateId}
            totalTasks={ttasks.length} onTaskAdded={reload} />
        ))}

        {/* Local phases (not yet persisted) */}
        {filteredLocalPhases.map(p => (
          <PhaseSection key={`local-${p}`} phase={p} tasks={[]}
            onDeleteTask={handleDeleteTask} templateId={templateId}
            totalTasks={ttasks.length} onTaskAdded={reload} />
        ))}
      </div>
    </div>
  );
}

// ── Template card (in list) ────────────────────────────────
function TemplateCard({ tpl, onDelete, onEdit }: {
  tpl: { id: string; name: string; area_type: AreaType };
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { data: ttasks } = useTemplateTasks(tpl.id);
  const [confirmDel, setConfirmDel] = useState(false);
  const phases = groupByPhase(ttasks).filter(g => g.phase !== null);
  const maxDay = ttasks.length ? Math.max(...ttasks.map(t => t.day_offset + t.duration_days)) : 0;

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: ttasks.length > 0 ? '1px solid var(--border)' : 'none' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, display: 'flex', gap: 10 }}>
            <span>{ttasks.length} tarea{ttasks.length !== 1 ? 's' : ''}</span>
            {phases.length > 0 && <span>{phases.length} fase{phases.length !== 1 ? 's' : ''}</span>}
            {maxDay > 0 && <span>{maxDay}d de duración</span>}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          <Pencil size={12} /> Editar
        </button>
        {confirmDel ? (
          <div className="row gap-6">
            <button className="btn btn-destructive btn-sm" onClick={onDelete}>Eliminar</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(false)}>Cancelar</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setConfirmDel(true)}>
            <Trash2 size={13} color="var(--red)" />
          </button>
        )}
      </div>

      {/* Phase + task preview */}
      {ttasks.length > 0 && (
        <div style={{ padding: '10px 16px 14px' }}>
          {groupByPhase(ttasks).map(({ phase, tasks }) => (
            <div key={phase ?? '__none__'} style={{ marginBottom: 8 }}>
              {phase && (
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <Layers size={10} />{phase}
                </div>
              )}
              {tasks.slice(0, 3).map(tt => (
                <div key={tt.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 0', paddingLeft: phase ? 12 : 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-3)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tt.title}</span>
                </div>
              ))}
              {tasks.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-3)', paddingLeft: phase ? 12 : 0 }}>+{tasks.length - 3} más</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Plantillas ──────────────────────────────────────
function TemplatesTab() {
  const { data: templates, reload } = useTemplates();
  const [newName,   setNewName]   = useState('');
  const [newType,   setNewType]   = useState<AreaType>('sucursal');
  const [creating,  setCreating]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');

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

  const editingTemplate = templates.find(t => t.id === editingId);

  return (
    <>
      {/* Full-page editor overlay */}
      {editingId && editingTemplate && (
        <TemplateEditor
          templateId={editingId}
          templateName={editingTemplate.name}
          areaType={editingTemplate.area_type}
          onClose={() => { setEditingId(null); reload(); }}
        />
      )}

      <div className="row between items-center mb-20">
        <div>
          <div className="fw-6">Plantillas de procesos</div>
          <div className="f-xs text-2 mt-4">
            Modelá tus procesos con fases, hitos y tareas con duración. Se aplican al crear un proyecto nuevo.
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '18px 20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Nueva plantilla</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 2 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => { setNewName(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder='Nombre del proceso (ej: "Apertura de sucursal")'
                style={{ width: '100%', background: 'var(--surface-2)', border: `1px solid ${nameError ? 'var(--red)' : 'var(--border)'}`, borderRadius: 6, padding: '0 12px', height: 36, fontSize: 13, color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' }}
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
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            Después de crear podrás agregar fases (Área Legal, Diseño, etc.) y las tareas de cada una.
          </div>
        </div>
      )}

      {/* Templates by type */}
      {types.map(type => {
        const list = templates.filter(t => t.area_type === type);
        if (list.length === 0) return null;
        return (
          <div key={type} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="micro">{AREA_TYPE_LABELS[type]}</span>
              <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
              <span className="micro" style={{ color: 'var(--text-3)' }}>{list.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {list.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  tpl={tpl}
                  onDelete={async () => { await deleteTemplate(tpl.id); reload(); }}
                  onEdit={() => setEditingId(tpl.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {templates.length === 0 && !showForm && (
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="ill"><Layers size={22} /></div>
          <p className="t">Sin plantillas de procesos</p>
          <p className="d">Modelá tus procesos empresariales con fases, tareas y duraciones para automatizar la creación de proyectos.</p>
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
  const { data: members = [] } = useMembers()
  return (
    <>
      <div className="row between items-center mb-16">
        <div>
          <div className="fw-6">Miembros del workspace</div>
          <div className="f-xs text-2 mt-4">Responsables disponibles para asignar tareas.</div>
        </div>
        <button className="btn btn-primary btn-sm"><UserPlus size={14} /> Invitar</button>
      </div>
      <div className="card">
        {members.map((m, i) => (
          <div key={m.id} style={{ padding: '12px 18px', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : '', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={m.name} size={32} />
            <div style={{ flex: 1 }}>
              <div className="fw-5" style={{ fontSize: 13 }}>{m.name}</div>
              <div className="f-xs text-2">{m.role}</div>
            </div>
            <span className="pill" style={{ fontSize: 11 }}>{m.role}</span>
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
