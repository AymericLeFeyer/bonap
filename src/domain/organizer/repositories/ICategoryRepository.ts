import type { MealieCategory } from "../../../shared/types/mealie.ts"

export interface ICategoryRepository {
  getAll(): Promise<MealieCategory[]>
}
