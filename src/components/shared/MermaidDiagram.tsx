import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

let initialized = false

export function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })
      initialized = true
    }
    const id = 'mermaid-' + Math.random().toString(36).slice(2)
    mermaid.render(id, chart).then(({ svg }) => setSvg(svg))
  }, [chart])

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} />
}
