interface DonutSegment { value: number; color: string; name?: string }

interface DonutProps {
  data: DonutSegment[]
  size?: number
  stroke?: number
  center?: string | number
  centerSize?: number
}

export function Donut({ data, size = 140, stroke = 18, center, centerSize }: DonutProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0)
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
      {data.map((d, i) => {
        const frac = d.value / total
        const dash = c * frac
        const offset = -c * acc
        acc += frac
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={d.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        )
      })}
      {center != null && (
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          fill="var(--text-1)" fontSize={centerSize ?? 22} fontFamily="JetBrains Mono" fontWeight="600">
          {center}
        </text>
      )}
    </svg>
  )
}

interface SparkProps { data: number[]; w?: number; h?: number; color?: string }
export function Spark({ data, w = 80, h = 24, color = 'var(--teal)' }: SparkProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const rng = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / rng) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
