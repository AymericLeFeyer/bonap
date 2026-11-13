import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import { BATCH_TAG, isBatchRecipe } from "../../../shared/utils/batch.ts"

const PER_PAGE = 100
const DETAIL_CONCURRENCY = 6

/**
 * Recettes taguées batch, en détail : la liste paginée de Mealie ne renvoie
 * pas les extras, où vivent les durées de conservation et le stock.
 */
export class GetBatchRecipesUseCase {
  private readonly recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(): Promise<MealieRecipe[]> {
    const summaries: MealieRecipe[] = []
    let page = 1
    let totalPages = 1
    do {
      const result = await this.recipeRepository.getAll(page, PER_PAGE, { tags: [BATCH_TAG] })
      // Filtre local en plus : selon la version, Mealie peut ignorer un tag inconnu.
      summaries.push(...result.items.filter(isBatchRecipe))
      totalPages = result.totalPages
      page += 1
    } while (page <= totalPages)

    const recipes: MealieRecipe[] = []
    for (let start = 0; start < summaries.length; start += DETAIL_CONCURRENCY) {
      const chunk = summaries.slice(start, start + DETAIL_CONCURRENCY)
      recipes.push(...await Promise.all(chunk.map((s) => this.recipeRepository.getBySlug(s.slug))))
    }
    return recipes.sort((a, b) => a.name.localeCompare(b.name, "fr"))
  }
}
