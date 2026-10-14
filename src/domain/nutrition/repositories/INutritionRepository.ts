import type {
  CiqualFood,
  ClassifiedIngredient,
  NutritionEstimate,
  NutritionFoodPatch,
  NutritionFoods,
  NutritionIngredientInput,
} from "../entities/NutritionFood.ts"

export interface ClassifyOptions {
  aiEnabled: boolean
  legacyMappings?: Record<string, string>
}

export interface INutritionRepository {
  getFoods(): Promise<NutritionFoods>
  saveFoods(patches: NutritionFoodPatch[]): Promise<NutritionFoods>
  classify(ingredients: NutritionIngredientInput[], options: ClassifyOptions): Promise<ClassifiedIngredient[]>
  estimate(ingredients: NutritionIngredientInput[], servings: number): Promise<NutritionEstimate>
  searchCiqual(query: string, limit?: number): Promise<CiqualFood[]>
}
