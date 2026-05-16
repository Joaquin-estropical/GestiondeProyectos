import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { EventChecklist, ChecklistItem } from '@/types'
import { fetchChecklistById, fetchChecklistItems, conditionLabel } from '@/lib/planillas'
import { fetchProjects } from '@/lib/db'
import type { Project } from '@/types'
import type { SignaturesState } from '@/hooks/useSignatures'

const COND_COLOR: Record<string, string> = { good: '#059669', fair: '#d97706', poor: '#dc2626' }

// Logo fiel al original: corazón azul + pin rojo encima + wordmark todo azul
function EstropicalLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="52" height="40" viewBox="0 0 52 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Corazón azul (mitad izquierda más grande, mitad derecha más chica) */}
        <path d="M20 34C20 34 2 22.5 2 12.5C2 7.25 6.25 3 11.5 3C14.42 3 17 4.4 18.5 6.6C19.1 5.5 20.2 4.1 21.5 3.5C18.5 6.5 18.5 10 20 12.5L20 34Z" fill="#003DA5"/>
        <path d="M20 34C20 34 38 22.5 38 12.5C38 7.25 33.75 3 28.5 3C25.58 3 23 4.4 21.5 6.6C20.9 5.5 19.8 4.1 18.5 3.5C21.5 6.5 21.5 10 20 12.5L20 34Z" fill="#003DA5" opacity="0.7"/>
        {/* Pin/marcador rojo encima del corazón */}
        <ellipse cx="28" cy="11" rx="9" ry="9" fill="#E31837"/>
        <circle cx="28" cy="11" r="3.5" fill="white"/>
        <path d="M28 18L24.5 23H31.5L28 18Z" fill="#E31837"/>
      </svg>
      <span style={{
        fontSize: 24, fontWeight: 800, color: '#003DA5',
        letterSpacing: -0.5, lineHeight: 1, fontFamily: "'Segoe UI', Arial, sans-serif",
      }}>
        estropical.com
      </span>
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
  const [customDate,    setCustomDate]    = useState('')
  const [customTotal,   setCustomTotal]   = useState('')
  const [editingHeader, setEditingHeader] = useState(false)

  const [signatures, setSignatures] = useState<SignaturesState>({ delivery: null, reception: null })

  useEffect(() => {
    if (!checklistId) return
    // Load signatures persisted in sessionStorage from the checklist view
    try {
      const raw = sessionStorage.getItem(`signatures_${checklistId}`)
      if (raw) setSignatures(JSON.parse(raw))
    } catch {}
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
    setCustomDate(new Date(checklist.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }))
  }, [checklist, projects])

  useEffect(() => {
    setCustomTotal(String(items.length))
  }, [items])

  // Force white background on the whole page
  useEffect(() => {
    const prev = document.body.style.cssText
    document.body.style.background = '#ffffff'
    document.body.style.color = '#111111'
    return () => { document.body.style.cssText = prev }
  }, [])

  if (loading) return (
    <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      Cargando…
    </div>
  )
  if (error || !checklist) return (
    <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontFamily: 'Arial, sans-serif' }}>
      {error ?? 'Error'}
    </div>
  )

  const isReception = checklist.type === 'reception'
  const categories  = Array.from(new Set(items.map(i => i.category)))

  const editInput: React.CSSProperties = {
    border: 'none', borderBottom: '1.5px dashed #94a3b8', outline: 'none',
    background: 'transparent', fontSize: 'inherit', fontWeight: 'inherit',
    color: 'inherit', fontFamily: 'inherit', width: '100%', padding: '1px 2px',
  }

  const infoFields: { label: string; val: string; set: (v: string) => void }[] = [
    { label: 'Evento / Proyecto', val: customProject, set: setCustomProject },
    { label: 'Tipo de acta',      val: customType,    set: setCustomType    },
    { label: 'Estado',            val: customStatus,  set: setCustomStatus  },
    { label: 'Total ítems',       val: customTotal,   set: setCustomTotal   },
  ]

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        /* Force white everywhere regardless of app theme */
        html, body { background: #ffffff !important; color: #111111 !important; }

        .print-page {
          background: #ffffff;
          color: #111111;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 12px;
          min-height: 100vh;
        }

        .print-table { width: 100%; border-collapse: collapse; }
        .print-table th {
          background: #eef3fa;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .05em;
          padding: 7px 9px;
          border: 1px solid #c8d6e8;
          text-align: left;
          color: #1e3a5f;
        }
        .print-table td {
          padding: 7px 9px;
          border: 1px solid #e2e8f0;
          vertical-align: middle;
          background: #ffffff;
          color: #111111;
        }
        .print-table tr:nth-child(even) td { background: #f7fafd; }
        .cat-row td {
          background: #dce8f5 !important;
          font-weight: 700;
          font-size: 10px;
          letter-spacing: .06em;
          color: #003DA5;
          text-transform: uppercase;
          border-color: #b8cfe8 !important;
        }
        .sig-row { display: flex; gap: 28px; margin-top: 44px; }
        .sig-box { flex: 1; border-top: 1.5px solid #94a3b8; padding-top: 8px; font-size: 10px; color: #64748b; }
        .sig-box strong { display: block; font-size: 11px; color: #1e293b; margin-bottom: 22px; }

        @media print {
          .no-print { display: none !important; }
          html, body { background: #ffffff !important; margin: 0 !important; }
          .print-page { min-height: unset; }
          @page { margin: 0; size: A4; }
          html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          input { border-bottom: none !important; }
          .print-table td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cat-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sig-box img { -webkit-print-color-adjust: exact; print-color-adjust: exact; max-height: 64px; }
        }
      `}</style>

      <div className="print-page">

        {/* ── Toolbar ── */}
        <div className="no-print" style={{
          background: '#003DA5', padding: '10px 24px',
          display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
          position: 'sticky', top: 0, zIndex: 20,
        }}>
          <button
            onClick={() => setTimeout(() => window.print(), 50)}
            style={{ padding: '7px 20px', background: '#ffffff', color: '#003DA5', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
          >
            Imprimir / PDF
          </button>
          <button
            onClick={() => window.history.back()}
            style={{ padding: '7px 14px', background: 'transparent', color: '#ffffff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 7, cursor: 'pointer', fontSize: 13 }}
          >
            ← Volver
          </button>
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.3)', margin: '0 2px' }} />
          <button
            onClick={() => setEditingHeader(v => !v)}
            style={{
              padding: '7px 14px', fontSize: 13, borderRadius: 7, cursor: 'pointer',
              background: editingHeader ? '#ffffff' : 'transparent',
              color: editingHeader ? '#003DA5' : '#ffffff',
              border: '1px solid rgba(255,255,255,0.4)',
              fontWeight: editingHeader ? 700 : 400,
            }}
          >
            {editingHeader ? '✓ Listo' : '✏ Personalizar'}
          </button>
          {editingHeader && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
              Los cambios son solo para esta impresión.
            </span>
          )}
        </div>

        {/* ── Document body ── */}
        <div style={{ padding: '32px 44px', maxWidth: 920, margin: '0 auto' }}>

          {/* Header row: logo + title */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 20, paddingBottom: 14, borderBottom: '3px solid #003DA5',
          }}>
            <EstropicalLogo />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Acta de {isReception ? 'Recepción' : 'Entrega'}
              </div>
              {editingHeader ? (
                <input
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  style={{ ...editInput, textAlign: 'right', fontSize: 12, color: '#64748b', marginTop: 4, width: 130 }}
                />
              ) : (
                <div style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>{customDate}</div>
              )}
            </div>
          </div>

          {/* Info strip */}
          <div style={{
            display: 'flex', marginBottom: 22,
            border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden',
          }}>
            {infoFields.map(({ label, val, set }, i) => (
              <div key={label} style={{
                flex: 1, padding: '10px 14px',
                borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none',
                background: '#ffffff',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#94a3b8', marginBottom: 4 }}>
                  {label}
                </div>
                {editingHeader ? (
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
                <th style={{ width: 54, textAlign: 'center' }}>Cant.</th>
                <th style={{ width: 100, textAlign: 'center' }}>Cond. recepción</th>
                {!isReception && <th style={{ width: 100, textAlign: 'center' }}>Cond. entrega</th>}
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
            {(['delivery', 'reception'] as const).map(role => {
              const sig   = signatures[role]
              const label = role === 'delivery' ? 'Entregado por' : 'Recibido por'
              return (
                <div key={role} className="sig-box">
                  <strong>{label}</strong>
                  {sig ? (
                    <>
                      <img
                        src={sig.dataUrl}
                        alt={`Firma de ${label}`}
                        style={{
                          display: 'block', height: 64, maxWidth: '100%',
                          objectFit: 'contain', marginBottom: 6,
                          WebkitPrintColorAdjust: 'exact',
                        } as React.CSSProperties}
                      />
                      <span style={{ fontSize: 10, color: '#0f172a' }}>
                        {sig.signerName || '—'}
                      </span>
                      {sig.signedAt && (
                        <span style={{ display: 'block', fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                          {new Date(sig.signedAt).toLocaleString('es-AR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin firma digital</span>
                  )}
                </div>
              )
            })}
            <div className="sig-box">
              <strong>Fecha y hora</strong>
              {signatures.delivery?.signedAt
                ? new Date(signatures.delivery.signedAt).toLocaleString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                : '_____ / _____ / _________  _____:_____'
              }
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 32, fontSize: 9, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10, textAlign: 'center' }}>
            Documento generado automáticamente · estropical.com · Las fotos adjuntas se encuentran en el sistema digital.
          </div>
        </div>
      </div>
    </>
  )
}
