import { useCallback, useRef, useState } from "react"
import { suggestBatchRecipesUseCase } from "../../infrastructure/container.ts"
import type { BatchSuggestion } from "../../application/recipe/usecases/SuggestBatchRecipesUseCase.ts"

/** Détection IA des recettes batchables (lecture seule, l'utilisateur valide ensuite). */
export function useSuggestBatchRecipes() {
  const [suggestions, setSuggestions] = useState<BatchSuggestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const run = useCallback(async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    setSuggestions(null)
    setProgress(null)
    try {
      const result = await suggestBatchRecipesUseCase.execute({
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      if (!controller.signal.aborted) setSuggestions(result)
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "La détection IA a échoué")
      }
    } finally {
      if (controllerRef.current === controller) setLoading(false)
    }
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setLoading(false)
  }, [])

  return { suggestions, loading, progress, error, run, cancel }
}
