import { useCallback, useEffect, useState } from "react"
import type { MealieCategory } from "../../shared/types/mealie.ts"
import { GetCategoriesUseCase } from "../../application/organizer/usecases/GetCategoriesUseCase.ts"
import { CategoryRepository } from "../../infrastructure/mealie/repositories/CategoryRepository.ts"

const getCategoriesUseCase = new GetCategoriesUseCase(new CategoryRepository())

export function useCategories() {
  const [categories, setCategories] = useState<MealieCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCategoriesUseCase.execute()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement catégories")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

  return { categories, loading, error }
}
