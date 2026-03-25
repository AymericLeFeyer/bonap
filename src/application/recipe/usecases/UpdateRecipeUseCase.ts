import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import type { IFoodRepository } from "../../../domain/organizer/repositories/IFoodRepository.ts"
import type { IUnitRepository } from "../../../domain/organizer/repositories/IUnitRepository.ts"
import type { RecipeFormData, MealieRecipe } from "../../../shared/types/mealie.ts"
import { resolveIngredients } from "./resolveIngredients.ts"

export class UpdateRecipeUseCase {
  private recipeRepository: IRecipeRepository
  private foodRepository: IFoodRepository
  private unitRepository: IUnitRepository

  constructor(
    recipeRepository: IRecipeRepository,
    foodRepository: IFoodRepository,
    unitRepository: IUnitRepository,
  ) {
    this.recipeRepository = recipeRepository
    this.foodRepository = foodRepository
    this.unitRepository = unitRepository
  }

  async execute(slug: string, data: RecipeFormData): Promise<MealieRecipe> {
    const resolvedData = await resolveIngredients(data, this.foodRepository, this.unitRepository)
    const recipe = await this.recipeRepository.update(slug, resolvedData)
    if (data.imageFile) {
      await this.recipeRepository.uploadImage(slug, data.imageFile)
    }
    return recipe
  }
}
