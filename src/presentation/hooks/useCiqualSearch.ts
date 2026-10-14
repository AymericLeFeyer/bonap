import { useCallback, useState } from "react"
import type { CiqualFood } from "../../domain/nutrition/entities/NutritionFood.ts"
import { searchCiqualFoodsUseCase } from "../../infrastructure/container.ts"

export function useCiqualSearch() {
  const [results, setResults] = useState<CiqualFood[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string) => {
    setSearching(true)
    setError(null)
    try {
      setResults(await searchCiqualFoodsUseCase.execute(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de rechercher dans CIQUAL")
    } finally {
      setSearching(false)
    }
  }, [])

  return { results, searching, error, search }
}
