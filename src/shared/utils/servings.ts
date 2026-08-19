/** Parse "4", "4 personnes", "pour 4", "4-6 personnes" → first number found */
export function parseServings(recipeYield?: string): number | undefined {
  if (!recipeYield) return undefined
  const m = recipeYield.match(/\d+/)
  return m ? parseInt(m[0], 10) : undefined
}

/**
 * Reads the base servings of a Mealie recipe.
 * Mealie exposes three related fields and Bonap historically only parsed the
 * text one, which lost the count when the numeric fields were used.
 *
 * Priority:
 *   1. recipeServings (numeric, written by Bonap and most modern Mealie clients)
 *   2. recipeYieldQuantity (numeric, alternative yield count)
 *   3. parseServings(recipeYield) (legacy text fallback for older recipes)
 */
export function getRecipeServings(recipe: {
  recipeServings?: number
  recipeYieldQuantity?: number
  recipeYield?: string
} | undefined | null): number | undefined {
  if (!recipe) return undefined
  if (recipe.recipeServings && recipe.recipeServings > 0) return recipe.recipeServings
  if (recipe.recipeYieldQuantity && recipe.recipeYieldQuantity > 0) return recipe.recipeYieldQuantity
  return parseServings(recipe.recipeYield)
}

/**
 * Encodes servings count as a prefix in the meal text field.
 * Format: "[s:4]user note here"
 */
export function encodeServingsInText(servings: number | undefined, note: string): string {
  if (!servings || servings <= 0) return note
  return `[s:${servings}]${note}`
}

/**
 * Decodes "[s:4]user note here" → { servings: 4, note: "user note here" }
 * Falls back to { servings: undefined, note: text } if no prefix found.
 */
export function decodeServingsFromText(text?: string): { servings: number | undefined; note: string } {
  if (!text) return { servings: undefined, note: "" }
  const m = text.match(/^\[s:(\d+)\]([\s\S]*)$/)
  if (m) return { servings: parseInt(m[1], 10), note: m[2] }
  return { servings: undefined, note: text }
}

/** Format a quantity for display (round to 1 decimal, strip trailing .0) */
export function formatQuantity(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded)
}
