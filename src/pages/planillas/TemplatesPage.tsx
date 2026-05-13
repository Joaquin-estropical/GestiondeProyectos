import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Copy, Trash2, ChevronRight, Layers } from 'lucide-react'
import type { ChecklistTemplate } from '@/types'
import {
  fetchChecklistTemplates, createChecklistTemplate,
  updateChecklistTemplate, deleteChecklistTemplate, duplicateChecklistTemplate,
} from '@/lib/planillas'

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setTemplates(await fetchChecklistTemplates()) } finally { setLoading(false) }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    await createChecklistTemplate({ name: newName.trim() })
    setNewName('')
    setCreating(false)
    load()
  }

  async function handleDuplicate(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await duplicateChecklistTemplate(id)
    load()
  }

  async function handleDelete(id: string, name: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`¿Eliminar plantilla "${name}"? Se eliminarán todos sus ítems.`)) return
    await deleteChecklistTemplate(id)
    load()
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Plantillas de planillas</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>
            Define los ítems base que se usan al crear actas de recepción.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {/* Create form inline */}
      {creating && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
        }}>
          <input
            autoFocus
            className="input"
            placeholder="Nombre de la plantilla…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!newName.trim()}>Crear</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Cancelar</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '48px 0', fontSize: 14 }}>
          Cargando…
        </div>
      ) : templates.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          border: '1px dashed var(--border)', borderRadius: 12,
        }}>
          <Layers size={36} style={{ color: 'var(--text-3)', marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>No hay plantillas todavía.</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 16px' }}>
            Crea una para reutilizarla en futuras planillas.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={13} /> Crear primera plantilla
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {templates.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => navigate(`/planillas/plantillas/${tpl.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                transition: 'border-color .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--teal)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Layers size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{tpl.name}</div>
                {tpl.category && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{tpl.category}</div>
                )}
              </div>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                title="Duplicar"
                onClick={e => handleDuplicate(tpl.id, e)}
              >
                <Copy size={13} />
              </button>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                title="Eliminar"
                style={{ color: 'var(--red)' }}
                onClick={e => handleDelete(tpl.id, tpl.name, e)}
              >
                <Trash2 size={13} />
              </button>
              <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
