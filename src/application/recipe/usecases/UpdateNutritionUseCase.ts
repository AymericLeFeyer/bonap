import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieNutrition, MealieRecipe } from "../../../shared/types/mealie.ts"

export class UpdateNutritionUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(
    slug: string,
    nutrition: MealieNutrition,
    source?: string,
    ciqualMappings?: Record<string, string>,
  ): Promise<MealieRecipe> {
    return this.recipeRepository.updateNutrition(slug, nutrition, source, ciqualMappings)
  }
}
