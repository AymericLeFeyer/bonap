import { useEffect, useState } from "react"
import type { MealieTool } from "../../shared/types/mealie.ts"
import { getToolsUseCase } from "../../infrastructure/container.ts"

/** Ustensiles définis dans Mealie (liste vide si l'appel échoue). */
export function useTools() {
  const [tools, setTools] = useState<MealieTool[]>([])

  useEffect(() => {
    let cancelled = false
    getToolsUseCase
      .execute()
      .then((data) => {
        if (!cancelled) setTools(data)
      })
      .catch(() => {
        if (!cancelled) setTools([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { tools }
}
