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
  NutritionMetadata,
} from "../../../shared/types/mealie.ts"
import { isSeasonTag } from "../../../shared/utils/season.ts"
import { isCalorieTag, buildCalorieTag } from "../../../shared/utils/calorie.ts"
import { generateId } from "../../../shared/utils/id.ts"
import { NUTRITION_EXTRAS } from "../../../shared/utils/nutritionCoverage.ts"
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
      // recipeYield is the unit label in Mealie ("portions", "personnes"…).
      // Strip any leading number that may have been stored by a previous buggy save.
      recipeYield: current.recipeYield ? (current.recipeYield.replace(/^\d+\s*/, '').trim() || "") : current.recipeYield,
      recipeServings: data.recipeYield ? parseFloat(data.recipeYield) : (current.recipeServings ?? 0),
      // recipeYieldQuantity mirrors recipeServings for Mealie UI display (yield quantity field).
      recipeYieldQuantity: data.recipeYield ? parseFloat(data.recipeYield) : (current.recipeYieldQuantity ?? 0),
      recipeCategory: data.categories.map((c) => {
        const orig = current.recipeCategory?.find((rc) => rc.id === c.id)
        return orig ? { ...orig, ...c } : c
      }),
      recipeIngredient: mappedIngredients,
      // Fusion avec l'étape existante : le PUT remplace la recette entière, donc
      // n'envoyer que { id, text } effacerait le titre et surtout les
      // ingredientReferences (ingrédients associés à l'étape, affichés en mode cuisine).
      recipeInstructions: data.recipeInstructions
        .filter((step) => step.text.trim())
        .map((step) => {
          const original = step.id
            ? current.recipeInstructions?.find((s) => s.id === step.id)
            : undefined
          return {
            ...(original ?? {}),
            id: step.id ?? generateId(),
            text: step.text,
          }
        }),
      tags: [...data.tags, ...seasonTags],
      extras: { ...(current.extras ?? {}), ...(data.extras ?? {}) },
    }
    return mealieApiClient.put<MealieRecipe>(`/api/recipes/${slug}`, payload)
  }

  async uploadImage(slug: string, file: File): Promise<void> {
    return mealieApiClient.uploadImage(slug, file)
  }

  async deleteImage(slug: string): Promise<void> {
    return mealieApiClient.delete(`/api/recipes/${slug}/image`)
  }

  private simplifyRecipeForPut(current: MealieRecipe): Partial<MealieRecipe> {
    return {
      ...current,
      recipeIngredient: (current.recipeIngredient ?? []).map((ing) => ({
        ...ing,
        unit: ing.unit ? { id: ing.unit.id, name: ing.unit.name } : undefined,
        food: ing.food ? { id: ing.food.id, name: ing.food.name } : undefined,
      })),
      recipeCategory: (current.recipeCategory ?? []).map((c) => ({
        ...c, id: c.id, name: c.name, slug: c.slug,
      })),
    }
  }

  async updateCategories(slug: string, categories: MealieCategory[]): Promise<MealieRecipe> {
    const simplified = categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
    try {
      return await mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, { recipeCategory: simplified })
    } catch {
      const current = await this.getBySlug(slug)
      return mealieApiClient.put<MealieRecipe>(`/api/recipes/${slug}`, {
        ...this.simplifyRecipeForPut(current),
        recipeCategory: simplified,
      })
    }
  }

  async updateSeasons(slug: string, seasons: Season[]): Promise<MealieRecipe> {
    const [current, seasonTags] = await Promise.all([
      this.getBySlug(slug),
      this.resolveSeasonTags(seasons),
    ])
    const nonSeasonTags = (current.tags ?? [])
      .filter((t) => !isSeasonTag(t))
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug }))
    const newTags = [...nonSeasonTags, ...seasonTags]
    try {
      return await mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, { tags: newTags })
    } catch {
      return mealieApiClient.put<MealieRecipe>(`/api/recipes/${slug}`, {
        ...this.simplifyRecipeForPut(current),
        tags: newTags,
      })
    }
  }

  /**
   * Enregistre la nutrition par portion et sa couverture. Certaines versions de
   * Mealie rejettent les extras en PATCH (500) : on retombe alors sur un PUT
   * complet, jamais sur un PATCH sans extras qui perdrait le marqueur « par portion ».
   */
  async updateNutrition(
    slug: string,
    nutrition: MealieNutrition,
    metadata: NutritionMetadata,
  ): Promise<MealieRecipe> {
    const current = await this.getBySlug(slug)
    const normalizedNutrition = this.normalizeNutrition(nutrition)
    const extras: Record<string, string> = {
      ...(current.extras ?? {}),
      [NUTRITION_EXTRAS.source]: metadata.source,
      [NUTRITION_EXTRAS.estimatedAt]: new Date().toISOString(),
      [NUTRITION_EXTRAS.coverage]: String(metadata.coverage),
      [NUTRITION_EXTRAS.perServing]: String(metadata.perServing),
    }

    try {
      return await mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, {
        nutrition: normalizedNutrition,
        extras,
      })
    } catch (error) {
      if (error instanceof MealieApiError && error.statusCode >= 500) {
        return mealieApiClient.put<MealieRecipe>(`/api/recipes/${slug}`, {
          ...current,
          nutrition: normalizedNutrition,
          extras,
        })
      }
      throw error
    }
  }

  async updateCalorieTags(slug: string, calories: number): Promise<MealieRecipe> {
    const roundedCalories = Math.round(calories)
    const calorieTagName = buildCalorieTag(roundedCalories)
    const calorieTagSlug = calorieTagName

    // Fetch current recipe and global tags in parallel
    const [current, allTagsResponse] = await Promise.all([
      this.getBySlug(slug),
      mealieApiClient.get<{ items: MealieTag[] }>('/api/organizers/tags?page=1&perPage=-1'),
    ])

    // Short-circuit: if the calorie tag is already correct, skip the update entirely.
    // Re-posting the same tag without its DB id causes an IntegrityError in Mealie.
    const existingCalorieTag = (current.tags ?? []).find(isCalorieTag)
    if (existingCalorieTag?.name === calorieTagName && existingCalorieTag?.slug === calorieTagSlug) {
      return current
    }

    // Look up the tag globally by slug, then by name as fallback (slug format may differ)
    const globalTag = allTagsResponse.items.find(t => t.slug === calorieTagSlug)
      ?? allTagsResponse.items.find(t => t.name === calorieTagName)
    const calorieTag: MealieTagObject = globalTag
      ? { id: globalTag.id, name: globalTag.name, slug: globalTag.slug }
      : { name: calorieTagName, slug: calorieTagSlug }

    const nonCalorieTags = (current.tags ?? [])
      .filter(t => !isCalorieTag(t))
      .map(t => ({ id: t.id, name: t.name, slug: t.slug }))

    const newTags = [...nonCalorieTags, calorieTag]

    // Use PATCH with tags only — avoids sending the full recipe body which triggers
    // slug uniqueness checks and food/unit IntegrityErrors in Mealie.
    try {
      return await mealieApiClient.patch<MealieRecipe>(`/api/recipes/${slug}`, { tags: newTags })
    } catch {
      // Fallback: full PUT with simplified nested objects
      return mealieApiClient.put<MealieRecipe>(`/api/recipes/${slug}`, {
        ...this.simplifyRecipeForPut(current),
        tags: newTags,
      })
    }
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
