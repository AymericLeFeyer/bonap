import type { CiqualFood } from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { INutritionRepository } from "../../../domain/nutrition/repositories/INutritionRepository.ts"

export class SearchCiqualFoodsUseCase {
  private readonly repository: INutritionRepository

  constructor(repository: INutritionRepository) {
    this.repository = repository
  }

  async execute(query: string, limit = 12): Promise<CiqualFood[]> {
    return this.repository.searchCiqual(query, limit)
  }
}
