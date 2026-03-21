import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { RecipeFormData, MealieRecipe } from "../../../shared/types/mealie.ts"

export class UpdateRecipeUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(slug: string, data: RecipeFormData): Promise<MealieRecipe> {
    return this.recipeRepository.update(slug, data)
  }
}
