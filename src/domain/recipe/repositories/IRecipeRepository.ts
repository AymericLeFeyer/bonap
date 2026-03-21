import type {
  MealiePaginatedRecipes,
  MealieRecipe,
  RecipeFilters,
  RecipeFormData,
} from "../../../shared/types/mealie.ts"

export interface IRecipeRepository {
  getAll(
    page?: number,
    perPage?: number,
    filters?: RecipeFilters,
  ): Promise<MealiePaginatedRecipes>
  getBySlug(slug: string): Promise<MealieRecipe>
  createFromUrl(url: string): Promise<string>
  create(name: string): Promise<string>
  update(slug: string, data: RecipeFormData): Promise<MealieRecipe>
}
