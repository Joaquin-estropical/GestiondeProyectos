import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ClipboardList, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Copy, BookOpen, FolderOpen, Layers, MoreHorizontal, X,
} from 'lucide-react'
import type { EventChecklist, ChecklistTemplate, TemplateKind } from '@/types'
import { TEMPLATE_KIND_LABELS } from '@/types'
import {
  fetchEventChecklists, fetchChecklistTemplates,
  createLinkedPair,
  duplicateChecklistTemplate,
} from '@/lib/planillas'
import { useAppStore } from '@/stores/app'

// ── helpers ───────────────────────────────────────────────────────────────────

const KIND_COLORS: Record<TemplateKind, string> = {
  event_delivery:  '#6366f1',
  branch_delivery: '#0d9488',
  local_return:    '#f59e0b',
  custom:          '#6b7280',
}
const KIND_ICONS: Record<TemplateKind, React.ReactNode> = {
  event_delivery:  <Layers size={15} />,
  branch_delivery: <FolderOpen size={15} />,
  local_return:    <BookOpen size={15} />,
  custom:          <MoreHorizontal size={15} />,
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed')   return <CheckCircle2 size={13} style={{ color: 'var(--teal)', flexShrink: 0 }} />
  if (status === 'in_progress') return <Clock size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
  return <AlertCircle size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
}
function statusLabel(s: string) {
  if (s === 'completed')   return 'Cerrada'
  if (s === 'in_progress') return 'En curso'
  return 'Pendiente'
}
function clTypeLabel(type: string) {
  return type === 'reception' ? 'Recepción' : 'Entrega'
}

// ── assign modal ──────────────────────────────────────────────────────────────

interface AssignModalProps {
  template: ChecklistTemplate
  onClose: () => void
  onCreated: () => void
}

