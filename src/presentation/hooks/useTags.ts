import { useCallback, useEffect, useState } from "react"
import type { MealieTag } from "../../shared/types/mealie.ts"
import { GetTagsUseCase } from "../../application/organizer/usecases/GetTagsUseCase.ts"
import { TagRepository } from "../../infrastructure/mealie/repositories/TagRepository.ts"

const getTagsUseCase = new GetTagsUseCase(new TagRepository())

export function useTags() {
  const [tags, setTags] = useState<MealieTag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTagsUseCase.execute()
      setTags(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement tags")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTags()
  }, [fetchTags])

  return { tags, loading, error }
}
