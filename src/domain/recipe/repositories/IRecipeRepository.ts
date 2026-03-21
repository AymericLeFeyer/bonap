import type {
  MealiePaginatedRecipes,
  MealieRecipe,
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
}
