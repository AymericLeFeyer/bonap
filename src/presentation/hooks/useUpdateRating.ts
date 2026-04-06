import { useState } from "react"
import { updateRatingUseCase } from "../../infrastructure/container.ts"

export function useUpdateRating() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateRating = async (slug: string, rating: number) => {
    setLoading(true)
    setError(null)

    try {
      await updateRatingUseCase.execute(slug, rating)
      return true
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de mettre à jour la note.",
      )
      return false
    } finally {
      setLoading(false)
    }
  }

  return { updateRating, loading, error }
}