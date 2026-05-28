import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { ProjectForm, ProjectFormItem, RelevamientoCondition, Project } from '@/types'
import { RELEVAMIENTO_CONDITION_LABELS } from '@/types'
import { fetchProjectForm, fetchFormItems } from '@/lib/projectForms'
import { fetchProjects } from '@/lib/db'

const COND_ORDER: RelevamientoCondition[] = ['optimo', 'regular', 'mantenimiento', 'na']

// Logo fiel al original: corazón azul + pin rojo encima + wordmark todo azul
function EstropicalLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="52" height="40" viewBox="0 0 52 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 34C20 34 2 22.5 2 12.5C2 7.25 6.25 3 11.5 3C14.42 3 17 4.4 18.5 6.6C19.1 5.5 20.2 4.1 21.5 3.5C18.5 6.5 18.5 10 20 12.5L20 34Z" fill="#003DA5"/>
        <path d="M20 34C20 34 38 22.5 38 12.5C38 7.25 33.75 3 28.5 3C25.58 3 23 4.4 21.5 6.6C20.9 5.5 19.8 4.1 18.5 3.5C21.5 6.5 21.5 10 20 12.5L20 34Z" fill="#003DA5" opacity="0.7"/>
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

export default function RelevamientoPrintPage() {
  const { formId } = useParams<{ formId: string }>()

  const [form, setForm]       = useState<ProjectForm | null>(null)
  const [items, setItems]     = useState<ProjectFormItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [sucursal,    setSucursal]    = useState('')
  const [direccion,   setDireccion]   = useState('')
  const [ciudad,      setCiudad]      = useState('')
  const [fecha,       setFecha]       = useState('')
  const [relevadoPor, setRelevadoPor] = useState('')
  const [responsable, setResponsable] = useState('')
  const [tipoVisita,  setTipoVisita]  = useState('☐ Programada   ☐ Correctiva   ☐ Preventiva')
  const [proxima,     setProxima]     = useState('')
  const [editingHeader, setEditingHeader] = useState(false)

  useEffect(() => {
    if (!formId) return
    ;(async () => {
      try {
        const [f, its, projs] = await Promise.all([
          fetchProjectForm(formId),
          fetchFormItems(formId),
          fetchProjects(),
        ])
        if (!f) { setError('Formulario no encontrado.'); return }
        setForm(f); setItems(its); setProjects(projs)
      } catch (e) {
        setError((e as Error).message)
      } finally { setLoading(false) }
    })()
  }, [formId])

  useEffect(() => {
    if (!form) return
    const pName = projects.find(p => p.id === form.project_id)?.name ?? form.project_id
    setSucursal(pName)
    setFecha(new Date(form.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }))
  }, [form, projects])

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
  if (error || !form) return (
    <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontFamily: 'Arial, sans-serif' }}>
      {error ?? 'Error'}
    </div>
  )

  const categories = Array.from(new Set(items.map(i => i.category ?? 'Sin categoría')))

  const editInput: React.CSSProperties = {
    border: 'none', borderBottom: '1.5px dashed #94a3b8', outline: 'none',
    background: 'transparent', fontSize: 'inherit', fontWeight: 'inherit',
    color: 'inherit', fontFamily: 'inherit', width: '100%', padding: '1px 2px',
  }

  const infoFields: { label: string; val: string; set: (v: string) => void }[] = [
    { label: 'Sucursal',              val: sucursal,    set: setSucursal    },
    { label: 'Dirección',             val: direccion,   set: setDireccion   },
    { label: 'Ciudad',                val: ciudad,      set: setCiudad      },
    { label: 'Fecha',                 val: fecha,       set: setFecha       },
    { label: 'Relevado por',          val: relevadoPor, set: setRelevadoPor },
    { label: 'Responsable sucursal',  val: responsable, set: setResponsable },
    { label: 'Tipo de visita',        val: tipoVisita,  set: setTipoVisita  },
    { label: 'Próxima revisión',      val: proxima,     set: setProxima     },
  ]

  let rowNum = 0

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
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
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: .04em;
          padding: 7px 6px;
          border: 1px solid #c8d6e8;
          text-align: left;
          color: #1e3a5f;
        }
        .print-table td {
          padding: 7px 6px;
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
        .cond-cell { text-align: center; font-size: 14px; }
        .cond-on   { color: #003DA5; font-weight: 700; }
        .cond-off  { color: #94a3b8; }
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
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', letterSpacing: 1, textTransform: 'uppercase' }}>
                Checklist de Relevamiento de Sucursal
              </div>
              <div style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>{form.title}</div>
            </div>
          </div>

          {/* Info strip — 2 filas de 4 campos */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 22,
            border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden',
          }}>
            {infoFields.map(({ label, val, set }, i) => (
              <div key={label} style={{
                padding: '10px 14px',
                borderLeft: i % 4 !== 0 ? '1px solid #e2e8f0' : 'none',
                borderTop: i >= 4 ? '1px solid #e2e8f0' : 'none',
                background: '#ffffff',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#94a3b8', marginBottom: 4 }}>
                  {label}
                </div>
                {editingHeader ? (
                  <input value={val} onChange={e => set(e.target.value)}
                    style={{ ...editInput, fontWeight: 600, fontSize: 12, color: '#0f172a' }} />
                ) : (
                  <div style={{ fontWeight: 600, fontSize: 12, color: '#0f172a', minHeight: 15 }}>{val}</div>
                )}
              </div>
            ))}
          </div>

          {/* Table */}
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: 26, textAlign: 'center' }}>N°</th>
                <th>Ítem</th>
                {COND_ORDER.map(c => (
                  <th key={c} style={{ width: 70, textAlign: 'center' }}>{RELEVAMIENTO_CONDITION_LABELS[c]}</th>
                ))}
                <th style={{ width: 200 }}>Observaciones / hallazgo</th>
                <th style={{ width: 64, textAlign: 'center' }}>Foto / respaldo</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => {
                const catItems = items.filter(i => (i.category ?? 'Sin categoría') === cat)
                return [
                  <tr key={`cat-${cat}`} className="cat-row">
                    <td colSpan={8}>{cat}</td>
                  </tr>,
                  ...catItems.map(item => {
                    rowNum += 1
                    return (
                      <tr key={item.id}>
                        <td style={{ color: '#94a3b8', textAlign: 'center', fontSize: 10 }}>{rowNum}</td>
                        <td style={{ fontWeight: 500, fontSize: 11 }}>{item.title}</td>
                        {COND_ORDER.map(c => {
                          const on = item.condition === c
                          return (
                            <td key={c} className={`cond-cell ${on ? 'cond-on' : 'cond-off'}`}>
                              {on ? '☑' : '☐'}
                            </td>
                          )
                        })}
                        <td style={{ fontSize: 10, color: '#0f172a' }}>{item.observation ?? ''}</td>
                        <td />
                      </tr>
                    )
                  }),
                ]
              })}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="sig-row">
            <div className="sig-box">
              <strong>Firma / nombre responsable sucursal</strong>
            </div>
            <div className="sig-box">
              <strong>Firma / nombre relevador</strong>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 32, fontSize: 9, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 10, textAlign: 'center' }}>
            Revisar cada ítem, marcar una sola condición por fila y registrar observaciones claras cuando exista algún hallazgo · estropical.com
          </div>
        </div>
      </div>
    </>
  )
}
