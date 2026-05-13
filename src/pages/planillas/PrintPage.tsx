import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { EventChecklist, ChecklistItem } from '@/types'
import { fetchChecklistById, fetchChecklistItems } from '@/lib/planillas'
import { fetchProjects } from '@/lib/db'
import type { Project } from '@/types'

const CONDITION_LABELS: Record<string, string> = {
  good: 'Buena',
  fair: 'Regular',
  poor: 'Mala',
}

export default function PrintPage() {
  const { checklistId } = useParams<{ checklistId: string }>()

  const [checklist, setChecklist] = useState<EventChecklist | null>(null)
  const [items, setItems]         = useState<ChecklistItem[]>([])
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!checklistId) return
    load()
  }, [checklistId])

  async function load() {
    setLoading(true)
    try {
      // PrintPage is outside AppShell so store projects are not loaded — fetch directly
      const [cl, its, projs] = await Promise.all([
        fetchChecklistById(checklistId!),
        fetchChecklistItems(checklistId!),
        fetchProjects(),
      ])
      if (!cl) { setError('Planilla no encontrada.'); return }
      setChecklist(cl)
      setItems(its)
      setProjects(projs)
    } catch (e) {
      setError((e as Error).message)
    } finally { setLoading(false) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>Cargando…</div>
  if (error || !checklist) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontFamily: 'Arial, sans-serif' }}>
      {error ?? 'Planilla no encontrada.'}
    </div>
  )

  const projectName = projects.find(p => p.id === checklist.event_id)?.name ?? checklist.event_id
  const isReception = checklist.type === 'reception'
  const date = new Date(checklist.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          @page { margin: 20mm; }
        }
        * { box-sizing: border-box; }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
        th { background: #f5f5f5; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
        tr:nth-child(even) td { background: #fafafa; }
        .signature-row { display: flex; gap: 40px; margin-top: 48px; }
        .signature-box { flex: 1; border-top: 1px solid #999; padding-top: 8px; font-size: 11px; color: #555; }
      `}</style>

      {/* Toolbar — hidden when printing */}
      <div className="no-print" style={{
        padding: '12px 24px', borderBottom: '1px solid #e5e7eb',
        display: 'flex', gap: 8, background: '#f9fafb',
      }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '7px 18px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ padding: '7px 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          Volver
        </button>
      </div>

      <div style={{ padding: '32px 48px', maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Operaciones Tropical</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Sistema de gestión de locales</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              Acta de {isReception ? 'recepción' : 'entrega'}
            </div>
            <div style={{ color: '#555', marginTop: 4 }}>{date}</div>
          </div>
        </div>

        {/* Event summary */}
        <div style={{
          display: 'flex', gap: 32, marginBottom: 24,
          padding: '12px 16px', background: '#f9fafb',
          borderRadius: 8, border: '1px solid #e5e7eb', flexWrap: 'wrap',
        }}>
          {[
            ['Evento / Proyecto', projectName],
            ['Tipo', isReception ? 'Recepción de local' : 'Entrega de local'],
            ['Estado', checklist.status === 'completed' ? 'Cerrada' : checklist.status === 'in_progress' ? 'En curso' : 'Pendiente'],
            ['Total ítems', String(items.length)],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6b7280' }}>{label}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Items table */}
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Ítem</th>
              <th style={{ width: 120 }}>Categoría</th>
              <th style={{ width: 60, textAlign: 'center' }}>Cant.</th>
              <th style={{ width: 90, textAlign: 'center' }}>Cond. recepción</th>
              {!isReception && <th style={{ width: 90, textAlign: 'center' }}>Cond. entrega</th>}
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const colorIn  = item.condition_in  ? ({ good: '#059669', fair: '#d97706', poor: '#dc2626' } as Record<string,string>)[item.condition_in]  : '#9ca3af'
              const colorOut = item.condition_out ? ({ good: '#059669', fair: '#d97706', poor: '#dc2626' } as Record<string,string>)[item.condition_out] : '#9ca3af'
              return (
                <tr key={item.id}>
                  <td style={{ color: '#9ca3af', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td style={{ color: '#6b7280' }}>{item.category ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: colorIn }}>
                    {item.condition_in ? CONDITION_LABELS[item.condition_in] : '—'}
                  </td>
                  {!isReception && (
                    <td style={{ textAlign: 'center', fontWeight: 600, color: colorOut }}>
                      {item.condition_out ? CONDITION_LABELS[item.condition_out] : '—'}
                    </td>
                  )}
                  <td style={{ color: item.notes ? '#111' : '#d1d5db', fontStyle: item.notes ? 'normal' : 'italic' }}>
                    {item.notes || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="signature-row">
          <div className="signature-box">
            <strong>Entregado por</strong>
            <div style={{ marginTop: 40, fontSize: 11 }}>Nombre y firma</div>
          </div>
          <div className="signature-box">
            <strong>Recibido por</strong>
            <div style={{ marginTop: 40, fontSize: 11 }}>Nombre y firma</div>
          </div>
          <div className="signature-box">
            <strong>Fecha</strong>
            <div style={{ marginTop: 8, fontSize: 13 }}>______ / ______ / ________</div>
          </div>
        </div>

        <div style={{ marginTop: 40, fontSize: 10, color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: 12, textAlign: 'center' }}>
          Documento generado por el sistema de gestión · Operaciones Tropical
        </div>
      </div>
    </>
  )
}
