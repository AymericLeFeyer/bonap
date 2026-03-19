import type { IPlanningRepository } from "../../../domain/planning/repositories/IPlanningRepository.ts"
import type { MealieMealPlan } from "../../../shared/types/mealie.ts"

export class GetWeekPlanningUseCase {
  private planningRepository: IPlanningRepository

  constructor(planningRepository: IPlanningRepository) {
    this.planningRepository = planningRepository
  }

  async execute(
    startDate: string,
    endDate: string,
  ): Promise<MealieMealPlan[]> {
    return this.planningRepository.getWeekPlanning(startDate, endDate)
  }
}
