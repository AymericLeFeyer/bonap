import { useState } from "react"
import { updateCalorieTagUseCase } from "../../infrastructure/container.ts"
import type { MealieRecipe } from "../../shared/types/mealie.ts"

export function useUpdateCalorieTag() {
  const [loading, setLoading] = useState(false)

  const updateCalorieTag = async (
    slug: string,
    calories: number,
  ): Promise<MealieRecipe | null> => {
    setLoading(true)

    try {
      return await updateCalorieTagUseCase.execute(slug, calories)
    } finally {
      setLoading(false)
    }
  }

  return { updateCalorieTag, loading }
}