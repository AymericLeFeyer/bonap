import { useCallback, useEffect, useState } from "react"
import type { MealieTag } from "../../shared/types/mealie.ts"
import { mealieApiClient } from "../../infrastructure/mealie/api/index.ts"

interface RawTagsResponse {
  items: MealieTag[]
}

export function useTags() {
  const [tags, setTags] = useState<MealieTag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = useCallback(async () => {
    setLoading(true)
    try {
      const data = await mealieApiClient.get<RawTagsResponse>("/api/organizers/tags")
      setTags(data.items)
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
