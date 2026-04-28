import type { MealieRecipe } from "../types/mealie.ts"

export const EXTRAS_EMOJI_KEY = "bonap_emoji"
export const SIMPLE_RECIPE_TAG_SLUG = "simple"

export const FOOD_EMOJIS = [
  "🍕", "🍝", "🥗", "🍲", "🥘", "🍛", "🍜", "🥩", "🐟", "🥦",
  "🍳", "🥚", "🧆", "🫕", "🥙", "🌮", "🫔", "🥪", "🍱", "🥫",
  "🍖", "🍗", "🥓", "🫛", "🥕", "🧅", "🧄", "🌽", "🍅", "🥑",
  "🫚", "🧇", "🥞", "🫓", "🥐", "🍞", "🥨", "🧀", "🐠", "🦐",
]

export function randomFoodEmoji(): string {
  return FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)]
}

export function getRecipeEmoji(recipe: Pick<MealieRecipe, "extras">): string | null {
  return recipe.extras?.[EXTRAS_EMOJI_KEY] ?? null
}

export function isSimpleRecipe(recipe: Pick<MealieRecipe, "tags">): boolean {
  return recipe.tags?.some((t) => t.slug === SIMPLE_RECIPE_TAG_SLUG) ?? false
}
