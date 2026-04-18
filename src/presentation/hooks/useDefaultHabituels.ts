import { useState, useCallback } from "react"

const STORAGE_KEY = "bonap_show_default_habituels"

function readValue(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // null = jamais défini = install fraîche → true par défaut
    return stored === null ? true : stored === "true"
  } catch {
    return true
  }
}

export function useDefaultHabituels() {
  const [enabled, setEnabled] = useState<boolean>(readValue)

  const toggle = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // ignore
    }
    setEnabled(value)
  }, [])

  return { enabled, toggle }
}
