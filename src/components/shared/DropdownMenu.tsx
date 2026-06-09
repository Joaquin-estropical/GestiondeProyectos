import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface DropdownItem {
  label:    string
  icon?:    ReactNode
  onClick:  () => void
  danger?:  boolean
  /** Inserta un separador encima de este ítem */
  divider?: boolean
}

interface Props {
  items:    DropdownItem[]
  /** Trigger custom; por defecto un botón con tres puntos */
  trigger?: ReactNode
  /** Ancho mínimo del menú */
  minWidth?: number
  /** Alineación del menú respecto del botón */
  align?:   'left' | 'right'
  title?:   string
}

// Menú desplegable compartido — posición fija + click-outside + estilo unificado.
// Reemplaza los menús hechos a mano en ProjectPage / AreaView.
export function DropdownMenu({ items, trigger, minWidth = 200, align = 'right', title }: Props) {
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const open = pos !== null

  useEffect(() => {
    if (!open) return
    const handler = (e: Event) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setPos(null)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const toggle = () => {
    if (open) { setPos(null); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const vw = window.innerWidth
    // En pantallas chicas el menú ocupa casi todo el ancho (anclado a ambos bordes)
    if (vw < 480) {
      setPos({ top: r.bottom + 4, left: 8, right: 8 })
      return
    }
    // Clampear al viewport para que nunca se salga de la pantalla
    if (align === 'right') {
      const right = Math.max(8, vw - r.right)
      setPos({ top: r.bottom + 4, right })
    } else {
      const left = Math.min(r.left, vw - minWidth - 8)
      setPos({ top: r.bottom + 4, left: Math.max(8, left) })
    }
  }

  return (
    <>
      <button ref={btnRef} className="btn btn-secondary btn-sm btn-icon" onClick={toggle} title={title}>
        {trigger ?? <MoreHorizontal size={14} />}
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: pos.top, left: pos.left, right: pos.right, zIndex: 9000,
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '4px 0',
            minWidth: pos.left != null && pos.right != null ? undefined : minWidth,
            maxWidth: 'calc(100vw - 16px)',
            maxHeight: 'calc(100vh - 24px)', overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,.5)',
          }}
        >
          {items.map((it, i) => (
            <div key={i}>
              {it.divider && <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />}
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '8px 14px', background: 'none', border: 'none',
                  color: it.danger ? 'var(--red)' : 'var(--text-1)',
                  fontSize: 13, cursor: 'pointer', textAlign: 'left',
                }}
                onClick={() => { setPos(null); it.onClick() }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {it.icon}{it.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
