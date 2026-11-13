import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { BatchAdvice, BatchCandidate, IBatchAdvisor } from "../../../domain/recipe/services/IBatchAdvisor.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import { isBatchRecipe } from "../../../shared/utils/batch.ts"
import { isSeasonTag } from "../../../shared/utils/season.ts"
import { isCalorieTag } from "../../../shared/utils/calorie.ts"
import { recipeHasCourse } from "../../../shared/utils/course.ts"

const PER_PAGE = 100
/** Recettes par appel IA : assez pour limiter les appels, assez peu pour une réponse fiable. */
const CHUNK_SIZE = 80

export interface BatchSuggestion extends BatchAdvice {
  recipe: MealieRecipe
}

export interface SuggestBatchOptions {
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

/**
 * Propose, parmi les plats pas encore marqués batch, ceux qui s'y prêtent,
 * avec des durées de conservation. N'écrit rien : l'utilisateur valide.
 */
export class SuggestBatchRecipesUseCase {
  private readonly recipeRepository: IRecipeRepository
  private readonly advisor: IBatchAdvisor

  constructor(recipeRepository: IRecipeRepository, advisor: IBatchAdvisor) {
    this.recipeRepository = recipeRepository
    this.advisor = advisor
  }

  async execute(options: SuggestBatchOptions = {}): Promise<BatchSuggestion[]> {
    const recipes = (await this.loadAll(options.signal))
      .filter((r) => !isBatchRecipe(r) && recipeHasCourse(r, "plat"))
    const bySlug = new Map(recipes.map((r) => [r.slug, r]))
    const suggestions: BatchSuggestion[] = []
    options.onProgress?.(0, recipes.length)
    for (let start = 0; start < recipes.length; start += CHUNK_SIZE) {
      options.signal?.throwIfAborted()
      const chunk = recipes.slice(start, start + CHUNK_SIZE)
      const advice = await this.advisor.adviseBatchRecipes(chunk.map(toCandidate))
      for (const a of advice) {
        const recipe = bySlug.get(a.slug)
        if (recipe) suggestions.push({ ...a, recipe })
      }
      options.onProgress?.(Math.min(start + CHUNK_SIZE, recipes.length), recipes.length)
    }
    return suggestions.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name, "fr"))
  }

  private async loadAll(signal?: AbortSignal): Promise<MealieRecipe[]> {
    const all: MealieRecipe[] = []
    let page = 1
    let totalPages = 1
    do {
      signal?.throwIfAborted()
      const result = await this.recipeRepository.getAll(page, PER_PAGE)
      all.push(...result.items)
      totalPages = result.totalPages
      page += 1
    } while (page <= totalPages)
    return all
  }
}

function toCandidate(recipe: MealieRecipe): BatchCandidate {
  return {
    slug: recipe.slug,
    name: recipe.name,
    labels: [
      ...(recipe.recipeCategory ?? []).map((c) => c.name),
      ...(recipe.tags ?? []).filter((t) => !isSeasonTag(t) && !isCalorieTag(t)).map((t) => t.name),
    ].slice(0, 6),
  }
}
