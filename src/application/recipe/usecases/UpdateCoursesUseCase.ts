import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { Course, MealieRecipe } from "../../../shared/types/mealie.ts"

export class UpdateCoursesUseCase {
  private recipeRepository: IRecipeRepository

  constructor(recipeRepository: IRecipeRepository) {
    this.recipeRepository = recipeRepository
  }

  async execute(slug: string, courses: Course[]): Promise<MealieRecipe> {
    return this.recipeRepository.updateCourses(slug, courses)
  }
}
