import { useState } from "react"
import { toggleFavoriteUseCase } from "../../infrastructure/container.ts"
import { invalidateFavoriteCache } from "../cache/favoriteCache"

export function useToggleFavorite() {
  const [loading, setLoading] = useState(false)

  const toggleFavorite = async (
    slug: string,
    isFavorite: boolean
  ): Promise<boolean> => {
    setLoading(true)

    try {
      await toggleFavoriteUseCase.execute(slug, isFavorite)

      invalidateFavoriteCache()

      return true
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }

  return { toggleFavorite, loading }
}