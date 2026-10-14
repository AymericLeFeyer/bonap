import { useCallback, useEffect, useState } from "react"
import type { NutritionEstimate } from "../../domain/nutrition/entities/NutritionFood.ts"
import { NothingToEstimateError } from "../../application/nutrition/usecases/SaveRecipeNutritionUseCase.ts"
import {
  classifyRecipeIngredientsUseCase,
  estimateRecipeNutritionUseCase,
  saveRecipeNutritionUseCase,
} from "../../infrastructure/container.ts"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { useCiqualAi } from "./useCiqualAi.ts"

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

/**
 * Correspondances CIQUAL d'une recette : aperçu du calcul (sans enregistrer),
 * classification automatique, puis recalcul enregistré dans Mealie.
 */
export function useRecipeNutritionMapping(recipe: MealieRecipe | null, onSaved: (recipe: MealieRecipe) => void) {
  const { enabled: aiEnabled } = useCiqualAi()
  const [preview, setPreview] = useState<NutritionEstimate | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refreshPreview = useCallback(async () => {
    if (!recipe) return
    setPreviewing(true)
    try {
      setPreview(await estimateRecipeNutritionUseCase.execute(recipe))
    } catch (err) {
      setError(messageOf(err, "Impossible d'estimer la nutrition"))
    } finally {
      setPreviewing(false)
    }
  }, [recipe])

  useEffect(() => {
    void refreshPreview()
  }, [refreshPreview])

  const complete = useCallback(async (): Promise<boolean> => {
    if (!recipe) return false
    setCompleting(true)
    setError(null)
    setMessage(null)
    try {
      await classifyRecipeIngredientsUseCase.execute(recipe, { aiEnabled })
      await refreshPreview()
      return true
    } catch (err) {
      setError(messageOf(err, "Impossible de compléter avec CIQUAL"))
      return false
    } finally {
      setCompleting(false)
    }
  }, [recipe, aiEnabled, refreshPreview])

  const save = useCallback(async () => {
    if (!recipe) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const { estimate, recipe: updated } = await saveRecipeNutritionUseCase.execute(recipe)
      setPreview(estimate)
      onSaved(updated)
      setMessage("Nutrition recalculée et enregistrée.")
    } catch (err) {
      if (err instanceof NothingToEstimateError) setPreview(err.estimate)
      setError(messageOf(err, "Erreur pendant le recalcul nutrition"))
    } finally {
      setSaving(false)
    }
  }, [recipe, onSaved])

  return { aiEnabled, preview, previewing, completing, saving, error, message, refreshPreview, complete, save }
}
