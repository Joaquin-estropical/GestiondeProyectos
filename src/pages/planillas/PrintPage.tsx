import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { EventChecklist, ChecklistItem } from '@/types'
import { fetchChecklistById, fetchChecklistItems, conditionLabel } from '@/lib/planillas'
import { fetchProjects } from '@/lib/db'
import type { Project } from '@/types'

const COND_COLOR: Record<string, string> = { good: '#059669', fair: '#d97706', poor: '#dc2626' }

// Estropical logo — inline SVG matching the brand (map pin heart + wordmark)
function EstropicalLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Icon: map pin with heart */}
      <svg width="36" height="40" viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="#003DA5"/>
        <path d="M18 10c-2.76 0-5 2.24-5 5 0 1.38.56 2.63 1.46 3.54L18 22l3.54-3.46A4.97 4.97 0 0023 15c0-2.76-2.24-5-5-5z" fill="#E31837"/>
        <path d="M18 13a2 2 0 110 4 2 2 0 010-4z" fill="white"/>
      </svg>
      {/* Wordmark */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#003DA5', letterSpacing: -0.5, lineHeight: 1 }}>
          es<span style={{ color: '#E31837' }}>tropical</span>
          <span style={{ color: '#003DA5' }}>.com</span>
        </div>
      </div>
    </div>
  )
}

