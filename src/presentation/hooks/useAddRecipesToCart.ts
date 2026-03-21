import { useCallback, useState } from "react"
import { ShoppingRepository } from "../../infrastructure/mealie/repositories/ShoppingRepository.ts"
import { AddRecipesToListUseCase } from "../../application/shopping/usecases/AddRecipesToListUseCase.ts"
import { GetShoppingItemsUseCase } from "../../application/shopping/usecases/GetShoppingItemsUseCase.ts"

const shoppingRepository = new ShoppingRepository()
const getItemsUseCase = new GetShoppingItemsUseCase(shoppingRepository)
const addRecipesUseCase = new AddRecipesToListUseCase(shoppingRepository)

export function useAddRecipesToCart() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const addRecipes = useCallback(async (recipeIds: string[]) => {
    if (recipeIds.length === 0) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { list } = await getItemsUseCase.execute()
      await addRecipesUseCase.execute(list.id, recipeIds)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout au panier")
    } finally {
      setLoading(false)
    }
  }, [])

  return { addRecipes, loading, error, success }
}
