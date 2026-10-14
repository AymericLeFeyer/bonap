import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import type { ClassifyRecipeIngredientsUseCase, ClassifyRecipeOptions } from "./ClassifyRecipeIngredientsUseCase.ts"
import type { SavedRecipeNutrition, SaveRecipeNutritionUseCase } from "./SaveRecipeNutritionUseCase.ts"

/** « Calculer (CIQUAL) » : classe les ingrédients de la recette puis enregistre sa nutrition. */
export class CompleteRecipeNutritionUseCase {
  private readonly classifyRecipeIngredients: ClassifyRecipeIngredientsUseCase
  private readonly saveRecipeNutrition: SaveRecipeNutritionUseCase

  constructor(classifyRecipeIngredients: ClassifyRecipeIngredientsUseCase, saveRecipeNutrition: SaveRecipeNutritionUseCase) {
    this.classifyRecipeIngredients = classifyRecipeIngredients
    this.saveRecipeNutrition = saveRecipeNutrition
  }

  async execute(recipe: MealieRecipe, options: ClassifyRecipeOptions): Promise<SavedRecipeNutrition> {
    await this.classifyRecipeIngredients.execute(recipe, options)
    return this.saveRecipeNutrition.execute(recipe)
  }
}
