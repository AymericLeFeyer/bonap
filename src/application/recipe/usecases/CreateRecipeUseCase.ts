import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { RecipeFormData, MealieRecipe } from "../../../shared/types/mealie.ts"

export class CreateRecipeUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(data: RecipeFormData): Promise<MealieRecipe> {
    const slug = await this.recipeRepository.create(data.name)
    return this.recipeRepository.update(slug, data)
  }
}
