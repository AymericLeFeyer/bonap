import { useState, useCallback } from "react"
import { getFavoritesUseCase } from "../../infrastructure/container.ts"
import type { MealieFavoritesResponse } from "../../shared/types/mealie.ts"

import {
    getFavoriteCache,
    isFavoriteCacheValid,
    setFavoriteCache,
} from "../cache/favoriteCache"

export function useGetFavorites() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getFavorites = useCallback(async (): Promise<MealieFavoritesResponse> => {
        setError(null)

        if (isFavoriteCacheValid()) {
            return getFavoriteCache() as MealieFavoritesResponse
        }

        setLoading(true)

        try {
            const data = await getFavoritesUseCase.execute()
            setFavoriteCache(data)

            return data
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Impossible de récupérer les favoris.",
            )

            return { ratings: [] }
        } finally {
            setLoading(false)
        }
    }, [])

    return { getFavorites, loading, error }
}