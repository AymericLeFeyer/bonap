import type { ITagRepository } from "../../../domain/organizer/repositories/ITagRepository.ts"
import type { MealieTag } from "../../../shared/types/mealie.ts"
import { mealieApiClient } from "../api/index.ts"

interface RawTagsResponse {
  items: MealieTag[]
}

export class TagRepository implements ITagRepository {
  async getAll(): Promise<MealieTag[]> {
    const data = await mealieApiClient.get<RawTagsResponse>("/api/organizers/tags")
    return data.items
  }
}
