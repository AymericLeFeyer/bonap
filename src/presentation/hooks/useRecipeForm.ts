import { useState } from "react"
import { CreateRecipeUseCase } from "../../application/recipe/usecases/CreateRecipeUseCase.ts"
import { UpdateRecipeUseCase } from "../../application/recipe/usecases/UpdateRecipeUseCase.ts"
import { RecipeRepository } from "../../infrastructure/mealie/repositories/RecipeRepository.ts"
import type { MealieRecipe, RecipeFormData } from "../../shared/types/mealie.ts"

const recipeRepository = new RecipeRepository()
const createRecipeUseCase = new CreateRecipeUseCase(recipeRepository)
const updateRecipeUseCase = new UpdateRecipeUseCase(recipeRepository)

export function useRecipeForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRecipe = async (data: RecipeFormData): Promise<MealieRecipe | null> => {
    setLoading(true)
    setError(null)
    try {
      return await createRecipeUseCase.execute(data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de créer la recette. Veuillez réessayer.",
      )
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateRecipe = async (slug: string, data: RecipeFormData): Promise<MealieRecipe | null> => {
    setLoading(true)
    setError(null)
    try {
      return await updateRecipeUseCase.execute(slug, data)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier la recette. Veuillez réessayer.",
      )
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createRecipe, updateRecipe, loading, error }
}
