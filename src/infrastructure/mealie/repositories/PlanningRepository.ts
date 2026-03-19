import type { IPlanningRepository } from "../../../domain/planning/repositories/IPlanningRepository.ts"
import type {
  MealieMealPlan,
  MealieRawPaginatedMealPlans,
} from "../../../shared/types/mealie.ts"
import { mealieApiClient } from "../api/index.ts"

export class PlanningRepository implements IPlanningRepository {
  async getWeekPlanning(
    startDate: string,
    endDate: string,
  ): Promise<MealieMealPlan[]> {
    const raw = await mealieApiClient.get<MealieRawPaginatedMealPlans>(
      `/api/groups/mealplans?start_date=${startDate}&end_date=${endDate}&page=1&perPage=100`,
    )
    return raw.items.map((item) => ({
      id: item.id,
      date: item.date,
      entryType: item.entry_type,
      title: item.title,
      recipeId: item.recipe_id,
      recipe: item.recipe,
    }))
  }
}
