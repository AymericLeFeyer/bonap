import type { MealieRecipe } from "../types/mealie.ts"
import { recipeEmojiStore } from "../../infrastructure/recipe/RecipeEmojiStore.ts"

export const EXTRAS_EMOJI_KEY = "bonap_emoji"
export const SIMPLE_RECIPE_TAG_SLUG = "simple"

export const FOOD_EMOJIS = [
  "🍕", "🍝", "🥗", "🍲", "🥘", "🍛", "🍜", "🥩", "🐟", "🥦",
  "🍳", "🥚", "🧆", "🫕", "🥙", "🌮", "🫔", "🥪", "🍱", "🥫",
  "🍖", "🍗", "🥓", "🫛", "🥕", "🧅", "🧄", "🌽", "🍅", "🥑",
  "🫚", "🧇", "🥞", "🫓", "🥐", "🍞", "🥨", "🧀", "🐠", "🦐",
]

// Détecte si un emoji est rendu visuellement par le système (pixels colorés sur canvas).
// Les emojis non supportés s'affichent en carré blanc (tofu) sans pixel coloré.
function isEmojiRendered(emoji: string): boolean {
  try {
    const canvas = document.createElement("canvas")
    canvas.width = 20
    canvas.height = 20
    const ctx = canvas.getContext("2d")
    if (!ctx) return true
    ctx.font = "16px serif"
    ctx.fillText(emoji, 0, 16)
    const { data } = ctx.getImageData(0, 0, 20, 20)
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
      // Pixel coloré et non-transparent = emoji rendu correctement
      if (a > 10 && (Math.abs(r - g) > 10 || Math.abs(r - b) > 10 || Math.abs(g - b) > 10)) return true
    }
    return false
  } catch {
    return true
  }
}

let _supportedEmojis: string[] | null = null

export function getSupportedFoodEmojis(): string[] {
  if (_supportedEmojis) return _supportedEmojis
  _supportedEmojis = FOOD_EMOJIS.filter(isEmojiRendered)
  return _supportedEmojis
}

export function getUnsupportedEmojiCount(): number {
  return FOOD_EMOJIS.length - getSupportedFoodEmojis().length
}

export function randomFoodEmoji(): string {
  const supported = getSupportedFoodEmojis()
  const list = supported.length > 0 ? supported : FOOD_EMOJIS
  return list[Math.floor(Math.random() * list.length)]
}

export function getRecipeEmoji(recipe: Pick<MealieRecipe, "id" | "extras">): string | null {
  return recipe.extras?.[EXTRAS_EMOJI_KEY] ?? recipeEmojiStore.get(recipe.id) ?? null
}

export function isSimpleRecipe(recipe: Pick<MealieRecipe, "tags">): boolean {
  return recipe.tags?.some((t) => t.slug === SIMPLE_RECIPE_TAG_SLUG) ?? false
}
