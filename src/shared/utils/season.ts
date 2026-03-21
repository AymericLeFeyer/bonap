import type { Season } from "../types/mealie.ts"

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
 * Sérialise une liste de saisons en chaîne pour le champ extras.saison de Mealie.
 * Ex: ["ete", "automne"] => "ete,automne"
 */
export function seasonsToExtras(seasons: Season[]): string {
  return seasons.join(",")
}

/**
 * Désérialise la chaîne extras.saison en liste de saisons.
 * Ex: "ete,automne" => ["ete", "automne"]
 */
export function extrasToSeasons(value: string | undefined): Season[] {
  if (!value) return []
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Season =>
      ["printemps", "ete", "automne", "hiver"].includes(s),
    )
}

/**
 * Extrait les saisons d'une recette Mealie depuis le champ extras.
 */
export function getRecipeSeasons(
  extras: Record<string, string> | undefined,
): Season[] {
  return extrasToSeasons(extras?.saison)
}
