import type { MealieFavoritesResponse } from "../../shared/types/mealie"

let cache: MealieFavoritesResponse | null = null
let lastFetch = 0

const TTL = 15 * 60 * 1000 // 15 minutes

export function getFavoriteCache() {
  return cache
}

export function isFavoriteCacheValid() {
  return cache !== null && Date.now() - lastFetch < TTL
}

export function setFavoriteCache(data: MealieFavoritesResponse) {
  cache = data
  lastFetch = Date.now()
}

export function invalidateFavoriteCache() {
  cache = null
  lastFetch = 0
}