import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Copy, Trash2, ChevronRight, Layers, Pencil, Check, X } from 'lucide-react'
import type { ChecklistTemplate, TemplateKind } from '@/types'
import { TEMPLATE_KIND_LABELS } from '@/types'
import {
  fetchChecklistTemplates, createChecklistTemplate,
  updateChecklistTemplate, deleteChecklistTemplate, duplicateChecklistTemplate,
} from '@/lib/planillas'

const KIND_COLORS: Record<TemplateKind, string> = {
  event_delivery:  '#6366f1',
  branch_delivery: '#0d9488',
  local_return:    '#f59e0b',
  custom:          '#6b7280',
}

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [newKind, setNewKind]     = useState<TemplateKind>('custom')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setTemplates(await fetchChecklistTemplates()) } finally { setLoading(false) }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    await createChecklistTemplate({ name: newName.trim(), kind: newKind })
    setNewName(''); setCreating(false); load()
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    await updateChecklistTemplate(id, { name: editName.trim() })
    setEditingId(null); load()
  }

  async function handleDuplicate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await duplicateChecklistTemplate(id); load()
  }

  async function handleDelete(id: string, name: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`¿Eliminar plantilla "${name}"? Se eliminarán todos sus ítems.`)) return
    await deleteChecklistTemplate(id); load()
  }

  const kindEntries = Object.entries(TEMPLATE_KIND_LABELS) as [TemplateKind, string][]

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Plantillas de planillas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>
            Reutilizables en cualquier acta. Editar una plantilla no afecta actas ya creadas.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {creating && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16,
          background: 'var(--surface-2)', border: '1px solid var(--teal)',
          borderRadius: 8, padding: '14px 16px',
        }}>
          <input
            autoFocus className="input" placeholder="Nombre de la plantilla…"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
          />
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Tipo</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {kindEntries.map(([k, label]) => (
                <button
                  key={k}
                  className={`btn btn-sm ${newKind === k ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setNewKind(k)}
                  style={{ fontSize: 12 }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!newName.trim()}>Crear</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '48px 0', fontSize: 14 }}>Cargando…</div>
      ) : templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', border: '1px dashed var(--border)', borderRadius: 12 }}>
          <Layers size={36} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>No hay plantillas todavía.</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 16px' }}>Creá una para reutilizarla en futuras planillas.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={13} /> Crear primera plantilla
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {templates.map(tpl => (
            <div
              key={tpl.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${KIND_COLORS[tpl.kind]}`,
                borderRadius: 8, padding: '12px 14px',
                transition: 'border-color .12s',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === tpl.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      autoFocus className="input" value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(tpl.id); if (e.key === 'Escape') setEditingId(null) }}
                      style={{ flex: 1, fontSize: 13 }}
                      onClick={e => e.stopPropagation()}
                    />
                    <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleRename(tpl.id)}><Check size={13} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingId(null)}><X size={13} /></button>
                  </div>
                ) : (
                  <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/planillas/plantillas/${tpl.id}`)}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
                    <div style={{ fontSize: 11, color: KIND_COLORS[tpl.kind], marginTop: 2, fontWeight: 500 }}>
                      {TEMPLATE_KIND_LABELS[tpl.kind]}
                    </div>
                    {tpl.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{tpl.description}</div>
                    )}
                  </div>
                )}
              </div>

              {editingId !== tpl.id && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost btn-sm btn-icon" title="Renombrar"
                    onClick={e => { e.stopPropagation(); setEditingId(tpl.id); setEditName(tpl.name) }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-icon" title="Duplicar"
                    onClick={e => handleDuplicate(tpl.id, e)}
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-icon" title="Eliminar"
                    style={{ color: 'var(--red)' }}
                    onClick={e => handleDelete(tpl.id, tpl.name, e)}
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight
                    size={14} style={{ color: 'var(--text-3)', cursor: 'pointer' }}
                    onClick={() => navigate(`/planillas/plantillas/${tpl.id}`)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
