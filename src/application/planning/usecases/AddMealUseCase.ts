import type { IPlanningRepository } from "../../../domain/planning/repositories/IPlanningRepository.ts"
import type { MealieMealPlan } from "../../../shared/types/mealie.ts"

export class AddMealUseCase {
  private planningRepository: IPlanningRepository

  constructor(planningRepository: IPlanningRepository) {
    this.planningRepository = planningRepository
  }

  async execute(
    date: string,
    entryType: string,
    recipeId?: string,
    title?: string,
  ): Promise<MealieMealPlan> {
    return this.planningRepository.addMeal({ date, entryType, recipeId, title })
  }
}
