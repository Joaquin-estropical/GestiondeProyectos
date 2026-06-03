import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Copy, Trash2, ChevronRight, ClipboardList, Printer, Loader2, X,
} from 'lucide-react'
import { useAppStore } from '@/stores/app'
import {
  fetchChecklistTemplates, createChecklistTemplate,
  duplicateChecklistTemplate, deleteChecklistTemplate,
} from '@/lib/planillas'
import { fetchProjectForms } from '@/lib/projectForms'
import { useMembers } from '@/hooks/useSupabase'
import type { ChecklistTemplate, ProjectForm, Project, Area } from '@/types'
import {
  CreateFormView, RunFormView, ReadFormView, FormCard,
} from '@/components/forms/FormViews'

type Tab = 'generales' | 'sucursales'

export default function FormulariosPage() {
  const [tab, setTab] = useState<Tab>('generales')

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Formularios</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>
          Modelos generales reutilizables y los formularios usados en cada sucursal. Rellenalos
          digitalmente o imprimilos como planilla.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab${tab === 'generales' ? ' active' : ''}`} onClick={() => setTab('generales')}>
          Generales
        </button>
        <button className={`tab${tab === 'sucursales' ? ' active' : ''}`} onClick={() => setTab('sucursales')}>
          Sucursales
        </button>
      </div>

      {tab === 'generales' ? <GeneralesTab /> : <SucursalesTab />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// TAB GENERALES — formularios maestros (checklist_templates)
// ════════════════════════════════════════════════════════════
function GeneralesTab() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setTemplates(await fetchChecklistTemplates()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const tpl = await createChecklistTemplate({ name: newName.trim(), kind: 'custom' })
    setNewName(''); setCreating(false)
    await load()
    navigate(`/planillas/plantillas/${tpl.id}`)
  }

  const handleDuplicate = async (id: string) => {
    await duplicateChecklistTemplate(id)
    await load()
  }

  const handleDelete = async (id: string) => {
    await deleteChecklistTemplate(id)
    setConfirmDel(null)
    await load()
  }

  if (loading) return <CenterSpinner />

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>
          Formularios generales · {templates.length}
        </h2>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
          <Plus size={13} /> Nuevo general
        </button>
      </div>

      {creating && (
        <div style={{ marginBottom: 12, padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--teal)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus className="input"
            placeholder="Nombre del formulario general (ej: Relevamiento de sucursal, Apertura de local…)"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setCreating(false); setNewName('') }}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!newName.trim()}>
              Crear y editar ítems
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 && !creating ? (
        <EmptyBox text="No hay formularios generales todavía. Creá uno para usar como base en las sucursales." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {templates.map(t => (
            <div key={t.id}
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => navigate(`/planillas/plantillas/${t.id}`)}
              >
                <ClipboardList size={16} color="var(--teal)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                  {t.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </div>
                  )}
                </div>
                <ChevronRight size={14} color="var(--text-3)" />
              </div>
              {/* Acciones */}
              <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, gap: 5 }} onClick={() => navigate(`/planillas/plantillas/${t.id}`)}>
                  <Pencil size={12} /> Editar
                </button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, gap: 5 }} onClick={() => handleDuplicate(t.id)}>
                  <Copy size={12} /> Duplicar
                </button>
                {confirmDel === t.id ? (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>¿Eliminar?</span>
                    <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,.15)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.3)', padding: '2px 8px', fontSize: 11 }} onClick={() => handleDelete(t.id)}>Sí</button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setConfirmDel(null)}>No</button>
                  </span>
                ) : (
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto', width: 28, height: 28, color: 'var(--text-3)' }} title="Eliminar" onClick={() => setConfirmDel(t.id)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ════════════════════════════════════════════════════════════
// TAB SUCURSALES — project_forms agrupados por proyecto
// ════════════════════════════════════════════════════════════
interface FormGroup {
  project: Project
  area:    Area | undefined
  forms:   ProjectForm[]
}

function SucursalesTab() {
  const { projects, areas, currentUser } = useAppStore()
  const { data: members = [] } = useMembers()

  const [groups, setGroups]   = useState<FormGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeForm, setActiveForm] = useState<ProjectForm | null>(null)
  const [picking, setPicking] = useState(false)            // selector de proyecto para nuevo
  const [creatingFor, setCreatingFor] = useState<Project | null>(null)

  const allIds = projects.map(p => p.id).join(',')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (projects.length === 0) { setGroups([]); return }
      const results = await Promise.all(projects.map(p => fetchProjectForms(p.id).catch(() => [] as ProjectForm[])))
      const gs: FormGroup[] = projects
        .map((p, i) => ({ project: p, area: areas.find(a => a.id === p.area), forms: results[i] }))
        .filter(g => g.forms.length > 0)
        // Sucursales primero, luego por nombre de proyecto
        .sort((a, b) => {
          const as = a.area?.type === 'sucursal' ? 0 : 1
          const bs = b.area?.type === 'sucursal' ? 0 : 1
          if (as !== bs) return as - bs
          return a.project.name.localeCompare(b.project.name, 'es')
        })
      setGroups(gs)
    } finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allIds])

  useEffect(() => { load() }, [load])

  // ── Vistas de detalle (reusan los componentes compartidos) ──
  if (creatingFor) {
    return (
      <PanelShell onClose={() => setCreatingFor(null)}>
        <CreateFormView
          projectId={creatingFor.id}
          currentUserId={currentUser.memberId}
          onDone={(form) => { setCreatingFor(null); setActiveForm(form) }}
          onCancel={() => setCreatingFor(null)}
        />
      </PanelShell>
    )
  }

  if (activeForm) {
    const proj = projects.find(p => p.id === activeForm.project_id)
    const projArea = proj?.area ?? ''
    if (activeForm.status === 'completed') {
      return (
        <PanelShell onClose={() => { setActiveForm(null); load() }}>
          <ReadFormView form={activeForm} onBack={() => { setActiveForm(null); load() }} onOpenTask={() => {}} />
        </PanelShell>
      )
    }
    return (
      <PanelShell onClose={() => { setActiveForm(null); load() }}>
        <RunFormView
          form={activeForm}
          projectId={activeForm.project_id}
          projectArea={projArea}
          currentUserName={currentUser.name}
          members={members}
          onBack={() => { setActiveForm(null); load() }}
          onDone={() => { setActiveForm(null); load() }}
        />
      </PanelShell>
    )
  }

  if (loading) return <CenterSpinner />

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>
          Formularios por sucursal
        </h2>
        <button className="btn btn-primary btn-sm" onClick={() => setPicking(true)}>
          <Plus size={13} /> Nuevo formulario
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyBox text="Todavía no se usó ningún formulario en una sucursal. Creá uno con “Nuevo formulario”." />
      ) : (
        groups.map(g => (
          <div key={g.project.id} style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: g.area?.color ?? 'var(--text-3)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{g.project.name}</span>
              {g.area && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {g.area.name}</span>}
            </div>
            {g.forms.map(f => (
              <FormCard
                key={f.id}
                form={f}
                onOpen={() => setActiveForm(f)}
                onPrint={() => window.open(`/formularios/${f.id}/imprimir`, '_blank')}
              />
            ))}
          </div>
        ))
      )}

      {/* Selector de proyecto para crear nuevo formulario */}
      {picking && (
        <ProjectPickerModal
          projects={projects}
          areas={areas}
          onPick={(p) => { setPicking(false); setCreatingFor(p) }}
          onClose={() => setPicking(false)}
        />
      )}
    </section>
  )
}

// ── Selector de proyecto/sucursal ─────────────────────────
function ProjectPickerModal({ projects, areas, onPick, onClose }: {
  projects: Project[]
  areas:    Area[]
  onPick:   (p: Project) => void
  onClose:  () => void
}) {
  const [q, setQ] = useState('')
  const sorted = [...projects].sort((a, b) => {
    const aa = areas.find(x => x.id === a.area)?.type === 'sucursal' ? 0 : 1
    const bb = areas.find(x => x.id === b.area)?.type === 'sucursal' ? 0 : 1
    if (aa !== bb) return aa - bb
    return a.name.localeCompare(b.name, 'es')
  })
  const filtered = q.trim()
    ? sorted.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
    : sorted

  return (
    <>
      <div className="modal-bd" onClick={onClose} />
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <span className="fw-6" style={{ fontSize: 15 }}>Elegí la sucursal / proyecto</span>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 'auto' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          <input
            autoFocus className="input"
            placeholder="Buscar proyecto…"
            value={q} onChange={e => setQ(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(p => {
              const area = areas.find(a => a.id === p.area)
              return (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--surface-1)', cursor: 'pointer', color: 'var(--text-1)',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: area?.color ?? 'var(--text-3)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                  {area && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{area.name}</span>}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '20px 0', textAlign: 'center' }}>
                Sin resultados.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Shell para vistas de detalle (alto fijo con scroll interno) ──
function PanelShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
      height: 'calc(100vh - 220px)', minHeight: 480, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', padding: '8px 12px 0' }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} title="Cerrar">
          <X size={15} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}

// ── Helpers UI ────────────────────────────────────────────
function CenterSpinner() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
      <Loader2 size={20} style={{ animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-3)', border: '2px dashed var(--border)', borderRadius: 12 }}>
      <Printer size={28} style={{ display: 'block', margin: '0 auto 12px', opacity: .4 }} />
      <div style={{ fontSize: 13, maxWidth: 420, margin: '0 auto' }}>{text}</div>
    </div>
  )
}
