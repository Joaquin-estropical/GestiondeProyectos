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
  createEventChecklist, createReceptionFromTemplate,
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

  const [targetType, setTargetType]   = useState<'project' | 'area'>('project')
  const [projectId,  setProjectId]    = useState('')
  const [areaId,     setAreaId]       = useState('')
  const [clType,     setClType]       = useState<'reception' | 'delivery'>('reception')
  const [creating,   setCreating]     = useState(false)
  const [error,      setError]        = useState<string | null>(null)

  async function handleCreate() {
    const eventId = targetType === 'project' ? projectId : areaId
    if (!eventId) { setError('Seleccioná un destino'); return }
    setCreating(true); setError(null)
    try {
      const { checklist } = await createReceptionFromTemplate(eventId, template.id)
      // update type if delivery
      if (clType === 'delivery') {
        await createEventChecklist({ event_id: eventId, type: 'delivery', template_id: template.id })
      }
      onCreated()
      navigate(`/planillas/${checklist.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally { setCreating(false) }
  }

  return (
    <>
      <div className="modal-bd" onClick={onClose} />
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>Usar plantilla: {template.name}</span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Target */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
              Asignar a
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                className={`btn btn-sm ${targetType === 'project' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTargetType('project')}
              >Proyecto</button>
              <button
                className={`btn btn-sm ${targetType === 'area' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTargetType('area')}
              >Área</button>
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

          {/* Checklist type */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
              Tipo de acta
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm ${clType === 'reception' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setClType('reception')}
              >Recepción</button>
              <button
                className={`btn btn-sm ${clType === 'delivery' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setClType('delivery')}
              >Entrega</button>
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
            {creating ? 'Creando…' : 'Crear planilla'}
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

                {/* checklists */}
                {group.checklists.map((cl, idx) => (
                  <div
                    key={cl.id}
                    onClick={() => navigate(`/planillas/${cl.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      cursor: 'pointer', transition: 'background .1s',
                      borderBottom: idx < group.checklists.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <StatusBadge status={cl.status} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {cl.title ?? `Acta de ${clTypeLabel(cl.type).toLowerCase()}`}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>
                        {statusLabel(cl.status)}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {new Date(cl.created_at).toLocaleDateString('es-AR')}
                    </span>
                    <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
                  </div>
                ))}
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