function AssignModal({ template, onClose, onCreated }: AssignModalProps) {
  const { projects, areas } = useAppStore()
  const navigate = useNavigate()

  const [targetType, setTargetType] = useState<'project' | 'area'>('project')
  const [projectId,  setProjectId]  = useState('')
  const [areaId,     setAreaId]     = useState('')
  // firstType = qué acta ocurre primero en el flujo del proyecto
  const [firstType,  setFirstType]  = useState<'reception' | 'delivery'>('reception')
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  async function handleCreate() {
    const eventId = targetType === 'project' ? projectId : areaId
    if (!eventId) { setError('Seleccioná un destino'); return }
    setCreating(true); setError(null)
    try {
      const { first } = await createLinkedPair(eventId, template.id, firstType)
      onCreated()
      navigate(`/planillas/${first.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally { setCreating(false) }
  }

  const secondType = firstType === 'reception' ? 'entrega' : 'recepción'

  return (
    <>
      <div className="modal-bd" onClick={onClose} />
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>Usar plantilla: {template.name}</span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Destino */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
              Asignar a
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button className={`btn btn-sm ${targetType === 'project' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTargetType('project')}>Proyecto</button>
              <button className={`btn btn-sm ${targetType === 'area' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTargetType('area')}>Área</button>
            </div>
            {targetType === 'project' ? (
              <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
                <option value="">Seleccionar proyecto…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <select className="input" value={areaId} onChange={e => setAreaId(e.target.value)}>
                <option value="">Seleccionar área…</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
          </div>

          {/* Flujo del proyecto */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
              ¿Cómo empieza el flujo de este proyecto?
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 10px' }}>
              Siempre se crean las dos actas (recepción + entrega). Elegí cuál ocurre primero.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Opción: primero recepción */}
              <button
                onClick={() => setFirstType('reception')}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${firstType === 'reception' ? 'var(--teal)' : 'var(--border)'}`,
                  background: firstType === 'reception' ? 'var(--teal-bg)' : 'var(--surface)',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>📥</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: firstType === 'reception' ? 'var(--teal)' : 'var(--text-1)' }}>
                    Primero recibimos el local / espacio
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                    Ej: outlets, sucursales — recepcionamos el espacio y después lo devolvemos al final.
                  </div>
                </div>
              </button>

              {/* Opción: primero entrega */}
              <button
                onClick={() => setFirstType('delivery')}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${firstType === 'delivery' ? '#6366f1' : 'var(--border)'}`,
                  background: firstType === 'delivery' ? '#eef2ff' : 'var(--surface)',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>📤</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: firstType === 'delivery' ? '#6366f1' : 'var(--text-1)' }}>
                    Primero entregamos el local / espacio
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                    Ej: edificio — entregamos al arrendatario y después lo recibimos de vuelta.
                  </div>
                </div>
              </button>
            </div>

            {/* Resumen del par */}
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontWeight: 600 }}>Se crearán:</span>
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: firstType === 'reception' ? 'var(--teal-bg)' : '#eef2ff',
                color: firstType === 'reception' ? 'var(--teal)' : '#6366f1',
              }}>
                {firstType === 'reception' ? 'Recepción' : 'Entrega'}
              </span>
              <span style={{ color: 'var(--text-3)' }}>→ luego →</span>
              <span style={{
                padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-2)',
              }}>
                {secondType.charAt(0).toUpperCase() + secondType.slice(1)}
              </span>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-secondary btn-md" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary btn-md"
            disabled={creating || (targetType === 'project' ? !projectId : !areaId)}
            onClick={handleCreate}
          >
            {creating ? 'Creando…' : 'Crear par de actas'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

interface AssignedGroup {
  id: string
  name: string
  kind: 'project' | 'area'
  checklists: EventChecklist[]
}

export default function PlanillasPage() {
  const navigate          = useNavigate()
  const { projects, areas } = useAppStore()

  const [templates, setTemplates]         = useState<ChecklistTemplate[]>([])
  const [assignedGroups, setAssignedGroups] = useState<AssignedGroup[]>([])
  const [loading, setLoading]             = useState(true)

  const [assigningTemplate, setAssigningTemplate] = useState<ChecklistTemplate | null>(null)

  const allIds = [...projects.map(p => p.id), ...areas.map(a => a.id)].join(',')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const tpls = await fetchChecklistTemplates()
      setTemplates(tpls)

      // fetch checklists for all projects and areas
      const allEntities: { id: string; name: string; kind: 'project' | 'area' }[] = [
        ...projects.map(p => ({ id: p.id, name: p.name, kind: 'project' as const })),
        ...areas.map(a => ({ id: a.id, name: a.name, kind: 'area' as const })),
      ]
      if (allEntities.length === 0) { setAssignedGroups([]); return }

      const results = await Promise.all(allEntities.map(e => fetchEventChecklists(e.id)))
      const groups: AssignedGroup[] = allEntities
        .map((e, i) => ({ ...e, checklists: results[i] }))
        .filter(g => g.checklists.length > 0)
      setAssignedGroups(groups)
    } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIds])

  useEffect(() => { load() }, [load])

  async function handleDuplicate(tpl: ChecklistTemplate) {
    await duplicateChecklistTemplate(tpl.id)
    load()
  }

  const kindGroups = Object.entries(TEMPLATE_KIND_LABELS) as [TemplateKind, string][]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Planillas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>
            Seleccioná una plantilla para usarla, o revisá las planillas activas por proyecto y área.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/planillas/plantillas')}>
            <Layers size={14} /> Gestionar plantillas
          </button>
        </div>
      </div>

      {/* ── Biblioteca de plantillas ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 16px' }}>
          Plantillas prediseñadas
        </h2>

        {loading ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Cargando…</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
            <ClipboardList size={32} style={{ color: 'var(--text-3)', marginBottom: 10 }} />
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>No hay plantillas todavía.</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 14px' }}>Creá una desde "Gestionar plantillas".</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/planillas/plantillas')}>
              <Plus size={13} /> Crear plantilla
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {kindGroups.map(([kind, kindLabel]) => {
              const kindTpls = templates.filter(t => t.kind === kind)
              if (kindTpls.length === 0) return null
              return (
                <div key={kind}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ color: KIND_COLORS[kind] }}>{KIND_ICONS[kind]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{kindLabel}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {kindTpls.map(tpl => (
                      <div
                        key={tpl.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderLeft: `3px solid ${KIND_COLORS[tpl.kind]}`,
                          borderRadius: 8, padding: '12px 16px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
                          {tpl.description && (
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{tpl.description}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Duplicar para editar"
                            onClick={() => handleDuplicate(tpl)}
                            style={{ gap: 5, fontSize: 12 }}
                          >
                            <Copy size={12} /> Usar y modificar
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setAssigningTemplate(tpl)}
                            style={{ gap: 5, fontSize: 12 }}
                          >
                            <Plus size={12} /> Usar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Planillas asignadas por proyecto / área ── */}
      <section>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 16px' }}>
          Planillas activas
        </h2>

        {!loading && assignedGroups.length === 0 ? (
          <div style={{ padding: '24px 20px', border: '1px dashed var(--border)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              No hay planillas asignadas. Usá una plantilla arriba para crear la primera.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {assignedGroups.map(group => (
              <div
                key={group.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}
              >
                {/* group header */}
                <div style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface-2)',
                }}>
                  <FolderOpen size={13} style={{ color: 'var(--text-3)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{group.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                    background: group.kind === 'project' ? 'var(--teal-bg)' : 'var(--surface)',
                    color: group.kind === 'project' ? 'var(--teal)' : 'var(--text-3)',
                    border: '1px solid var(--border)',
                    textTransform: 'uppercase', letterSpacing: '.04em',
                  }}>
                    {group.kind === 'project' ? 'Proyecto' : 'Área'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {group.checklists.length} planilla{group.checklists.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* checklists — agrupar en pares por template_id + fecha cercana */}
                {(() => {
                  // Agrupar: pares que comparten template_id y fueron creados con <10s de diferencia
                  const cls  = [...group.checklists].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  const used = new Set<string>()
                  const pairs: Array<{ primary: EventChecklist; sibling?: EventChecklist }> = []

                  for (const cl of cls) {
                    if (used.has(cl.id)) continue
                    const partner = cls.find(other =>
                      !used.has(other.id) &&
                      other.id !== cl.id &&
                      other.template_id === cl.template_id &&
                      cl.template_id !== null &&
                      Math.abs(new Date(other.created_at).getTime() - new Date(cl.created_at).getTime()) < 30_000
                    )
                    used.add(cl.id)
                    if (partner) used.add(partner.id)
                    pairs.push({ primary: cl, sibling: partner })
                  }

                  return pairs.map(({ primary, sibling }, pairIdx) => (
                    <div
                      key={primary.id}
                      style={{ borderBottom: pairIdx < pairs.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      {sibling ? (
                        // ── par vinculado ──
                        <div style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)' }}>
                              Par de actas · {new Date(primary.created_at).toLocaleDateString('es-AR')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[primary, sibling].map(cl => {
                              const isReception = cl.type === 'reception'
                              const accent = isReception ? 'var(--teal)' : '#6366f1'
                              const accentBg = isReception ? 'var(--teal-bg)' : '#eef2ff'
                              return (
                                <div
                                  key={cl.id}
                                  onClick={() => navigate(`/planillas/${cl.id}`)}
                                  style={{
                                    flex: 1, minWidth: 160, cursor: 'pointer',
                                    border: `1px solid var(--border)`,
                                    borderLeft: `3px solid ${accent}`,
                                    borderRadius: 8, padding: '10px 12px',
                                    background: 'var(--surface)',
                                    transition: 'background .1s',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = accentBg)}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>
                                      {isReception ? '📥 Recepción' : '📤 Entrega'}
                                    </span>
                                    <StatusBadge status={cl.status} />
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
                                    {statusLabel(cl.status)}
                                  </div>
                                  {cl.status === 'completed' && cl.completed_at && (
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                      Cerrada {new Date(cl.completed_at).toLocaleDateString('es-AR')}
                                    </div>
                                  )}
                                  <div style={{ marginTop: 6, textAlign: 'right' }}>
                                    <ChevronRight size={12} style={{ color: accent }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        // ── acta suelta (creada antes del nuevo flujo) ──
                        <div
                          onClick={() => navigate(`/planillas/${primary.id}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                            cursor: 'pointer', transition: 'background .1s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <StatusBadge status={primary.status} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>
                              {primary.title ?? `Acta de ${clTypeLabel(primary.type).toLowerCase()}`}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>
                              {statusLabel(primary.status)}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                            {new Date(primary.created_at).toLocaleDateString('es-AR')}
                          </span>
                          <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Assign modal ── */}
      {assigningTemplate && (
        <AssignModal
          template={assigningTemplate}
          onClose={() => setAssigningTemplate(null)}
          onCreated={() => { setAssigningTemplate(null); load() }}
        />
      )}
    </div>
  )
}
