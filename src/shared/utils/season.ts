import type { MealieTag, Season } from "../types/mealie.ts"
import { SEASONS } from "../types/mealie.ts"

const SEASON_TAG_PREFIX = "saison-"

/**
 * Returns the current season based on today's date.
 * Spring: March–May (3–5)
 * Summer: June–August (6–8)
 * Autumn: September–November (9–11)
 * Winter: December–February (12, 1–2)
 */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1 // 1-12
  if (month >= 3 && month <= 5) return "printemps"
  if (month >= 6 && month <= 8) return "ete"
  if (month >= 9 && month <= 11) return "automne"
  return "hiver"
}

/**
 * Extracts seasons from a recipe's Mealie tags.
 * Season tags use the prefix "saison-" (e.g. "saison-printemps").
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
 * Returns true if the tag is a season tag (prefix "saison:").
 */
export function isSeasonTag(tag: MealieTag): boolean {
  return tag.name.startsWith(SEASON_TAG_PREFIX)
}
