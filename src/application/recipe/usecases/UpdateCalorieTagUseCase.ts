import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"

export class UpdateCalorieTagUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(slug: string, calories: number): Promise<MealieRecipe> {
    return this.recipeRepository.updateCalorieTags(slug, calories)
  }
}