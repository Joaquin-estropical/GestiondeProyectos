import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { EventChecklist, ChecklistItem } from '@/types'
import { fetchChecklistById, fetchChecklistItems, conditionLabel } from '@/lib/planillas'
import { fetchProjects } from '@/lib/db'
import type { Project } from '@/types'

const COND_COLOR: Record<string, string> = { good: '#059669', fair: '#d97706', poor: '#dc2626' }

export default function PrintPage() {
  const { checklistId } = useParams<{ checklistId: string }>()

  const [checklist, setChecklist] = useState<EventChecklist | null>(null)
  const [items, setItems]         = useState<ChecklistItem[]>([])
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Editable header fields
  const [customProject, setCustomProject] = useState('')
  const [customType,    setCustomType]    = useState('')
  const [customStatus,  setCustomStatus]  = useState('')
  const [editingHeader, setEditingHeader] = useState(false)

  useEffect(() => {
    if (!checklistId) return
    ;(async () => {
      try {
        const [cl, its, projs] = await Promise.all([
          fetchChecklistById(checklistId),
          fetchChecklistItems(checklistId),
          fetchProjects(),
        ])
        if (!cl) { setError('Planilla no encontrada.'); return }
        setChecklist(cl); setItems(its); setProjects(projs)
      } catch (e) {
        setError((e as Error).message)
      } finally { setLoading(false) }
    })()
  }, [checklistId])

  // Init editable fields once checklist loads
  useEffect(() => {
    if (!checklist || projects.length === 0) return
    const pName = projects.find(p => p.id === checklist.event_id)?.name ?? checklist.event_id
    setCustomProject(pName)
    setCustomType(checklist.type === 'reception' ? 'Recepción de local' : 'Entrega de local')
    setCustomStatus(checklist.status === 'completed' ? 'Cerrada' : 'Abierta')
  }, [checklist, projects])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>Cargando…</div>
  if (error || !checklist) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontFamily: 'Arial, sans-serif' }}>{error ?? 'Error'}</div>

  const isReception = checklist.type === 'reception'
  const date = new Date(checklist.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const categories = Array.from(new Set(items.map(i => i.category)))

  const inputStyle: React.CSSProperties = {
    border: 'none', borderBottom: '1px dashed #94a3b8', outline: 'none',
    background: 'transparent', fontSize: 'inherit', fontWeight: 'inherit',
    color: 'inherit', fontFamily: 'Arial, sans-serif', width: '100%',
    padding: '1px 2px',
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          @page { margin: 18mm 15mm; }
          input { border-bottom: none !important; }
        }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }
        td { padding: 6px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        .cat-row td { background: #f1f5f9 !important; font-weight: 700; font-size: 10px; letter-spacing: .04em; color: #475569; }
        .sig-row { display: flex; gap: 32px; margin-top: 48px; }
        .sig-box { flex: 1; border-top: 1.5px solid #94a3b8; padding-top: 8px; font-size: 10px; color: #64748b; }
        .sig-box strong { display: block; font-size: 11px; color: #1e293b; margin-bottom: 24px; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{
        padding: '10px 20px', borderBottom: '1px solid #e2e8f0',
        display: 'flex', gap: 8, background: '#f8fafc',
        position: 'sticky', top: 0, zIndex: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setTimeout(() => window.print(), 50)}
          style={{ padding: '6px 16px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          Imprimir / PDF
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ padding: '6px 16px', background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          ← Volver
        </button>
        <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 4px' }} />
        <button
          onClick={() => setEditingHeader(v => !v)}
          style={{
            padding: '6px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
            background: editingHeader ? '#0d9488' : '#f1f5f9',
            color: editingHeader ? '#fff' : '#374151',
            border: `1px solid ${editingHeader ? '#0d9488' : '#e2e8f0'}`,
            fontWeight: editingHeader ? 600 : 400,
          }}
        >
          {editingHeader ? '✓ Listo' : '✏ Personalizar encabezado'}
        </button>
        {editingHeader && (
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Los cambios solo afectan la impresión, no la planilla.
          </span>
        )}
      </div>

      <div style={{ padding: '28px 40px', maxWidth: 920, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #0d9488' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0d9488', letterSpacing: -0.5 }}>Operaciones Tropical</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Sistema de gestión de locales y eventos</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
              ACTA DE {isReception ? 'RECEPCIÓN' : 'ENTREGA'}
            </div>
            <div style={{ color: '#64748b', marginTop: 4, fontSize: 11 }}>{date}</div>
          </div>
        </div>

        {/* Info box — editable fields */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
          {[
            { label: 'Evento / Proyecto', val: customProject, set: setCustomProject },
            { label: 'Tipo de acta',      val: customType,    set: setCustomType    },
            { label: 'Estado',            val: customStatus,  set: setCustomStatus  },
            { label: 'Total ítems',       val: String(items.length), set: null      },
          ].map(({ label, val, set }, i) => (
            <div key={label} style={{ flex: 1, padding: '10px 14px', borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#64748b', marginBottom: 3 }}>{label}</div>
              {editingHeader && set ? (
                <input
                  value={val}
                  onChange={e => set(e.target.value)}
                  style={{ ...inputStyle, fontWeight: 700, fontSize: 12, color: '#0f172a' }}
                />
              ) : (
                <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{val}</div>
              )}
            </div>
          ))}
        </div>

        {/* Items table */}
        <table>
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Ítem</th>
              <th style={{ width: 56, textAlign: 'center' }}>Cant.</th>
              <th style={{ width: 96, textAlign: 'center' }}>Cond. recepción</th>
              {!isReception && <th style={{ width: 96, textAlign: 'center' }}>Cond. entrega</th>}
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => {
              const catItems = items.filter(i => i.category === cat)
              return [
                <tr key={`cat-${cat}`} className="cat-row">
                  <td colSpan={isReception ? 5 : 6}>{cat}</td>
                </tr>,
                ...catItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: '#94a3b8', textAlign: 'center', fontSize: 10 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>
                      {item.name}
                      {item.photos.length > 0 && (
                        <span style={{ fontSize: 9, color: '#64748b', marginLeft: 6, fontStyle: 'italic' }}>
                          [{item.photos.length} foto{item.photos.length !== 1 ? 's' : ''} en sistema]
                        </span>
                      )}
                    </td>
                    {/* Cantidad — blank if null */}
                    <td style={{ textAlign: 'center' }}>{item.qty ?? ''}</td>
                    {/* Condición recepción — blank if null */}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: item.condition_in ? COND_COLOR[item.condition_in] : 'transparent' }}>
                      {item.condition_in ? conditionLabel(item.condition_in) : ''}
                    </td>
                    {!isReception && (
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.condition_out ? COND_COLOR[item.condition_out] : 'transparent' }}>
                        {item.condition_out ? conditionLabel(item.condition_out) : ''}
                      </td>
                    )}
                    {/* Observaciones — blank if null */}
                    <td style={{ color: '#0f172a', fontSize: 10 }}>
                      {item.notes ?? ''}
                    </td>
                  </tr>
                )),
              ]
            })}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="sig-row">
          <div className="sig-box">
            <strong>Entregado por</strong>
            Nombre completo y firma
          </div>
          <div className="sig-box">
            <strong>Recibido por</strong>
            Nombre completo y firma
          </div>
          <div className="sig-box">
            <strong>Fecha y hora</strong>
            _____ / _____ / _________ &nbsp;&nbsp; _____ : _____
          </div>
        </div>

        <div style={{ marginTop: 36, fontSize: 9, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10, textAlign: 'center' }}>
          Documento generado automáticamente · Operaciones Tropical · Las fotos adjuntas se encuentran en el sistema digital.
        </div>
      </div>
    </>
  )
}
