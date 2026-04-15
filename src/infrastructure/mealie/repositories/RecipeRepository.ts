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
  MealieNutrition,
} from "../../../shared/types/mealie.ts"
import { isSeasonTag } from "../../../shared/utils/season.ts"
import { isCalorieTag, buildCalorieTag } from "../../../shared/utils/calorie.ts"
import { generateId } from "../../../shared/utils/id.ts"
import { mealieApiClient } from "../api/index.ts"
import { AuthService } from "../auth/AuthService.ts"
import { MealieApiError } from "../../../shared/types/errors.ts"

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

  private parseQuantity(value?: string): number {
    const raw = String(value ?? '').trim()
    if (!raw) return 0
    const normalizedFractions = raw
      .replace(/\u00BC/g, '1/4')
      .replace(/\u00BD/g, '1/2')
      .replace(/\u00BE/g, '3/4')
    // Handle common fractions like 1/2, 1/4, 3/4.
    const frac = normalizedFractions.match(/^(\d+)\s*\/\s*(\d+)$/)
    if (frac) {
      const num = parseFloat(frac[1])
      const den = parseFloat(frac[2])
      if (den > 0) return num / den
    }
    const normalized = normalizedFractions.replace(',', '.')
    const n = parseFloat(normalized)
    return Number.isFinite(n) ? n : 0
  }

  private normalizeNutritionValue(value?: string): string | undefined {
    const raw = String(value ?? "").trim()
    if (!raw) return undefined
    const match = raw.match(/-?\d+(?:[.,]\d+)?/)
    if (!match) return undefined
    const numeric = Number.parseFloat(match[0].replace(',', '.'))
    if (!Number.isFinite(numeric)) return undefined
    return `${Math.round(numeric * 10) / 10}`
  }

  private normalizeNutrition(nutrition: MealieNutrition): MealieNutrition {
    return {
      calories: this.normalizeNutritionValue(nutrition.calories),
      carbohydrateContent: this.normalizeNutritionValue(nutrition.carbohydrateContent),
      cholesterolContent: this.normalizeNutritionValue(nutrition.cholesterolContent),
      fatContent: this.normalizeNutritionValue(nutrition.fatContent),
      fiberContent: this.normalizeNutritionValue(nutrition.fiberContent),
      proteinContent: this.normalizeNutritionValue(nutrition.proteinContent),
      saturatedFatContent: this.normalizeNutritionValue(nutrition.saturatedFatContent),
      sodiumContent: this.normalizeNutritionValue(nutrition.sodiumContent),
      sugarContent: this.normalizeNutritionValue(nutrition.sugarContent),
      transFatContent: this.normalizeNutritionValue(nutrition.transFatContent),
      unsaturatedFatContent: this.normalizeNutritionValue(nutrition.unsaturatedFatContent),
    }
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

        const quantity = this.parseQuantity(ing.quantity)
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
      recipeYield: data.recipeYield ?? current.recipeYield,
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

  async updateNutrition(
    slug: string,
    nutrition: MealieNutrition,
    source?: string,
    ciqualMappings?: Record<string, string>,
  ): Promise<MealieRecipe> {
    const current = await this.getBySlug(slug)
    const normalizedNutrition = this.normalizeNutrition(nutrition)
    const hasCiqualMappings = !!ciqualMappings && Object.keys(ciqualMappings).length > 0

    const extrasPayload: Record<string, string> = {
      ...(current.extras ?? {}),
      ...(source ? { nutritionSource: source, nutritionEstimatedAt: new Date().toISOString() } : {}),
      ...(hasCiqualMappings ? { nutritionCiqualMappings: JSON.stringify(ciqualMappings) } : {}),
    }

    const payloadWithExtras = {
      nutrition: normalizedNutrition,
      extras: extrasPayload,
    }

    try {
      return await mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, payloadWithExtras)
    } catch (error) {
      // Some Mealie versions reject extras patch payloads with 500; retry with nutrition only.
      if (error instanceof MealieApiError && error.statusCode >= 500) {
        try {
          return await mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, {
            nutrition: normalizedNutrition,
          })
        } catch (retryError) {
          // Final fallback: full PUT update (same strategy as recipe editor save),
          // which is more stable across Mealie versions than PATCH for nested fields.
          if (retryError instanceof MealieApiError && retryError.statusCode >= 500) {
            return mealieApiClient.put<MealieRecipe>(`/api/recipes/${slug}`, {
              ...current,
              nutrition: normalizedNutrition,
              extras: extrasPayload,
            })
          }
          throw retryError
        }
      }
      throw error
    }
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

  async delete(slug: string): Promise<void> {
    await mealieApiClient.delete(`/api/recipes/${slug}`)
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
