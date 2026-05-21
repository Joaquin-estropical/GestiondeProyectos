import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/stores/app'
import { PageHead } from '@/components/shared/PageHead'
import { StatusPill, PriorityPill } from '@/components/shared/Badges'
import { dueColor, fmtDate } from '@/lib/mock-data'
import { Avatar } from '@/components/shared/Avatar'
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
  const filter    = (params.get('filter') ?? 'all') as FilterKey
  const { tasks, projects, areas, openTask } = useAppStore()

  const filtered = applyFilter(tasks, filter)
  const label    = FILTER_LABELS[filter] ?? 'Tareas'

  return (
    <>
      <PageHead title={label} subtitle={`${filtered.length} tarea${filtered.length !== 1 ? 's' : ''}`} />
      <div className="page-body" style={{ maxWidth: 860 }}>
        {filtered.length === 0 ? (
          <div className="empty" style={{ marginTop: 60 }}>
            <p className="t">Sin tareas</p>
            <p className="d">No hay tareas que coincidan con este filtro.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {filtered.map((t, i) => {
              const project = projects.find(p => p.id === t.project)
              const area    = areas.find(a => a.id === t.area)
              return (
                <div
                  key={t.id}
                  onClick={() => openTask(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 18px',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Area dot */}
                  {area && (
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: area.color, flexShrink: 0 }} />
                  )}

                  {/* Title + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {project?.name ?? t.project}
                      {area && ` · ${area.name}`}
                    </div>
                  </div>

                  {/* Assignee */}
                  {t.assignee && (
                    <Avatar name={t.assignee} size={22} />
                  )}

                  {/* Pills */}
                  <StatusPill   status={t.status}   />
                  <PriorityPill priority={t.priority} />

                  {/* Due date */}
                  <span style={{
                    fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                    color: dueColor(t.due), flexShrink: 0,
                  }}>
                    {fmtDate(t.due)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
