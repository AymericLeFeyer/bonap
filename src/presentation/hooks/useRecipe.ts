import { useCallback, useEffect, useState } from "react"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { GetRecipeUseCase } from "../../application/recipe/usecases/GetRecipeUseCase.ts"
import { RecipeRepository } from "../../infrastructure/mealie/repositories/RecipeRepository.ts"

const getRecipeUseCase = new GetRecipeUseCase(new RecipeRepository())

export function useRecipe(slug: string | undefined) {
  const [recipe, setRecipe] = useState<MealieRecipe | null>(null)
  const [loading, setLoading] = useState(!!slug)
  const [error, setError] = useState<string | null>(
    slug ? null : "Aucun slug fourni",
  )

  const fetchRecipe = useCallback(async (s: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecipeUseCase.execute(s)
      setRecipe(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (slug) {
      void fetchRecipe(slug)
    }
  }, [slug, fetchRecipe])

  return { recipe, setRecipe, loading, error }
}
