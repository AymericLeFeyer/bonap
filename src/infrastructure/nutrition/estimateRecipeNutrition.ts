import type { MealieNutrition, RecipeFormIngredient } from "../../shared/types/mealie.ts"
import { getIngressBasename } from "../../shared/utils/env.ts"

export interface CiqualFoodOption {
  code: string
  name: string
}

export interface NutritionEstimateResult {
  source: string
  matchedCount: number
  unmatchedCount: number
  matches: Array<{
    ingredient: string
    ciqualFood: string
    amountGrams: number
    source?: "ciqual" | "off"
    viaHint?: boolean
  }>
  unmatched: Array<{
    ingredient: string
    matchedFood?: string
    reason: string
    suggestions?: string[]
  }>
  ciqualMappings: Record<string, string>
  nutrition: MealieNutrition
}

export async function estimateRecipeNutrition(
  ingredients: RecipeFormIngredient[],
  matchHints?: Record<string, string>,
): Promise<NutritionEstimateResult> {
  const response = await fetch(`${getIngressBasename()}/api/bonap/nutrition-estimate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ingredients, matchHints }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`Estimation nutrition ${response.status}: ${text}`)
  }

  return response.json() as Promise<NutritionEstimateResult>
}

export async function searchCiqualFoods(query: string, limit = 20): Promise<CiqualFoodOption[]> {
  const q = query.trim()
  if (!q) return []

  const url = new URL(`${getIngressBasename()}/api/bonap/ciqual/search`, window.location.origin)
  url.searchParams.set("q", q)
  url.searchParams.set("limit", String(limit))

  const response = await fetch(url.toString())
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(`Recherche CIQUAL ${response.status}: ${text}`)
  }

  const data = await response.json() as { items?: CiqualFoodOption[] }
  return Array.isArray(data.items) ? data.items : []
}
