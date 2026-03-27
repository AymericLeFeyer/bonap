import { useCallback, useState } from "react"

const STORAGE_KEY = "bonap:grid_columns"
const MIN_COLUMNS = 3
const MAX_COLUMNS = 12
const DEFAULT_COLUMNS = 4

function readFromStorage(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_COLUMNS
    const parsed = parseInt(raw, 10)
    if (isNaN(parsed) || parsed < MIN_COLUMNS || parsed > MAX_COLUMNS) return DEFAULT_COLUMNS
    return parsed
  } catch {
    return DEFAULT_COLUMNS
  }
}

function writeToStorage(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Silently ignore storage errors
  }
}

export function useGridColumns() {
  const [columns, setColumnsState] = useState<number>(readFromStorage)

  const setColumns = useCallback((next: number) => {
    const clamped = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, next))
    writeToStorage(clamped)
    setColumnsState(clamped)
  }, [])

  const increment = useCallback(() => {
    setColumnsState((prev) => {
      const next = Math.min(MAX_COLUMNS, prev + 1)
      writeToStorage(next)
      return next
    })
  }, [])

  const decrement = useCallback(() => {
    setColumnsState((prev) => {
      const next = Math.max(MIN_COLUMNS, prev - 1)
      writeToStorage(next)
      return next
    })
  }, [])

  return {
    columns,
    setColumns,
    increment,
    decrement,
    canIncrement: columns < MAX_COLUMNS,
    canDecrement: columns > MIN_COLUMNS,
    min: MIN_COLUMNS,
    max: MAX_COLUMNS,
  }
}
