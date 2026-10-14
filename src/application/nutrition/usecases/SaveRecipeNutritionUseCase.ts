import type { NutritionEstimate } from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import type { EstimateRecipeNutritionUseCase } from "./EstimateRecipeNutritionUseCase.ts"

export interface SavedRecipeNutrition {
  estimate: NutritionEstimate
  recipe: MealieRecipe
}

export class NothingToEstimateError extends Error {
  readonly estimate: NutritionEstimate

  constructor(estimate: NutritionEstimate) {
    super("Aucun ingrédient n'a pu être estimé : la nutrition existante est conservée.")
    this.estimate = estimate
  }
}

/** Recalcule la nutrition d'une recette (par portion) et l'enregistre avec sa couverture. */
export class SaveRecipeNutritionUseCase {
  private readonly estimateRecipeNutrition: EstimateRecipeNutritionUseCase
  private readonly recipeRepository: IRecipeRepository

  constructor(estimateRecipeNutrition: EstimateRecipeNutritionUseCase, recipeRepository: IRecipeRepository) {
    this.estimateRecipeNutrition = estimateRecipeNutrition
    this.recipeRepository = recipeRepository
  }

  async execute(recipe: MealieRecipe): Promise<SavedRecipeNutrition> {
    const estimate = await this.estimateRecipeNutrition.execute(recipe)
    if (!estimate.lines.some((line) => line.included)) throw new NothingToEstimateError(estimate)
    const updated = await this.recipeRepository.updateNutrition(recipe.slug, estimate.nutrition, {
      source: estimate.source,
      coverage: estimate.coverage,
      perServing: true,
    })
    return { estimate, recipe: updated }
  }
}
