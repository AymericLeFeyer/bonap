import type { MealieNutrition } from "../../../shared/types/mealie.ts"

export type NutritionFoodStatus = "validated" | "auto" | "proposed" | "to-review" | "negligible"

export type NutritionFoodOrigin = "user" | "auto" | "ai" | "legacy"

export interface CiqualFood {
  code: string
  name: string
}

/** Fiche du dictionnaire d'aliments, partagée par toutes les recettes. */
export interface NutritionFood {
  ciqualCode: string | null
  ciqualName: string | null
  pieceWeight: number | null
  density: number | null
  negligible: boolean
  status: NutritionFoodStatus
  origin: NutritionFoodOrigin
  suggestions: CiqualFood[]
  updatedAt: string | null
}

export interface NutritionFoodPatch {
  key: string
  origin: NutritionFoodOrigin
  ciqualCode?: string | null
  pieceWeight?: number | null
  density?: number | null
  negligible?: boolean
  status?: NutritionFoodStatus
  suggestions?: string[]
}

export type NutritionFoods = Record<string, NutritionFood>

export interface NutritionIngredientInput {
  quantity: string
  unit: string
  unitAbbreviation?: string
  food: string
  note: string
}

export interface ClassifiedIngredient {
  key: string
  label: string
  entry: NutritionFood | null
  needsAi: boolean
  candidates: CiqualFood[]
  hasPieceQuantity: boolean
  needsPieceWeight: boolean
}

export type NutritionLineReason =
  | "negligible"
  | "vague-quantity"
  | "no-match"
  | "piece-weight-missing"
  | "unit-unknown"
  | "no-nutrients"

export interface NutritionEstimateLine {
  ingredient: string
  key: string
  status: NutritionFoodStatus
  ciqualCode: string | null
  ciqualName: string | null
  grams: number | null
  included: boolean
  negligible: boolean
  reason?: NutritionLineReason
  source: "ciqual" | "off" | null
}

export interface NutritionEstimate {
  source: string
  servings: number
  coverage: number
  estimatedGrams: number
  totalGrams: number
  lines: NutritionEstimateLine[]
  nutrition: MealieNutrition
}
