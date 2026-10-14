import type { ClassifiedIngredient } from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import { readLegacyCiqualMappings, toNutritionIngredients } from "../recipeNutritionInput.ts"
import type { ClassifyIngredientsUseCase } from "./ClassifyIngredientsUseCase.ts"

export interface ClassifyRecipeOptions {
  aiEnabled: boolean
  signal?: AbortSignal
}

/** Classe les ingrédients d'une recette, en important ses correspondances historiques. */
export class ClassifyRecipeIngredientsUseCase {
  private readonly classifyIngredients: ClassifyIngredientsUseCase

  constructor(classifyIngredients: ClassifyIngredientsUseCase) {
    this.classifyIngredients = classifyIngredients
  }

  async execute(recipe: MealieRecipe, options: ClassifyRecipeOptions): Promise<ClassifiedIngredient[]> {
    return this.classifyIngredients.execute(toNutritionIngredients(recipe), {
      ...options,
      legacyMappings: readLegacyCiqualMappings(recipe),
    })
  }
}
