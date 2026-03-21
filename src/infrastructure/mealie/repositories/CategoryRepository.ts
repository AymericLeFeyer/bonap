import type { ICategoryRepository } from "../../../domain/organizer/repositories/ICategoryRepository.ts"
import type { MealieCategory } from "../../../shared/types/mealie.ts"
import { mealieApiClient } from "../api/index.ts"

interface RawCategoriesResponse {
  items: MealieCategory[]
}

export class CategoryRepository implements ICategoryRepository {
  async getAll(): Promise<MealieCategory[]> {
    const data = await mealieApiClient.get<RawCategoriesResponse>("/api/categories")
    return data.items
  }
}
