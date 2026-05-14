import { useState } from 'react';
import { Plus, UserPlus, MoreHorizontal, Pencil, Trash2, Flag, GripVertical, X, Check, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { useTemplates, useTemplateTasks, useMembers } from '@/hooks/useSupabase';
import { deleteArea, deleteTemplate, createTemplate, createTemplateTask, deleteTemplateTask } from '@/lib/db';
import { useAppStore } from '@/stores/app';
import { Avatar } from '@/components/shared/Avatar';
import { PageHead } from '@/components/shared/PageHead';
import type { AreaType, TaskPriority, TemplateTask } from '@/types';

const TABS = [
  { id: 'areas',     label: 'Áreas'      },
  { id: 'templates', label: 'Plantillas' },
  { id: 'members',   label: 'Miembros'   },
  { id: 'billing',   label: 'Facturación'},
];

const AREA_TYPE_LABELS: Record<AreaType, string> = {
  sucursal: 'Sucursal', outlet: 'Outlet', edificio: 'Edificio', bodega: 'Bodega', general: 'General', otros: 'Otros',
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
// TEMPLATE EDITOR — full-page overlay
// ════════════════════════════════════════════════════════════

// Groups tasks by phase_name; null phase = "Sin fase"
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

interface AddTaskState {
  title:    string;
  priority: TaskPriority;
  dayOff:   string;
  duration: string;
  error:    string;
}
const INIT_TASK: AddTaskState = { title: '', priority: 'med', dayOff: '', duration: '', error: '' };

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
  const [form,      setForm]      = useState<AddTaskState>(INIT_TASK);

  const setField = <K extends keyof AddTaskState>(k: K, v: AddTaskState[K]) =>
    setForm(f => ({ ...f, [k]: v, error: '' }));

  const handleAddTask = async () => {
    const t = form.title.trim();
    if (!t) { setForm(f => ({ ...f, error: 'El título es obligatorio' })); return; }
    setAdding(true);
    const dayOff = form.dayOff === '' ? totalTasks : Number(form.dayOff);
    const dur    = form.duration === '' ? 1 : Math.max(1, Number(form.duration));
    await createTemplateTask(templateId, t, form.priority, dayOff, totalTasks, {
      phaseName:    phase,
      durationDays: dur,
    });
    setForm(INIT_TASK);
    onTaskAdded();
    setAdding(false);
  };

  const phaseLabel = phase ?? 'Sin fase';
  const phaseColor = phase ? 'var(--teal)' : 'var(--text-3)';

  return (
    <div style={{ marginBottom: 24, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Phase header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: phase ? 'rgba(20,184,166,.05)' : 'transparent', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
        onClick={() => setCollapsed(v => !v)}
      >
        {collapsed ? <ChevronRight size={14} color="var(--text-3)" /> : <ChevronDown size={14} color="var(--text-3)" />}
        <Layers size={14} color={phaseColor} />
        <span style={{ fontWeight: 600, fontSize: 14, color: phase ? 'var(--text-1)' : 'var(--text-3)' }}>{phaseLabel}</span>
        <span style={{
          fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          color: phase ? 'var(--teal)' : 'var(--text-3)',
          background: phase ? 'rgba(20,184,166,.12)' : 'var(--surface-2)',
          padding: '1px 7px', borderRadius: 999,
        }}>
          {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
        </span>
        {tasks.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-3)' }}>
            {tasks.reduce((s, t) => s + t.duration_days, 0)} días totales
          </span>
        )}
      </div>

      {!collapsed && (
        <div>
          {/* Task rows */}
          {tasks.length === 0 && (
            <div style={{ padding: '16px', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
              Sin tareas en esta fase. Agregá una abajo.
            </div>
          )}
          {tasks.map((tt, i) => (
            <div
              key={tt.id}
              style={{ display: 'grid', gridTemplateColumns: '24px 14px 1fr 80px 64px 60px 32px', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <GripVertical size={13} color="var(--border-hover)" style={{ cursor: 'grab' }} />
              <Flag size={12} color={PRIORITY_COLORS[tt.priority]} />
              <span style={{ fontSize: 13, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tt.title}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>Día +{tt.day_offset}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>{tt.duration_days}d</span>
              <span style={{ fontSize: 11, color: PRIORITY_COLORS[tt.priority], background: PRIORITY_COLORS[tt.priority] + '18', padding: '2px 6px', borderRadius: 4, textAlign: 'center' }}>
                {PRIORITY_LABELS[tt.priority]}
              </span>
              <button className="btn btn-ghost btn-sm btn-icon" style={{ width: 22, height: 22 }} onClick={() => onDeleteTask(tt.id)}>
                <X size={11} color="var(--text-3)" />
              </button>
            </div>
          ))}

          {/* Add task form inside this phase */}
          <div style={{ padding: '10px 16px', background: 'var(--bg)', borderTop: tasks.length > 0 ? '1px solid var(--border)' : 'none' }}>
            {/* Row 1: title + add button */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                placeholder={`Agregar tarea en "${phaseLabel}"...`}
                style={{
                  flex: 1, background: 'var(--surface-1)',
                  border: `1px solid ${form.error ? 'var(--red)' : 'var(--border)'}`,
                  borderRadius: 6, padding: '0 12px', height: 32, fontSize: 13, color: 'var(--text-1)', outline: 'none',
                }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAddTask}
                disabled={adding || !form.title.trim()}
                style={{ height: 32, flexShrink: 0 }}
              >
                {adding ? '...' : <><Check size={12} /> Agregar tarea</>}
              </button>
            </div>
            {/* Row 2: priority + optional fields */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {(['urg','alta','med','baja'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => setField('priority', p)}
                  style={{
                    height: 24, padding: '0 8px', borderRadius: 5,
                    border: `1px solid ${form.priority === p ? PRIORITY_COLORS[p] + '80' : 'var(--border)'}`,
                    background: form.priority === p ? PRIORITY_COLORS[p] + '18' : 'transparent',
                    color: form.priority === p ? PRIORITY_COLORS[p] : 'var(--text-3)',
                    fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Flag size={9} color={PRIORITY_COLORS[p]} />{PRIORITY_LABELS[p]}
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 6px', height: 24 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Dur.</span>
                  <input
                    type="number" min={1} max={365} value={form.duration} placeholder="—"
                    onChange={e => setField('duration', e.target.value)}
                    style={{ width: 30, background: 'transparent', border: 0, outline: 0, fontSize: 11, color: 'var(--text-1)', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>d</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 5, padding: '0 6px', height: 24 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Día</span>
                  <input
                    type="number" min={0} max={365} value={form.dayOff} placeholder="auto"
                    onChange={e => setField('dayOff', e.target.value)}
                    style={{ width: 34, background: 'transparent', border: 0, outline: 0, fontSize: 11, color: 'var(--text-1)', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </div>
              </div>
            </div>
            {form.error && <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 5 }}>{form.error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// Mini Gantt preview inside the editor
function TemplateGanttPreview({ tasks }: { tasks: TemplateTask[] }) {
  if (tasks.length === 0) return null;
  const maxDay = Math.max(...tasks.map(t => t.day_offset + t.duration_days), 1);
  const phases = groupByPhase(tasks);
  const phaseColors = ['#14B8A6','#3B82F6','#6366F1','#F59E0B','#EC4899','#22C55E'];

  return (
    <div style={{ marginTop: 24, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Vista previa Gantt</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>{maxDay} días totales</span>
      </div>
      <div style={{ padding: '12px 16px', overflowX: 'auto' }}>
        {/* Day ruler */}
        <div style={{ display: 'flex', marginBottom: 8, paddingLeft: 160 }}>
          {Array.from({ length: Math.ceil(maxDay / 7) + 1 }).map((_, i) => (
            <div key={i} style={{ minWidth: 70, fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', borderLeft: '1px solid var(--border)', paddingLeft: 4 }}>
              Sem {i + 1}
            </div>
          ))}
        </div>
        {phases.map(({ phase, tasks: pTasks }, pi) => {
          const phaseColor = phaseColors[pi % phaseColors.length];
          return (
            <div key={phase ?? '__none__'}>
              {/* Phase label row */}
              {phase && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ width: 160, flexShrink: 0, fontSize: 11, fontWeight: 600, color: phaseColor, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Layers size={11} color={phaseColor} />{phase}
                  </div>
                  {/* Phase span bar */}
                  {pTasks.length > 0 && (() => {
                    const start = Math.min(...pTasks.map(t => t.day_offset));
                    const end   = Math.max(...pTasks.map(t => t.day_offset + t.duration_days));
                    return (
                      <div style={{ flex: 1, position: 'relative', height: 6 }}>
                        <div style={{ position: 'absolute', left: `${(start / maxDay) * 100}%`, width: `${((end - start) / maxDay) * 100}%`, height: '100%', background: phaseColor + '30', borderRadius: 2 }} />
                      </div>
                    );
                  })()}
                </div>
              )}
              {/* Task bars */}
              {pTasks.map(tt => (
                <div key={tt.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ width: 160, flexShrink: 0, fontSize: 11.5, color: 'var(--text-2)', paddingLeft: phase ? 16 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Flag size={9} color={PRIORITY_COLORS[tt.priority]} />{tt.title}
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 20 }}>
                    <div style={{
                      position: 'absolute',
                      left:  `${(tt.day_offset  / maxDay) * 100}%`,
                      width: `${(tt.duration_days / maxDay) * 100}%`,
                      minWidth: 4,
                      height: '100%',
                      background: (phase ? phaseColor : PRIORITY_COLORS[tt.priority]) + '50',
                      borderLeft: `3px solid ${phase ? phaseColor : PRIORITY_COLORS[tt.priority]}`,
                      borderRadius: 3,
                      display: 'flex', alignItems: 'center', paddingLeft: 4,
                      overflow: 'hidden',
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tt.duration_days}d
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Full-page template editor
function TemplateEditor({ templateId, templateName, areaType, onClose }: {
  templateId: string; templateName: string; areaType: AreaType; onClose: () => void;
}) {
  const { data: ttasks, reload } = useTemplateTasks(templateId);

  const [newPhaseName, setNewPhaseName] = useState('');
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  // Phases created locally but with no tasks yet (not persisted until a task is added)
  const [localPhases, setLocalPhases] = useState<string[]>([]);

  const handleAddPhase = () => {
    const name = newPhaseName.trim();
    if (!name) return;
    // Only add if not already in tasks or localPhases
    const existing = groupByPhase(ttasks).map(g => g.phase).filter(Boolean);
    if (!existing.includes(name) && !localPhases.includes(name)) {
      setLocalPhases(prev => [...prev, name]);
    }
    setNewPhaseName(''); setShowPhaseForm(false);
  };

  // Remove local phase once it has tasks in DB
  const phasesWithTasks = new Set(ttasks.map(t => t.phase_name).filter(Boolean));
  const filteredLocalPhases = localPhases.filter(p => !phasesWithTasks.has(p));

  const handleDeleteTask = async (id: string) => {
    await deleteTemplateTask(id);
    reload();
  };

  const groups = groupByPhase(ttasks);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px', height: 56, borderBottom: '1px solid var(--border)', background: 'var(--surface-1)', flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Cerrar">
          <X size={16} />
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{templateName}</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 10 }}>{AREA_TYPE_LABELS[areaType]}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPhaseForm(v => !v)}
          >
            <Layers size={13} /> + Fase / Hito
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            <Check size={13} /> Guardar y cerrar
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 0 }}>
        {/* Left: editor */}
        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
          {/* New phase form */}
          {showPhaseForm && (
            <div style={{ marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center', background: 'var(--surface-1)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '14px 16px' }}>
              <Layers size={14} color="var(--teal)" />
              <input
                autoFocus
                value={newPhaseName}
                onChange={e => setNewPhaseName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPhase()}
                placeholder='Nombre de la fase (ej: "Área Legal", "Diseño", "RRHH")...'
                style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}
              />
              <button className="btn btn-primary btn-sm" onClick={handleAddPhase} disabled={!newPhaseName.trim()}>
                Crear fase
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowPhaseForm(false); setNewPhaseName(''); }}>
                Cancelar
              </button>
            </div>
          )}

          {/* Empty state */}
          {groups.length === 0 && filteredLocalPhases.length === 0 && (
            <>
              <div style={{ textAlign: 'center', padding: '32px 0 16px', color: 'var(--text-3)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Plantilla vacía</div>
                <div style={{ fontSize: 13 }}>Creá una fase primero o agregá tareas sueltas abajo.</div>
              </div>
              <PhaseSection
                phase={null} tasks={[]} onDeleteTask={handleDeleteTask}
                templateId={templateId} totalTasks={0} onTaskAdded={reload}
              />
            </>
          )}

          {/* DB-backed phase sections */}
          {groups.map(({ phase, tasks }) => (
            <PhaseSection
              key={phase ?? '__none__'}
              phase={phase}
              tasks={tasks}
              onDeleteTask={handleDeleteTask}
              templateId={templateId}
              totalTasks={ttasks.length}
              onTaskAdded={reload}
            />
          ))}

          {/* Local-only phases (no tasks yet) */}
          {filteredLocalPhases.map(p => (
            <PhaseSection
              key={`local-${p}`}
              phase={p}
              tasks={[]}
              onDeleteTask={handleDeleteTask}
              templateId={templateId}
              totalTasks={ttasks.length}
              onTaskAdded={reload}
            />
          ))}

          {/* Always show "Sin fase" section if there are named phases */}
          {(groups.length > 0 || filteredLocalPhases.length > 0) && !groups.find(g => g.phase === null) && (
            <PhaseSection
              phase={null}
              tasks={[]}
              onDeleteTask={handleDeleteTask}
              templateId={templateId}
              totalTasks={ttasks.length}
              onTaskAdded={reload}
            />
          )}
        </div>

        {/* Right: Gantt preview */}
        <div style={{ width: 480, flexShrink: 0, borderLeft: '1px solid var(--border)', padding: '24px 20px', overflowY: 'auto', background: 'var(--bg)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)', marginBottom: 12 }}>
            Vista Gantt de la plantilla
          </div>
          {ttasks.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
              Agregá tareas para ver la previsualización del Gantt.
            </div>
          ) : (
            <TemplateGanttPreview tasks={ttasks} />
          )}

          {/* Stats */}
          {ttasks.length > 0 && (
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total tareas', val: ttasks.length },
                { label: 'Duración total', val: `${Math.max(...ttasks.map(t => t.day_offset + t.duration_days))} días` },
                { label: 'Fases / Áreas', val: groupByPhase(ttasks).filter(g => g.phase !== null).length },
                { label: 'Tareas sin fase', val: ttasks.filter(t => !t.phase_name).length },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-1)' }}>{s.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
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
                  <Flag size={9} color={PRIORITY_COLORS[tt.priority]} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tt.title}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{tt.duration_days}d</span>
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
