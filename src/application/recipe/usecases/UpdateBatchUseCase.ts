import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import type { BatchInfo } from "../../../shared/utils/batch.ts"

/** Modifie le batch d'une recette (réglages ou stock) à partir de son état serveur. */
export class UpdateBatchUseCase {
  private readonly recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(slug: string, update: (current: BatchInfo) => BatchInfo): Promise<MealieRecipe> {
    return this.recipeRepository.updateBatch(slug, update)
  }
}
