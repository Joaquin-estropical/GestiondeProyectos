import { useRef, useEffect, useState, useCallback } from 'react'
import type { SignatureRole } from '@/hooks/useSignatures'

interface Props {
  open: boolean
  role: SignatureRole
  onSave: (dataUrl: string, signerName: string) => void
  onClose: () => void
}

const LABELS: Record<SignatureRole, string> = {
  delivery: 'Quien entrega',
  reception: 'Quien recibe',
}

export function SignatureModal({ open, role, onSave, onClose }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const lastPos    = useRef({ x: 0, y: 0 })
  const isDrawing  = useRef(false)
  const [hasDrawn, setHasDrawn]     = useState(false)
  const [signerName, setSignerName] = useState('')

  // Resize canvas to physical pixels after the modal has painted
  useEffect(() => {
    if (!open) return
    setHasDrawn(false)
    setSignerName('')
    // rAF ensures the modal is rendered and the canvas has its final layout size
    const raf = requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const dpr  = window.devicePixelRatio || 1
      canvas.width  = rect.width  * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
    })
    return () => cancelAnimationFrame(raf)
  }, [open])

  const getCtx = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return null
    ctx.strokeStyle = '#003DA5'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    return ctx
  }, [])

  const getPos = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = (x: number, y: number) => {
    isDrawing.current = true
    setHasDrawn(true)
    lastPos.current = { x, y }
  }

  const draw = (x: number, y: number) => {
    if (!isDrawing.current) return
    const ctx = getCtx()
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    lastPos.current = { x, y }
  }

  const stopDraw = () => { isDrawing.current = false }

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }, [])

  const handleSave = useCallback(() => {
    if (!hasDrawn || !canvasRef.current) return
    const src = canvasRef.current
    const off = document.createElement('canvas')
    off.width  = src.width
    off.height = src.height
    const ctx  = off.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, off.width, off.height)
    ctx.drawImage(src, 0, 0)
    onSave(off.toDataURL('image/png'), signerName.trim())
    onClose()
  }, [hasDrawn, signerName, onSave, onClose])

  if (!open) return null

  return (
    <>
      <style>{`
        .sig-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: flex-end; justify-content: center;
        }
        .sig-dialog {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px 16px 0 0;
          width: 100%; max-width: 520px; overflow: hidden;
        }
        @media (min-width: 640px) {
          .sig-overlay { align-items: center; padding: 24px; }
          .sig-dialog  { border-radius: 12px; }
        }
      `}</style>
    <div
      className="sig-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="sig-dialog">
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '12px 16px',
          borderBottom: '1px solid var(--border)', gap: 8,
        }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
            Firma — {LABELS[role]}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)', fontSize: 18, lineHeight: 1 }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Name input */}
        <div style={{ padding: '12px 16px 0' }}>
          <input
            type="text"
            placeholder="Nombre completo (opcional)"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 13, boxSizing: 'border-box',
              border: '1px solid var(--border)', borderRadius: 8,
              background: 'var(--surface-2)', color: 'var(--text-1)',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>

        {/* Canvas area */}
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{
            position: 'relative', background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: 10,
            height: 180, overflow: 'hidden',
          }}>
            {!hasDrawn && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 6,
                color: 'var(--text-3)', pointerEvents: 'none',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span style={{ fontSize: 13 }}>Dibujá tu firma aquí</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
              onMouseDown={e => { const p = getPos(e.clientX, e.clientY); startDraw(p.x, p.y) }}
              onMouseMove={e => { const p = getPos(e.clientX, e.clientY); draw(p.x, p.y) }}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; const p = getPos(t.clientX, t.clientY); startDraw(p.x, p.y) }}
              onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; const p = getPos(t.clientX, t.clientY); draw(p.x, p.y) }}
              onTouchEnd={stopDraw}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, padding: '8px 16px 16px' }}>
          <button
            onClick={clearCanvas}
            disabled={!hasDrawn}
            style={{
              padding: '8px 14px', fontSize: 13, borderRadius: 8, cursor: hasDrawn ? 'pointer' : 'not-allowed',
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)',
              opacity: hasDrawn ? 1 : 0.4,
            }}
          >
            Borrar
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '8px', fontSize: 13, borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-1)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!hasDrawn}
            style={{
              flex: 1, padding: '8px', fontSize: 13, fontWeight: 600, borderRadius: 8,
              cursor: hasDrawn ? 'pointer' : 'not-allowed', border: 'none',
              background: hasDrawn ? '#003DA5' : '#94a3b8', color: '#ffffff',
            }}
          >
            Guardar firma
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
