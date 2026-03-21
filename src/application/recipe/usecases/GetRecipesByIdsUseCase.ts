import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"

export class GetRecipesByIdsUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  /**
   * Fetches the details of multiple recipes by their slug, in parallel.
   * Individual errors are silently ignored (recipe not found, deleted, etc.).
   */
  async execute(slugs: string[]): Promise<MealieRecipe[]> {
    const results = await Promise.allSettled(
      slugs.map((slug) => this.recipeRepository.getBySlug(slug)),
    )
    return results
      .filter((r): r is PromiseFulfilledResult<MealieRecipe> => r.status === "fulfilled")
      .map((r) => r.value)
  }
}
