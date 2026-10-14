import type { NutritionIngredientInput } from "../../domain/nutrition/entities/NutritionFood.ts"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { NUTRITION_EXTRAS } from "../../shared/utils/nutritionCoverage.ts"
import { getRecipeServings } from "../../shared/utils/servings.ts"

export function toNutritionIngredients(recipe: MealieRecipe): NutritionIngredientInput[] {
  return (recipe.recipeIngredient ?? [])
    .map((ingredient) => ({
      quantity: ingredient.quantity ? String(ingredient.quantity) : "",
      unit: ingredient.unit?.name?.trim() ?? "",
      unitAbbreviation: ingredient.unit?.abbreviation?.trim() ?? "",
      food: ingredient.food?.name?.trim() ?? "",
      note: ingredient.note?.trim() ?? "",
    }))
    .filter((ingredient) => ingredient.food || ingredient.note)
}

export function recipeServingsOrOne(recipe: MealieRecipe): number {
  return getRecipeServings(recipe) ?? 1
}

/** Correspondances enregistrées par recette avant le dictionnaire d'aliments. */
export function readLegacyCiqualMappings(recipe: MealieRecipe): Record<string, string> {
  const raw = recipe.extras?.[NUTRITION_EXTRAS.legacyCiqualMappings]
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    )
  } catch {
    return {}
  }
}
