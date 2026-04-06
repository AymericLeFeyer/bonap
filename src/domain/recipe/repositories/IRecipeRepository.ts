import type {
  MealiePaginatedRecipes,
  MealieRecipe,
  MealieCategory,
  MealieFavoritesResponse,
  RecipeFilters,
  RecipeFormData,
  Season,
} from "../../../shared/types/mealie.ts"

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
  updateCalorieTags(slug: string, calories: number): Promise<MealieRecipe>
  updateCategories(slug: string, categories: MealieCategory[]): Promise<MealieRecipe>
  updateRating(slug: string, rating: number): Promise<void>
  getFavorites(): Promise<MealieFavoritesResponse>
  toggleFavorite(slug: string, isFavorite: boolean): Promise<void>
  uploadImage(slug: string, file: File): Promise<void>
}
