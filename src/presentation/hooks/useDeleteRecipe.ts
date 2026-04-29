import { useState } from "react"
import { deleteRecipeUseCase, recipeRepository } from "../../infrastructure/container.ts"

export function useDeleteRecipe() {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteRecipe = async (slug: string): Promise<boolean> => {
    setDeleting(true)
    setError(null)
    try {
      await deleteRecipeUseCase.execute(slug)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      return false
    } finally {
      setDeleting(false)
    }
  }

  const deleteImage = async (slug: string): Promise<boolean> => {
    try {
      await recipeRepository.deleteImage(slug)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      return false
    }
  }

  return { deleteRecipe, deleteImage, deleting, error }
}
