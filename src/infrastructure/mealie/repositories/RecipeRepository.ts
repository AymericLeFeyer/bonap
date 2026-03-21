import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type {
  MealiePaginatedRecipes,
  MealieRawPaginatedRecipes,
  MealieRecipe,
  RecipeFilters,
} from "../../../shared/types/mealie.ts"
import { mealieApiClient } from "../api/index.ts"

export class RecipeRepository implements IRecipeRepository {
  async getAll(
    page = 1,
    perPage = 30,
    filters: RecipeFilters = {},
  ): Promise<MealiePaginatedRecipes> {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    })
    if (filters.search?.trim()) {
      params.set("search", filters.search.trim())
    }
    if (filters.categories?.length) {
      params.set("categories", filters.categories.join(","))
    }
    if (filters.tags?.length) {
      params.set("tags", filters.tags.join(","))
    }
    if (filters.maxTotalTime !== undefined) {
      params.set("maxTotalTime", String(filters.maxTotalTime))
    }
    const raw = await mealieApiClient.get<MealieRawPaginatedRecipes>(
      `/api/recipes?${params.toString()}`,
    )
    return {
      items: raw.items,
      total: raw.total,
      page: raw.page,
      perPage: raw.per_page,
      totalPages: raw.total_pages,
    }
  }

  async getBySlug(slug: string): Promise<MealieRecipe> {
    return mealieApiClient.get<MealieRecipe>(`/api/recipes/${slug}`)
  }

  async createFromUrl(url: string): Promise<string> {
    return mealieApiClient.post<string>("/api/recipes/create-url", { url })
  }
}
