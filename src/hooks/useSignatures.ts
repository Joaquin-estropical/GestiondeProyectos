import { useState, useCallback, useEffect } from 'react'

export type SignatureRole = 'delivery' | 'reception'

export interface SignatureData {
  dataUrl: string
  signerName: string
  signedAt: string
  role: SignatureRole
}

export interface SignaturesState {
  delivery: SignatureData | null
  reception: SignatureData | null
}

const STORAGE_KEY = (id: string) => `signatures_${id}`

export function useSignatures(checklistId: string) {
  const [signatures, setSignatures] = useState<SignaturesState>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY(checklistId))
      if (raw) return JSON.parse(raw)
    } catch {}
    return { delivery: null, reception: null }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY(checklistId), JSON.stringify(signatures))
    } catch {}
  }, [signatures, checklistId])

  const saveSignature = useCallback((role: SignatureRole, dataUrl: string, signerName: string) => {
    setSignatures(prev => ({
      ...prev,
      [role]: { dataUrl, signerName, signedAt: new Date().toISOString(), role },
    }))
  }, [])

  const clearSignature = useCallback((role: SignatureRole) => {
    setSignatures(prev => ({ ...prev, [role]: null }))
  }, [])

  const bothSigned = signatures.delivery !== null && signatures.reception !== null

  return { signatures, saveSignature, clearSignature, bothSigned }
}
