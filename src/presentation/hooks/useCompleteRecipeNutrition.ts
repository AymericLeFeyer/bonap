import { useCallback, useState } from "react"
import type { SavedRecipeNutrition } from "../../application/nutrition/usecases/SaveRecipeNutritionUseCase.ts"
import { NothingToEstimateError } from "../../application/nutrition/usecases/SaveRecipeNutritionUseCase.ts"
import type { NutritionEstimate } from "../../domain/nutrition/entities/NutritionFood.ts"
import { completeRecipeNutritionUseCase } from "../../infrastructure/container.ts"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { useCiqualAi } from "./useCiqualAi.ts"

/** Calcul rapide depuis la fiche recette : classification puis enregistrement. */
export function useCompleteRecipeNutrition() {
  const { enabled: aiEnabled } = useCiqualAi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(null)

  const complete = useCallback(async (recipe: MealieRecipe): Promise<SavedRecipeNutrition | null> => {
    setLoading(true)
    setError(null)
    setEstimate(null)
    try {
      const result = await completeRecipeNutritionUseCase.execute(recipe, { aiEnabled })
      setEstimate(result.estimate)
      return result
    } catch (err) {
      if (err instanceof NothingToEstimateError) setEstimate(err.estimate)
      setError(err instanceof Error ? err.message : "Impossible d'estimer la nutrition")
      return null
    } finally {
      setLoading(false)
    }
  }, [aiEnabled])

  return { complete, loading, error, estimate }
}
