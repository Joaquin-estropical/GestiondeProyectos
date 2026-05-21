import type { CSSProperties } from 'react'
import { avatarColor, initials } from '@/lib/mock-data'

interface AvatarProps {
  name: string
  size?: number
  title?: string
  className?: string
  style?: CSSProperties
}

export function Avatar({ name, size = 24, title, className = '', style }: AvatarProps) {
  const safeName = name ?? ''
  const fs = size <= 20 ? 9.5 : size <= 24 ? 10.5 : size <= 32 ? 12.5 : 18
  const sizeClass = size === 20 ? 'avatar-sm' : size === 32 ? 'avatar-lg' : size === 48 ? 'avatar-xl' : ''
  return (
    <span
      title={title ?? safeName}
      className={`avatar ${sizeClass} ${className}`}
      style={{ width: size, height: size, fontSize: fs, background: avatarColor(safeName), ...style }}
    >
      {initials(safeName)}
    </span>
  )
}

interface AvatarStackProps {
  names: string[]
  size?: number
  max?: number
}

export function AvatarStack({ names, size = 24, max = 4 }: AvatarStackProps) {
  const list = names.slice(0, max)
  const rest = Math.max(0, names.length - max)
  return (
    <span className="avatar-stack" style={{ display: 'inline-flex' }}>
      {list.map((name) => (
        <Avatar key={name} name={name} size={size} style={{ border: '1.5px solid var(--bg)' }} />
      ))}
      {rest > 0 && (
        <span
          className="mono"
          style={{
            width: size, height: size, borderRadius: 999,
            display: 'inline-grid', placeItems: 'center',
            fontSize: 10, fontWeight: 600, color: 'var(--text-2)',
            background: 'var(--surface-2)', border: '1.5px solid var(--bg)',
            marginLeft: -6,
          }}
        >
          +{rest}
        </span>
      )}
    </span>
  )
}
