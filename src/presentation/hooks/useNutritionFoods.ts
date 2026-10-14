import { useCallback, useEffect, useState } from "react"
import type {
  NutritionFood,
  NutritionFoodPatch,
  NutritionFoods,
} from "../../domain/nutrition/entities/NutritionFood.ts"
import { getNutritionFoodsUseCase, updateNutritionFoodUseCase } from "../../infrastructure/container.ts"

export type FoodEdit = Omit<NutritionFoodPatch, "key" | "origin">

/** Dictionnaire d'aliments partagé, avec les corrections de l'utilisateur. */
export function useNutritionFoods() {
  const [foods, setFoods] = useState<NutritionFoods>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setFoods(await getNutritionFoodsUseCase.execute())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le dictionnaire d'aliments")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const updateFood = useCallback(async (key: string, edit: FoodEdit): Promise<NutritionFood | null> => {
    setSavingKey(key)
    setError(null)
    try {
      const entry = await updateNutritionFoodUseCase.execute({ key, ...edit })
      setFoods((previous) => ({ ...previous, [key]: entry }))
      return entry
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer la fiche")
      return null
    } finally {
      setSavingKey(null)
    }
  }, [])

  return { foods, loading, savingKey, error, reload, updateFood }
}
