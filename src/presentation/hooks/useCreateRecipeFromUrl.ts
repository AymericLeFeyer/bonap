import { useState } from "react"
import { CreateRecipeFromUrlUseCase } from "../../application/recipe/usecases/CreateRecipeFromUrlUseCase.ts"
import { RecipeRepository } from "../../infrastructure/mealie/repositories/RecipeRepository.ts"

const createRecipeFromUrlUseCase = new CreateRecipeFromUrlUseCase(
  new RecipeRepository(),
)

export function useCreateRecipeFromUrl() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createFromUrl = async (url: string): Promise<string | null> => {
    setLoading(true)
    setError(null)
    try {
      const slug = await createRecipeFromUrlUseCase.execute(url)
      return slug
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'importer la recette. Vérifiez l'URL et réessayez.",
      )
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createFromUrl, loading, error }
}
