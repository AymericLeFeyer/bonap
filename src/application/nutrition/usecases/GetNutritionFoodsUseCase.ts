import type { NutritionFoods } from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { INutritionRepository } from "../../../domain/nutrition/repositories/INutritionRepository.ts"

export class GetNutritionFoodsUseCase {
  private readonly repository: INutritionRepository

  constructor(repository: INutritionRepository) {
    this.repository = repository
  }

  async execute(): Promise<NutritionFoods> {
    return this.repository.getFoods()
  }
}
