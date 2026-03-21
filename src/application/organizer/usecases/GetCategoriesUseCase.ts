import type { ICategoryRepository } from "../../../domain/organizer/repositories/ICategoryRepository.ts"
import type { MealieCategory } from "../../../shared/types/mealie.ts"

export class GetCategoriesUseCase {
  private categoryRepository: ICategoryRepository

  constructor(categoryRepository: ICategoryRepository) {
    this.categoryRepository = categoryRepository
  }

  async execute(): Promise<MealieCategory[]> {
    return this.categoryRepository.getAll()
  }
}
