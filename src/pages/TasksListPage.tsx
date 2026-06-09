import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAppStore, useVisibleTasks, useVisibleProjects, useVisibleAreas } from '@/stores/app'
import { PageHead } from '@/components/shared/PageHead'
import { StatusPill, PriorityPill } from '@/components/shared/Badges'
import { dueColor, fmtDate } from '@/lib/mock-data'
import { taskAccent, taskUrgency } from '@/lib/visual'
import type { Urgency } from '@/lib/visual'
import { Avatar } from '@/components/shared/Avatar'
import { useMembers } from '@/hooks/useSupabase'
import type { Task } from '@/types'

type FilterKey = 'overdue' | 'at_risk' | 'done' | 'today' | 'open' | 'all'

const FILTER_LABELS: Record<FilterKey, string> = {
  overdue:  'Tareas vencidas',
  at_risk:  'En riesgo',
  done:     'Completadas',
  today:    'Vencen hoy',
  open:     'Abiertas',
  all:      'Todas las tareas',
}

function applyFilter(tasks: Task[], filter: FilterKey): Task[] {
  const today = new Date().toISOString().split('T')[0]
  const twoDaysLater = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  switch (filter) {
    case 'overdue':  return tasks.filter(t => t.status !== 'done' && t.due < today)
    case 'at_risk':  return tasks.filter(t => t.status !== 'done' && t.due >= today && t.due <= twoDaysLater)
    case 'done':     return tasks.filter(t => t.status === 'done')
    case 'today':    return tasks.filter(t => t.due === today)
    case 'open':     return tasks.filter(t => t.status !== 'done')
    default:         return tasks
  }
}

export default function TasksListPage() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const filter    = (params.get('filter') ?? 'all') as FilterKey
  const assignee  = params.get('assignee') ?? ''
  const openTask  = useAppStore(s => s.openTask)
  const tasks     = useVisibleTasks()
  const projects  = useVisibleProjects()
  const areas     = useVisibleAreas()
  const { data: members = [] } = useMembers()
  const resolveName = (id: string) => members.find(m => m.id === id)?.name ?? 'Sin asignar'

  const byFilter   = applyFilter(tasks, filter)
  const filtered   = assignee ? byFilter.filter(t => t.assignee === assignee) : byFilter
  const label      = FILTER_LABELS[filter] ?? 'Tareas'

  // Agrupar por urgencia solo en vistas amplias (all / open)
  const grouped = filter === 'all' || filter === 'open'
  const GROUPS: { key: Urgency; label: string; color: string }[] = [
    { key: 'overdue', label: 'Vencidas',         color: 'var(--red)'    },
    { key: 'block',   label: 'Bloqueadas',       color: 'var(--red)'    },
    { key: 'soon',    label: 'En riesgo (0-2d)', color: 'var(--amber)'  },
    { key: 'normal',  label: 'Más adelante',     color: 'var(--text-2)' },
    { key: 'done',    label: 'Hechas',           color: 'var(--green)'  },
  ]

  const renderRow = (t: Task, last: boolean) => {
    const project = projects.find(p => p.id === t.project)
    const area    = areas.find(a => a.id === t.area)
    const accent  = taskAccent(t)
    return (
      <div
        key={t.id}
        onClick={() => openTask(t.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 18px 12px 15px',
          borderLeft: `3px solid ${accent.bar ?? 'transparent'}`,
          background: accent.tint,
          borderBottom: last ? 'none' : '1px solid var(--border)',
          cursor: 'pointer', transition: 'background .1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = accent.tint)}
      >
        {area && (
          <span style={{ width: 8, height: 8, borderRadius: 2, background: area.color, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
            {project?.name ?? t.project}
            {area && ` · ${area.name}`}
          </div>
        </div>
        {t.assignee && (
          <Avatar name={resolveName(t.assignee)} size={22} title={resolveName(t.assignee)} />
        )}
        <StatusPill   status={t.status}   />
        <PriorityPill priority={t.priority} />
        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: dueColor(t.due), flexShrink: 0 }}>
          {fmtDate(t.due)}
        </span>
      </div>
    )
  }

  return (
    <>
      <PageHead
        title={label}
        subtitle={`${filtered.length} tarea${filtered.length !== 1 ? 's' : ''}`}
        right={
          <button
            className="btn btn-ghost btn-md"
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
        }
      />
      <div className="page-body" style={{ maxWidth: 860 }}>
        {filtered.length === 0 ? (
          <div className="empty" style={{ marginTop: 60 }}>
            <p className="t">Sin tareas</p>
            <p className="d">No hay tareas que coincidan con este filtro.</p>
          </div>
        ) : grouped ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {GROUPS.map(g => {
              const rows = filtered.filter(t => taskUrgency(t) === g.key)
              if (rows.length === 0) return null
              return (
                <div key={g.key} className="card" style={{ padding: 0 }}>
                  <div className="card-head">
                    <span className="title" style={{ color: g.color }}>{g.label}</span>
                    <span className="micro" style={{ marginLeft: 'auto' }}>{rows.length}</span>
                  </div>
                  {rows.map((t, i) => renderRow(t, i === rows.length - 1))}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((t, i) => renderRow(t, i === filtered.length - 1))}
          </div>
        )}
      </div>
    </>
  )
}
