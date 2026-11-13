import type { MicronutrientEstimate, MicronutrientField } from "../../domain/nutrition/entities/NutritionFood.ts"
import type { MealieRecipe } from "../types/mealie.ts"
import { NUTRITION_EXTRAS, PLANNABLE_COVERAGE, isNutritionPerServing } from "./nutritionCoverage.ts"

export interface MicronutrientDefinition {
  field: MicronutrientField
  extrasKey: string
  label: string
  unit: "mg" | "µg" | "g"
  digits: number
}

export const MICRONUTRIENTS: MicronutrientDefinition[] = [
  { field: "iron", extrasKey: NUTRITION_EXTRAS.ironMg, label: "Fer", unit: "mg", digits: 1 },
  { field: "calcium", extrasKey: NUTRITION_EXTRAS.calciumMg, label: "Calcium", unit: "mg", digits: 0 },
  { field: "zinc", extrasKey: NUTRITION_EXTRAS.zincMg, label: "Zinc", unit: "mg", digits: 1 },
  { field: "iodine", extrasKey: NUTRITION_EXTRAS.iodineUg, label: "Iode", unit: "µg", digits: 0 },
  { field: "vitaminD", extrasKey: NUTRITION_EXTRAS.vitaminDUg, label: "Vitamine D", unit: "µg", digits: 1 },
  { field: "vitaminB12", extrasKey: NUTRITION_EXTRAS.vitaminB12Ug, label: "Vitamine B12", unit: "µg", digits: 2 },
  { field: "ala", extrasKey: NUTRITION_EXTRAS.alaG, label: "Oméga-3 (ALA)", unit: "g", digits: 2 },
]

/**
 * Couverture minimale pour enregistrer un micronutriment. En dessous, la
 * valeur ne compterait qu'une petite partie de la recette et passerait pour
 * un vrai total : elle est retirée et s'affiche « non renseigné ».
 */
export const MICRONUTRIENT_MIN_COVERAGE = PLANNABLE_COVERAGE

/**
 * Valeurs à écrire dans les extras, par clé. Toujours les sept clés : `null`
 * retire une valeur trop peu couverte ou absente de l'estimation.
 */
export function micronutrientsToStore(
  estimates: Partial<Record<MicronutrientField, MicronutrientEstimate>> | undefined,
): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  for (const { field, extrasKey } of MICRONUTRIENTS) {
    const estimate = estimates?.[field]
    const usable = estimate
      && Number.isFinite(estimate.perServing)
      && Number.isFinite(estimate.coverage)
      && estimate.coverage >= MICRONUTRIENT_MIN_COVERAGE
    result[extrasKey] = usable ? estimate.perServing : null
  }
  return result
}

export interface DisplayedMicronutrient extends MicronutrientDefinition {
  /** `null` = non renseigné, à ne jamais confondre avec 0. */
  value: number | null
}

function readExtrasNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : null
}

/**
 * Micronutriments pour le nombre de portions choisi, ou `null` si la recette
 * n'en a aucun (nutrition antérieure à l'issue #201, ou non par portion).
 */
export function micronutrientsForServings(
  recipe: Pick<MealieRecipe, "extras">,
  servings: number,
): DisplayedMicronutrient[] | null {
  if (!isNutritionPerServing(recipe)) return null
  const factor = servings > 0 ? servings : 1
  const rows = MICRONUTRIENTS.map((definition) => {
    const perServing = readExtrasNumber(recipe.extras?.[definition.extrasKey])
    const scale = 10 ** definition.digits
    const value = perServing === null ? null : Math.round(perServing * factor * scale) / scale
    return { ...definition, value }
  })
  return rows.some((row) => row.value !== null) ? rows : null
}
