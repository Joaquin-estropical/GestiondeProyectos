import { Flag, Store, Building2, Warehouse, MapPin, Layers, MoreHorizontal } from 'lucide-react'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/mock-data'
import { useAppStore } from '@/stores/app'

type IconComponent = React.ComponentType<{ size?: number }>
const AREA_ICONS: Record<string, IconComponent> = { store: Store, 'building-2': Building2, warehouse: Warehouse, 'map-pin': MapPin, layers: Layers, 'more-horizontal': MoreHorizontal }

interface StatusPillProps { status: string }
export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`pill pill-status-${status}`}>
      <span className="dot" />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

interface PriorityPillProps { priority: string; iconOnly?: boolean }
export function PriorityPill({ priority, iconOnly }: PriorityPillProps) {
  return (
    <span
      className={`pill pill-prio-${priority}`}
      style={iconOnly ? { padding: '2px 6px', background: 'transparent', border: 0 } : {}}
    >
      <Flag size={11} />
      {!iconOnly && (PRIORITY_LABELS[priority] ?? priority)}
    </span>
  )
}

interface AreaPillProps { areaId: string; mini?: boolean }
export function AreaPill({ areaId, mini }: AreaPillProps) {
  const areas = useAppStore(s => s.areas)
  const a = areas.find(x => x.id === areaId)
  if (!a) return null
  const IconComp = AREA_ICONS[a.icon] ?? Store
  return (
    <span className="pill pill-area">
      <span className="area-ico" style={{ background: a.color }}>
        <IconComp size={9} />
      </span>
      {!mini && a.name}
    </span>
  )
}
