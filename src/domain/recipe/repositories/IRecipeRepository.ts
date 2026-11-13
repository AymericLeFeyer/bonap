import type {
  MealiePaginatedRecipes,
  MealieRecipe,
  MealieCategory,
  MealieNutrition,
  NutritionMetadata,
  MealieFavoritesResponse,
  RecipeFilters,
  RecipeFormData,
  Season,
  Course,
} from "../../../shared/types/mealie.ts"
import type { BatchInfo } from "../../../shared/utils/batch.ts"

export interface IRecipeRepository {
  getAll(
    page?: number,
    perPage?: number,
    filters?: RecipeFilters,
  ): Promise<MealiePaginatedRecipes>
  getBySlug(slug: string): Promise<MealieRecipe>
  create(name: string): Promise<string>
  update(slug: string, data: RecipeFormData): Promise<MealieRecipe>
  updateSeasons(slug: string, seasons: Season[]): Promise<MealieRecipe>
  updateCourses(slug: string, courses: Course[]): Promise<MealieRecipe>
  updateNutrition(
    slug: string,
    nutrition: MealieNutrition,
    metadata: NutritionMetadata,
  ): Promise<MealieRecipe>
  updateCalorieTags(slug: string, calories: number): Promise<MealieRecipe>
  /** Applique `update` au batch actuel (relu sur le serveur) et l'enregistre. */
  updateBatch(slug: string, update: (current: BatchInfo) => BatchInfo): Promise<MealieRecipe>
  updateCategories(slug: string, categories: MealieCategory[]): Promise<MealieRecipe>
  updateRating(slug: string, rating: number): Promise<void>
  getFavorites(): Promise<MealieFavoritesResponse>
  toggleFavorite(slug: string, isFavorite: boolean): Promise<void>
  uploadImage(slug: string, file: File): Promise<void>
  deleteImage(slug: string): Promise<void>
  delete(slug: string): Promise<void>
}
