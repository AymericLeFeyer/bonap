import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type {
  MealiePaginatedRecipes,
  MealieRawPaginatedRecipes,
  MealieRecipe,
  MealieCategory,
  MealieTag,
  MealieFavoritesResponse,
  RecipeFilters,
  RecipeFormData,
  Season,
} from "../../../shared/types/mealie.ts"
import { isSeasonTag } from "../../../shared/utils/season.ts"
import { isCalorieTag, buildCalorieTag } from "../../../shared/utils/calorie.ts"
import { generateId } from "../../../shared/utils/id.ts"
import { mealieApiClient } from "../api/index.ts"
import { AuthService } from "../auth/AuthService.ts"

interface MealieTagObject { id?: string; name: string; slug: string }

export class RecipeRepository implements IRecipeRepository {

  private authService: AuthService

  constructor(authService: AuthService) {
    this.authService = authService
  }
  /** Resolves season tags by including their id if they already exist in Mealie. */
  private async resolveSeasonTags(seasons: Season[]): Promise<MealieTagObject[]> {
    const response = await mealieApiClient.get<{ items: MealieTag[] }>("/api/organizers/tags")
    const existing = response.items
    return seasons.map((s) => {
      const tagName = `saison-${s}`
      const found = existing.find((t) => t.slug === tagName)
      return found
        ? { id: found.id, name: found.name, slug: found.slug }
        : { name: tagName, slug: tagName }
    })
  }
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
      filters.categories.forEach((categorie) => {
        params.append("categories", categorie)
      })
      params.set("requireAllCategories", "true")
    }
    if (filters.tags?.length) {
      filters.tags.forEach((tag) => {
        params.append("tags", tag)
      })
      params.set("requireAllTags", "true")
    }
    if (filters.orderBy !== undefined) {
      params.set("orderBy", String(filters.orderBy))
    }
    if (filters.orderDirection !== undefined) {
      params.set("orderDirection", String(filters.orderDirection))
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

  async create(name: string): Promise<string> {
    const response = await mealieApiClient.post<string | { slug: string }>("/api/recipes", { name })
    return typeof response === "string" ? response : response.slug
  }

  /**
   * Convertit un nombre de minutes en texte lisible.
   *
   * Exemples :
   * 40  → "40 minutes"
   * 1   → "1 minute"
   * 0   → undefined
   */
  private minutesToString(minutes: number | string): string | undefined {
    const m = typeof minutes === "string" ? parseInt(minutes, 10) : minutes

    if (Number.isNaN(m) || m <= 0) return undefined

    return m === 1 ? "1 minute" : `${m} minutes`
  }

  async update(slug: string, data: RecipeFormData): Promise<MealieRecipe> {
    const [current, seasonTags] = await Promise.all([
      this.getBySlug(slug),
      this.resolveSeasonTags(data.seasons),
    ])

    const mappedIngredients = data.recipeIngredient
      .filter((ing) => ing.food || ing.note || ing.unit || (ing.quantity && ing.quantity !== "1"))
      .map((ing) => {
        const original = ing.referenceId
          ? current.recipeIngredient?.find((i) => i.referenceId === ing.referenceId)
          : undefined

        const quantity = ing.quantity ? parseFloat(ing.quantity) : 0
        const hasFood = Boolean(ing.foodId)
        const hasUnit = Boolean(ing.unitId)

        return {
          ...(original ?? {}),
          quantity,
          unit: hasUnit ? { id: ing.unitId, name: ing.unit } : undefined,
          food: hasFood ? { id: ing.foodId, name: ing.food } : (original?.food ?? null),
          note: ing.note || (!hasFood && !hasUnit ? ing.food : "") || "",
        }
      })

    const payload = {
      ...current,
      name: data.name,
      description: data.description || current.description,
      prepTime: this.minutesToString(data.prepTime) ?? current.prepTime,
      performTime: this.minutesToString(data.performTime) ?? current.performTime,
      totalTime: this.minutesToString(data.totalTime) ?? current.totalTime,
      recipeCategory: data.categories.map((c) => {
        const orig = current.recipeCategory?.find((rc) => rc.id === c.id)
        return orig ? { ...orig, ...c } : c
      }),
      recipeIngredient: mappedIngredients,
      recipeInstructions: data.recipeInstructions
        .filter((step) => step.text.trim())
        .map((step) => ({
          id: step.id ?? generateId(),
          text: step.text,
        })),
      tags: [...data.tags, ...seasonTags],
    }
    return mealieApiClient.put<MealieRecipe>(`/api/recipes/${slug}`, payload)
  }

  async uploadImage(slug: string, file: File): Promise<void> {
    return mealieApiClient.uploadImage(slug, file)
  }

  async updateCategories(slug: string, categories: MealieCategory[]): Promise<MealieRecipe> {
    const current = await this.getBySlug(slug)
    return mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, {
      name: current.name,
      recipeCategory: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    })
  }

  async updateSeasons(slug: string, seasons: Season[]): Promise<MealieRecipe> {
    const [current, seasonTags] = await Promise.all([
      this.getBySlug(slug),
      this.resolveSeasonTags(seasons),
    ])
    const nonSeasonTags = (current.tags ?? [])
      .filter((t) => !isSeasonTag(t))
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug }))
    return mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, {
      name: current.name,
      tags: [...nonSeasonTags, ...seasonTags],
    })
  }

  async updateCalorieTags(slug: string, calories: number): Promise<MealieRecipe> {
    const current = await this.getBySlug(slug)

    const calorieTag = {
      name: buildCalorieTag(calories),
      slug: buildCalorieTag(calories),
    }

    const nonCalorieTags = (current.tags ?? [])
      .filter(t => !isCalorieTag(t))
      .map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
      }))

    return mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, {
      name: current.name,
      tags: [...nonCalorieTags, calorieTag],
    })
  }

  async updateRating(slug: string, rating: number): Promise<void> {
    const userId = await this.authService.getUserId()
    await mealieApiClient.post(
      `/api/users/${userId}/ratings/${slug}`,
      {
        rating,
        isFavorite: false,
      }
    )
  }

  async getFavorites(): Promise<MealieFavoritesResponse> {
    const userId = await this.authService.getUserId()
    const res = await mealieApiClient.get<MealieFavoritesResponse>(
      `/api/users/${userId}/favorites`,
    )
    return res
  }

  async toggleFavorite(slug: string, isFavorite: boolean): Promise<void> {
    const userId = await this.authService.getUserId()
    if (isFavorite) {
      await mealieApiClient.delete(
        `/api/users/${userId}/favorites/${slug}`,
      )
    } else {
      await mealieApiClient.post(
        `/api/users/${userId}/favorites/${slug}`,
        {},
      )
    }
  }
}
