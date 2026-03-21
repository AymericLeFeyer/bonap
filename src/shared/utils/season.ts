import type { MealieTag, Season } from "../types/mealie.ts"
import { SEASONS } from "../types/mealie.ts"

const SEASON_TAG_PREFIX = "saison-"

/**
 * Retourne la saison courante basée sur la date du jour.
 * Printemps : mars-mai (3-5)
 * Été : juin-août (6-8)
 * Automne : septembre-novembre (9-11)
 * Hiver : décembre-février (12, 1-2)
 */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return "printemps"
  if (month >= 6 && month <= 8) return "ete"
  if (month >= 9 && month <= 11) return "automne"
  return "hiver"
}

/**
 * Extrait les saisons d'une recette depuis ses tags Mealie.
 * Les tags de saison ont le préfixe "saison:" (ex: "saison:printemps").
 */
export function getRecipeSeasonsFromTags(tags: MealieTag[] | undefined): Season[] {
  if (!tags?.length) return []
  return tags
    .map((t) => t.name)
    .filter((name) => name.startsWith(SEASON_TAG_PREFIX))
    .map((name) => name.slice(SEASON_TAG_PREFIX.length))
    .filter((s): s is Season => SEASONS.includes(s as Season))
}

/**
 * Indique si un tag est un tag de saison (préfixe "saison:").
 */
export function isSeasonTag(tag: MealieTag): boolean {
  return tag.name.startsWith(SEASON_TAG_PREFIX)
}
