import { useState } from "react"
import { UpdateSeasonsUseCase } from "../../application/recipe/usecases/UpdateSeasonsUseCase.ts"
import { RecipeRepository } from "../../infrastructure/mealie/repositories/RecipeRepository.ts"
import type { MealieRecipe, Season } from "../../shared/types/mealie.ts"

const recipeRepository = new RecipeRepository()
const updateSeasonsUseCase = new UpdateSeasonsUseCase(recipeRepository)

export function useUpdateSeasons() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateSeasons = async (
    slug: string,
    seasons: Season[],
  ): Promise<MealieRecipe | null> => {
    setLoading(true)
    setError(null)
    try {
      return await updateSeasonsUseCase.execute(slug, seasons)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de mettre à jour la saison. Veuillez réessayer.",
      )
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateSeasons, loading, error }
}
