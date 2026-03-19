import type { MealieMealPlan } from "../../../shared/types/mealie.ts"

export interface IPlanningRepository {
  getWeekPlanning(
    startDate: string,
    endDate: string,
  ): Promise<MealieMealPlan[]>
}
