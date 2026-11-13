import { useCallback, useEffect, useState } from "react"
import { getBatchRecipesUseCase, updateBatchUseCase } from "../../infrastructure/container.ts"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { isBatchRecipe, type BatchInfo } from "../../shared/utils/batch.ts"

/** Recettes batch avec leur stock. `enabled` false : rien n'est chargé (dialogue fermé). */
export function useBatchRecipes(enabled = true) {
  const [recipes, setRecipes] = useState<MealieRecipe[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setRecipes(await getBatchRecipesUseCase.execute())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les recettes batch")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) void reload()
  }, [enabled, reload])

  /** Modifie le batch d'une recette et met la liste à jour avec la réponse du serveur. */
  const updateBatch = useCallback(async (slug: string, update: (current: BatchInfo) => BatchInfo) => {
    try {
      const updated = await updateBatchUseCase.execute(slug, update)
      setRecipes((prev) => {
        const others = prev.filter((r) => r.slug !== slug)
        return isBatchRecipe(updated)
          ? [...others, updated].sort((a, b) => a.name.localeCompare(b.name, "fr"))
          : others
      })
      setError(null)
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le stock")
      return null
    }
  }, [])

  return { recipes, loading, error, reload, updateBatch }
}
