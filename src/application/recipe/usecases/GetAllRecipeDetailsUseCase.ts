import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"

const RECIPES_PER_PAGE = 100
const DETAIL_CONCURRENCY = 6

export interface GetAllRecipeDetailsOptions {
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

/**
 * Charge le détail de toutes les recettes. La liste paginée de Mealie ne
 * renvoie ni la nutrition ni les extras : il faut relire chaque recette.
 */
export class GetAllRecipeDetailsUseCase {
  private readonly recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(options: GetAllRecipeDetailsOptions = {}): Promise<MealieRecipe[]> {
    const summaries = await this.loadSummaries(options.signal)
    const recipes: MealieRecipe[] = []
    for (let start = 0; start < summaries.length; start += DETAIL_CONCURRENCY) {
      options.signal?.throwIfAborted()
      const batch = summaries.slice(start, start + DETAIL_CONCURRENCY)
      recipes.push(...await Promise.all(batch.map((summary) => this.recipeRepository.getBySlug(summary.slug))))
      options.onProgress?.(recipes.length, summaries.length)
    }
    return recipes
  }

  private async loadSummaries(signal?: AbortSignal): Promise<MealieRecipe[]> {
    const summaries: MealieRecipe[] = []
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await this.recipeRepository.getAll(page, RECIPES_PER_PAGE)
      summaries.push(...result.items)
      totalPages = result.totalPages
      page += 1
    } while (page <= totalPages)
    return summaries
  }
}
