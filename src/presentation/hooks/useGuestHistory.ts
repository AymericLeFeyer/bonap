import { useCallback, useEffect, useState } from "react"
import { getGuestHistoryUseCase } from "../../infrastructure/container.ts"
import type { GuestHistory } from "../../domain/planning/services/GuestHistoryService.ts"

/**
 * Historique des invités, reconstruit depuis les notes du planning.
 * `reload` est à appeler après avoir modifié les invités d'un repas.
 */
export function useGuestHistory() {
  const [history, setHistory] = useState<GuestHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setHistory(await getGuestHistoryUseCase.execute())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des invités")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { history, loading, error, reload }
}
