import { useCallback, useState } from "react"

const STORAGE_KEY = "bonap.familySize"
const DEFAULT_SIZE = 4

export function useFamilySize() {
  const [familySize, setFamilySizeState] = useState<number>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    const n = raw ? parseInt(raw, 10) : NaN
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_SIZE
  })

  const setFamilySize = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(99, Math.round(n)))
    localStorage.setItem(STORAGE_KEY, String(clamped))
    setFamilySizeState(clamped)
  }, [])

  return { familySize, setFamilySize }
}
