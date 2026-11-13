import { useCallback, useState } from "react"
import { updateBatchUseCase } from "../../infrastructure/container.ts"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import type { BatchInfo } from "../../shared/utils/batch.ts"

/** Mutation du batch d'une recette (fiche recette, planning). */
export function useUpdateBatch() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateBatch = useCallback(async (
    slug: string,
    update: (current: BatchInfo) => BatchInfo,
  ): Promise<MealieRecipe | null> => {
    setLoading(true)
    setError(null)
    try {
      return await updateBatchUseCase.execute(slug, update)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le batch. Veuillez réessayer.")
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateBatch, loading, error }
}
