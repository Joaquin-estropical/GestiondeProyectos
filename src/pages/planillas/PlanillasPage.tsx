import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ClipboardList, Layers, ChevronRight,
  CheckCircle2, Clock, AlertCircle,
} from 'lucide-react'
import type { EventChecklist, ChecklistTemplate } from '@/types'
import {
  fetchEventChecklists, fetchChecklistTemplates,
  createEventChecklist, createReceptionFromTemplate,
} from '@/lib/planillas'
import { useAppStore } from '@/stores/app'

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

interface ProjectRow { id: string; name: string; checklists: EventChecklist[] }

export default function PlanillasPage() {
  const navigate     = useNavigate()
  const { projects } = useAppStore()

  const [rows, setRows]             = useState<ProjectRow[]>([])
  const [templates, setTemplates]   = useState<ChecklistTemplate[]>([])
  const [loading, setLoading]       = useState(true)

  const [showNew, setShowNew]           = useState(false)
  const [newProjectId, setNewProjectId] = useState('')
  const [newTemplateId, setNewTemplateId] = useState('')
  const [creating, setCreating]         = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const projectIds = projects.map(p => p.id).join(',')

  const load = useCallback(async () => {
    if (projects.length === 0) { setRows([]); setLoading(false); return }
    setLoading(true)
    try {
      const [tpls, allCls] = await Promise.all([
        fetchChecklistTemplates(),
        Promise.all(projects.map(p => fetchEventChecklists(p.id))),
      ])
      setTemplates(tpls)
      setRows(projects.map((p, i) => ({ id: p.id, name: p.name, checklists: allCls[i] })))
    } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIds])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!newProjectId) return
    setCreating(true); setError(null)
    try {
      if (newTemplateId) {
        await createReceptionFromTemplate(newProjectId, newTemplateId)
      } else {
        await createEventChecklist({ event_id: newProjectId, type: 'reception' })
      }
      setShowNew(false); setNewProjectId(''); setNewTemplateId('')
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally { setCreating(false) }
  }

  const withChecklists = rows.filter(r => r.checklists.length > 0)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Planillas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>
            Actas de recepción y entrega de locales por evento.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/planillas/plantillas')}>
            <Layers size={14} /> Plantillas
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Nueva planilla
          </button>
        </div>
      </div>

      {/* New checklist form */}
      {showNew && (
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 20, marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>Crear acta de recepción</h3>
          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Proyecto / Evento *</label>
              <select className="input" value={newProjectId} onChange={e => setNewProjectId(e.target.value)}>
                <option value="">Seleccionar proyecto…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                Plantilla base <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <select className="input" value={newTemplateId} onChange={e => setNewTemplateId(e.target.value)}>
                <option value="">Sin plantilla — empezar en blanco</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowNew(false); setError(null); setNewProjectId(''); setNewTemplateId('') }}>
                Cancelar
              </button>
              <button className="btn btn-primary btn-sm" disabled={!newProjectId || creating} onClick={handleCreate}>
                {creating ? 'Creando…' : 'Crear acta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '48px 0', fontSize: 14 }}>Cargando planillas…</div>
      ) : withChecklists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
          <ClipboardList size={40} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>No hay planillas todavía.</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 16px' }}>
            Creá una acta de recepción para un evento o proyecto.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>
            <Plus size={13} /> Crear primera planilla
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {withChecklists.map(proj => (
            <div key={proj.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{proj.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{proj.checklists.length} acta{proj.checklists.length !== 1 ? 's' : ''}</span>
              </div>
              {proj.checklists.map((cl, idx) => (
                <div
                  key={cl.id}
                  onClick={() => navigate(`/planillas/${cl.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
                    cursor: 'pointer', transition: 'background .1s',
                    borderBottom: idx < proj.checklists.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <StatusBadge status={cl.status} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      {cl.type === 'reception' ? 'Acta de recepción' : 'Acta de entrega'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{statusLabel(cl.status)}</span>
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
    </div>
  )
}
