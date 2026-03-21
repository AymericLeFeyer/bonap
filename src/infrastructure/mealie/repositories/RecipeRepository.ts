import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type {
  MealiePaginatedRecipes,
  MealieRawPaginatedRecipes,
  MealieRecipe,
  RecipeFilters,
  RecipeFormData,
  Season,
} from "../../../shared/types/mealie.ts"
import { isSeasonTag, seasonsToTagObjects } from "../../../shared/utils/season.ts"
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
    const response = await mealieApiClient.post<string | { slug: string }>("/api/recipes/create-url", { url })
    return typeof response === "string" ? response : response.slug
  }

  async create(name: string): Promise<string> {
    const response = await mealieApiClient.post<string | { slug: string }>("/api/recipes", { name })
    return typeof response === "string" ? response : response.slug
  }

  async update(slug: string, data: RecipeFormData): Promise<MealieRecipe> {
    const current = await this.getBySlug(slug)
    const nonSeasonTags = (current.tags ?? [])
      .filter((t) => !isSeasonTag(t))
      .map((t) => ({ name: t.name, slug: t.slug }))

    const payload = {
      name: data.name,
      description: data.description || undefined,
      prepTime: data.prepTime || undefined,
      recipeIngredient: data.recipeIngredient.map((ing) => ({
        quantity: ing.quantity ? parseFloat(ing.quantity) : undefined,
        unit: ing.unit ? { name: ing.unit } : undefined,
        food: ing.food ? { name: ing.food } : undefined,
        note: ing.note || undefined,
      })),
      recipeInstructions: data.recipeInstructions
        .filter((step) => step.text.trim())
        .map((step, i) => ({
          id: String(i),
          text: step.text,
        })),
      tags: [...nonSeasonTags, ...seasonsToTagObjects(data.seasons)],
    }
    return mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, payload)
  }

  async updateSeasons(slug: string, seasons: Season[]): Promise<MealieRecipe> {
    const current = await this.getBySlug(slug)
    const nonSeasonTags = (current.tags ?? [])
      .filter((t) => !isSeasonTag(t))
      .map((t) => ({ name: t.name, slug: t.slug }))
    return mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, {
      name: current.name,
      tags: [...nonSeasonTags, ...seasonsToTagObjects(seasons)],
    })
  }
}
