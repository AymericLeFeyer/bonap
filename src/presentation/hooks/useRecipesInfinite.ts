import { useCallback, useEffect, useRef, useState } from "react"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { GetRecipesUseCase } from "../../application/recipe/usecases/GetRecipesUseCase.ts"
import { RecipeRepository } from "../../infrastructure/mealie/repositories/RecipeRepository.ts"

const PER_PAGE = 30
const getRecipesUseCase = new GetRecipesUseCase(new RecipeRepository())

export function useRecipesInfinite(search: string) {
  const [recipes, setRecipes] = useState<MealieRecipe[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(1)
  const loadingRef = useRef(false)

  const reset = useCallback(() => {
    setRecipes([])
    setError(null)
    setHasMore(true)
    pageRef.current = 1
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    try {
      const data = await getRecipesUseCase.execute(pageRef.current, PER_PAGE)
      setRecipes((prev) => [...prev, ...data.items])
      setHasMore(pageRef.current < data.totalPages)
      pageRef.current += 1
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
      setHasMore(false)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [hasMore])

  // Rechargement quand la recherche change
  useEffect(() => {
    reset()
  }, [search, reset])

  // Charge la première page après reset
  useEffect(() => {
    if (recipes.length === 0 && hasMore && !loadingRef.current) {
      void loadMore()
    }
  }, [recipes.length, hasMore, loadMore])

  const filtered = search.trim()
    ? recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : recipes

  return { recipes: filtered, loading, error, hasMore, loadMore }
}
