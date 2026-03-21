import type { ITagRepository } from "../../../domain/organizer/repositories/ITagRepository.ts"
import type { MealieTag } from "../../../shared/types/mealie.ts"

export class GetTagsUseCase {
  private tagRepository: ITagRepository

  constructor(tagRepository: ITagRepository) {
    this.tagRepository = tagRepository
  }

  async execute(): Promise<MealieTag[]> {
    return this.tagRepository.getAll()
  }
}
