import type { MealieRecipe } from "../types/mealie.ts"

export const NUTRITION_EXTRAS = {
  source: "nutritionSource",
  estimatedAt: "nutritionEstimatedAt",
  coverage: "nutritionCoverage",
  perServing: "nutritionPerServing",
  legacyCiqualMappings: "nutritionCiqualMappings",
} as const

export type CoverageLevel = "reliable" | "partial" | "unreliable"

export const RELIABLE_COVERAGE = 0.9
export const PLANNABLE_COVERAGE = 0.7

export function coverageLevel(coverage: number): CoverageLevel {
  if (coverage >= RELIABLE_COVERAGE) return "reliable"
  if (coverage >= PLANNABLE_COVERAGE) return "partial"
  return "unreliable"
}

/** Couverture enregistrée avec la nutrition, ou null pour une nutrition antérieure. */
export function readNutritionCoverage(recipe: Pick<MealieRecipe, "extras">): number | null {
  const raw = recipe.extras?.[NUTRITION_EXTRAS.coverage]
  if (raw === undefined || raw === "") return null
  const coverage = Number.parseFloat(raw)
  return Number.isFinite(coverage) ? coverage : null
}

/** Les nutritions antérieures à la couverture étaient enregistrées pour la recette entière. */
export function isNutritionPerServing(recipe: Pick<MealieRecipe, "extras">): boolean {
  return recipe.extras?.[NUTRITION_EXTRAS.perServing] === "true"
}

export function isNutritionPlannable(recipe: Pick<MealieRecipe, "extras">): boolean {
  const coverage = readNutritionCoverage(recipe)
  return coverage === null || coverage >= PLANNABLE_COVERAGE
}
