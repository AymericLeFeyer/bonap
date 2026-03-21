import type {
  MealiePaginatedRecipes,
  MealieRecipe,
  RecipeFilters,
} from "../../../shared/types/mealie.ts"

export interface IRecipeRepository {
  getAll(
    page?: number,
    perPage?: number,
    filters?: RecipeFilters,
  ): Promise<MealiePaginatedRecipes>
  getBySlug(slug: string): Promise<MealieRecipe>
  createFromUrl(url: string): Promise<string>
}
