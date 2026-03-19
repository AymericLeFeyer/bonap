import type { IPlanningRepository } from "../../../domain/planning/repositories/IPlanningRepository.ts"
import type {
  MealieMealPlan,
  MealiePaginatedMealPlans,
} from "../../../shared/types/mealie.ts"
import { mealieApiClient } from "../api/index.ts"

export class PlanningRepository implements IPlanningRepository {
  async getWeekPlanning(
    startDate: string,
    endDate: string,
  ): Promise<MealieMealPlan[]> {
    const data = await mealieApiClient.get<MealiePaginatedMealPlans>(
      `/api/households/mealplans?page=1&perPage=-1&start_date=${startDate}&end_date=${endDate}`,
    )
    return data.items
  }
}
