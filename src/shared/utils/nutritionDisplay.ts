import type { MealieNutrition, MealieRecipe } from "../types/mealie.ts"
import { isNutritionPerServing } from "./nutritionCoverage.ts"
import { getRecipeServings } from "./servings.ts"

type DisplayedField = "calories" | "proteinContent" | "carbohydrateContent" | "fatContent" | "fiberContent"

export type DisplayedNutrition = Partial<Record<DisplayedField, number>>

export const NUTRITION_FACTS: { field: DisplayedField; suffix: string }[] = [
  { field: "calories", suffix: " kcal" },
  { field: "proteinContent", suffix: "g protéines" },
  { field: "carbohydrateContent", suffix: "g glucides" },
  { field: "fatContent", suffix: "g lipides" },
  { field: "fiberContent", suffix: "g fibres" },
]

function parseNutritionNumber(value?: string | null): number | null {
  const match = String(value ?? "").match(/-?\d+(?:[.,]\d+)?/)
  if (!match) return null
  const number = Number.parseFloat(match[0].replace(",", "."))
  return Number.isFinite(number) ? number : null
}

function perServingFactor(recipe: Pick<MealieRecipe, "extras" | "recipeServings" | "recipeYieldQuantity" | "recipeYield">): number {
  if (isNutritionPerServing(recipe)) return 1
  const recipeServings = getRecipeServings(recipe)
  return recipeServings && recipeServings > 0 ? 1 / recipeServings : 1
}

/**
 * Nutrition pour le nombre de portions choisi. Les nutritions anciennes sont
 * des totaux de recette : elles sont d'abord ramenées à une portion.
 */
export function nutritionForServings(
  recipe: Pick<MealieRecipe, "nutrition" | "extras" | "recipeServings" | "recipeYieldQuantity" | "recipeYield">,
  servings: number,
): DisplayedNutrition {
  const nutrition: MealieNutrition = recipe.nutrition ?? {}
  const factor = perServingFactor(recipe) * (servings > 0 ? servings : 1)
  const result: DisplayedNutrition = {}
  for (const { field } of NUTRITION_FACTS) {
    const value = parseNutritionNumber(nutrition[field])
    if (value !== null) result[field] = Math.round(value * factor * 10) / 10
  }
  return result
}