export default function PrintPage() {
  const { checklistId } = useParams<{ checklistId: string }>()

  const [checklist, setChecklist] = useState<EventChecklist | null>(null)
  const [items, setItems]         = useState<ChecklistItem[]>([])
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

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

  useEffect(() => {
    if (!checklist) return
    const pName = projects.find(p => p.id === checklist.event_id)?.name ?? checklist.event_id
    setCustomProject(pName)
    setCustomType(checklist.type === 'reception' ? 'Recepción de local' : 'Entrega de local')
    setCustomStatus(checklist.status === 'completed' ? 'Cerrada' : 'Abierta')
  }, [checklist, projects])

  const S: React.CSSProperties = {
    position: 'fixed', inset: 0, overflowY: 'auto',
    background: '#ffffff', color: '#111111',
    fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 12,
  }

  if (loading) return <div style={S}><div style={{ padding: 40, textAlign: 'center' }}>Cargando…</div></div>
  if (error || !checklist) return <div style={S}><div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error ?? 'Error'}</div></div>

  const isReception = checklist.type === 'reception'
  const date = new Date(checklist.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const categories = Array.from(new Set(items.map(i => i.category)))

  const editInput: React.CSSProperties = {
    border: 'none', borderBottom: '1.5px dashed #94a3b8', outline: 'none',
    background: 'transparent', fontSize: 'inherit', fontWeight: 'inherit',
    color: 'inherit', fontFamily: 'inherit', width: '100%', padding: '1px 2px',
  }

  return (
    <div style={S}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 15mm 14mm; size: A4; }
          input { border-bottom: none !important; }
        }
        .print-root { background: #fff !important; color: #111 !important; }
        .print-table { width: 100%; border-collapse: collapse; }
        .print-table th {
          background: #f1f5f9; font-weight: 700; font-size: 10px;
          text-transform: uppercase; letter-spacing: .05em;
          padding: 7px 9px; border: 1px solid #cbd5e1; text-align: left;
          color: #334155;
        }
        .print-table td { padding: 7px 9px; border: 1px solid #e2e8f0; vertical-align: middle; }
        .print-table tr:nth-child(even) td { background: #f8fafc; }
        .cat-row td {
          background: #e8f0f7 !important; font-weight: 700;
          font-size: 10px; letter-spacing: .05em; color: #1e3a5f;
          text-transform: uppercase; border-color: #bfcfdf !important;
        }
        .sig-row { display: flex; gap: 28px; margin-top: 44px; }
        .sig-box { flex: 1; border-top: 1.5px solid #94a3b8; padding-top: 8px; font-size: 10px; color: #64748b; }
        .sig-box strong { display: block; font-size: 11px; color: #1e293b; margin-bottom: 22px; }
      `}</style>

      {/* ── Toolbar (hidden on print) ── */}
      <div className="no-print" style={{
        background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        padding: '10px 24px', display: 'flex', gap: 8, alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 20, flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setTimeout(() => window.print(), 50)}
          style={{ padding: '7px 18px', background: '#003DA5', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
        >
          Imprimir / PDF
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ padding: '7px 14px', background: '#fff', color: '#374151', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}
        >
          ← Volver
        </button>
        <div style={{ width: 1, height: 22, background: '#e2e8f0', margin: '0 2px' }} />
        <button
          onClick={() => setEditingHeader(v => !v)}
          style={{
            padding: '7px 14px', fontSize: 13, borderRadius: 7, cursor: 'pointer',
            background: editingHeader ? '#003DA5' : '#fff',
            color: editingHeader ? '#fff' : '#374151',
            border: `1px solid ${editingHeader ? '#003DA5' : '#e2e8f0'}`,
            fontWeight: editingHeader ? 700 : 400,
          }}
        >
          {editingHeader ? '✓ Listo' : '✏ Personalizar encabezado'}
        </button>
        {editingHeader && (
          <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
            Los cambios son solo para esta impresión.
          </span>
        )}
      </div>

      {/* ── Document ── */}
      <div className="print-root" style={{ padding: '32px 44px', maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: 22, paddingBottom: 16,
          borderBottom: '3px solid #003DA5',
        }}>
          <EstropicalLogo />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', letterSpacing: 1 }}>
              ACTA DE {isReception ? 'RECEPCIÓN' : 'ENTREGA'}
            </div>
            <div style={{ color: '#64748b', marginTop: 5, fontSize: 11 }}>{date}</div>
          </div>
        </div>

        {/* Info strip — editable */}
        <div style={{
          display: 'flex', marginBottom: 20,
          border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden',
        }}>
          {([
            { label: 'Evento / Proyecto', val: customProject, set: setCustomProject },
            { label: 'Tipo de acta',      val: customType,    set: setCustomType    },
            { label: 'Estado',            val: customStatus,  set: setCustomStatus  },
            { label: 'Total ítems',       val: String(items.length), set: null      },
          ] as { label: string; val: string; set: ((v: string) => void) | null }[]).map(({ label, val, set }, i) => (
            <div key={label} style={{
              flex: 1, padding: '10px 14px',
              borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none',
              background: '#fff',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#94a3b8', marginBottom: 4 }}>
                {label}
              </div>
              {editingHeader && set ? (
                <input value={val} onChange={e => set(e.target.value)}
                  style={{ ...editInput, fontWeight: 600, fontSize: 12, color: '#0f172a' }} />
              ) : (
                <div style={{ fontWeight: 600, fontSize: 12, color: '#0f172a' }}>{val}</div>
              )}
            </div>
          ))}
        </div>

        {/* Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th>Ítem</th>
              <th style={{ width: 52, textAlign: 'center' }}>Cant.</th>
              <th style={{ width: 90, textAlign: 'center' }}>Cond. recepción</th>
              {!isReception && <th style={{ width: 90, textAlign: 'center' }}>Cond. entrega</th>}
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
                    <td style={{ fontWeight: 500, fontSize: 11 }}>
                      {item.name}
                      {item.photos.length > 0 && (
                        <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 6, fontStyle: 'italic' }}>
                          [{item.photos.length} foto{item.photos.length !== 1 ? 's' : ''}]
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 11 }}>{item.qty ?? ''}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 11, color: item.condition_in ? COND_COLOR[item.condition_in] : 'inherit' }}>
                      {item.condition_in ? conditionLabel(item.condition_in) : ''}
                    </td>
                    {!isReception && (
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 11, color: item.condition_out ? COND_COLOR[item.condition_out] : 'inherit' }}>
                        {item.condition_out ? conditionLabel(item.condition_out) : ''}
                      </td>
                    )}
                    <td style={{ fontSize: 10, color: '#0f172a' }}>{item.notes ?? ''}</td>
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
            _____ / _____ / _________&nbsp;&nbsp;_____:_____
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, fontSize: 9, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10, textAlign: 'center' }}>
          Documento generado automáticamente · estropical.com · Las fotos adjuntas se encuentran en el sistema digital.
        </div>
      </div>
    </div>
  )
}
