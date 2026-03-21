import type { MealieTag } from "../../../shared/types/mealie.ts"

export interface ITagRepository {
  getAll(): Promise<MealieTag[]>
}
