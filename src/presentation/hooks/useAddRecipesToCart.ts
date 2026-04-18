import { useCallback, useState } from "react"
import {
  getShoppingItemsUseCase,
  addRecipesToListUseCase,
  getRecipesByIdsUseCase,
} from "../../infrastructure/container.ts"

interface MealEntry {
  slug: string
  recipeName: string
  date?: string
  servingsRatio?: number
}

export function useAddRecipesToCart() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const addRecipes = useCallback(async (meals: MealEntry[]) => {
    if (meals.length === 0) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { list } = await getShoppingItemsUseCase.execute()
      const recipes = await getRecipesByIdsUseCase.execute(meals.map((m) => m.slug))
      const entries = meals
        .map(({ slug, recipeName, date }) => {
          const recipe = recipes.find((r) => r.slug === slug)
          if (!recipe) return null
          return { recipeName, recipeSlug: slug, ingredients: recipe.recipeIngredient ?? [], date }
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
      await addRecipesToListUseCase.execute(list.id, entries)
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
