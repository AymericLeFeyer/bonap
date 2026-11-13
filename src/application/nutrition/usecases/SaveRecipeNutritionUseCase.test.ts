import { describe, expect, it, vi } from "vitest"
import type { NutritionEstimate } from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import type { EstimateRecipeNutritionUseCase } from "./EstimateRecipeNutritionUseCase.ts"
import { SaveRecipeNutritionUseCase } from "./SaveRecipeNutritionUseCase.ts"

const recipe = { id: "1", slug: "dal", name: "Dal" } as MealieRecipe

function setup(estimate: Partial<NutritionEstimate>) {
  const full: NutritionEstimate = {
    source: "ANSES CIQUAL 2020",
    servings: 2,
    coverage: 0.9,
    estimatedGrams: 300,
    totalGrams: 330,
    lines: [{ ingredient: "lentille", key: "lentille", status: "validated", ciqualCode: "20504", ciqualName: "Lentille", grams: 300, included: true, negligible: false, source: "ciqual" }],
    nutrition: { calories: "500 kcal" },
    ...estimate,
  }
  const estimator = { execute: vi.fn().mockResolvedValue(full) } as unknown as EstimateRecipeNutritionUseCase
  const updateNutrition = vi.fn().mockResolvedValue(recipe)
  const repo = { updateNutrition } as unknown as IRecipeRepository
  return { useCase: new SaveRecipeNutritionUseCase(estimator, repo), updateNutrition }
}

describe("SaveRecipeNutritionUseCase", () => {
  it("transmet les micronutriments assez couverts, et null pour les autres", async () => {
    const { useCase, updateNutrition } = setup({
      micronutrients: { iron: { perServing: 6.5, coverage: 0.91 }, iodine: { perServing: 1, coverage: 0.2 } },
    })
    await useCase.execute(recipe)
    const micros = updateNutrition.mock.calls[0][2].micronutrients
    expect(micros.nutritionIronMg).toBe(6.5)
    expect(micros.nutritionIodineUg).toBeNull()
  })
})
