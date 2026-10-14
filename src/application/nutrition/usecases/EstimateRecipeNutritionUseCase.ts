import type { NutritionEstimate } from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { INutritionRepository } from "../../../domain/nutrition/repositories/INutritionRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import { recipeServingsOrOne, toNutritionIngredients } from "../recipeNutritionInput.ts"

export class EstimateRecipeNutritionUseCase {
  private readonly repository: INutritionRepository

  constructor(repository: INutritionRepository) {
    this.repository = repository
  }

  async execute(recipe: MealieRecipe): Promise<NutritionEstimate> {
    const ingredients = toNutritionIngredients(recipe)
    if (ingredients.length === 0) {
      throw new Error("La recette ne contient aucun ingrédient exploitable.")
    }
    return this.repository.estimate(ingredients, recipeServingsOrOne(recipe))
  }
}
