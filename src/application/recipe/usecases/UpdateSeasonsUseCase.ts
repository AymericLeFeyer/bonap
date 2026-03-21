import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieRecipe, Season } from "../../../shared/types/mealie.ts"

export class UpdateSeasonsUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(slug: string, seasons: Season[]): Promise<MealieRecipe> {
    return this.recipeRepository.updateSeasons(slug, seasons)
  }
}
