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
      `/api/households/mealplans?page=1&perPage=-1&start_date=${startDate}&end_date=${endDate}`,
    )
    return raw.items
  }

  async addMeal(entry: {
    date: string
    entryType: string
    recipeId: string
  }): Promise<MealieMealPlan> {
    return mealieApiClient.post<MealieMealPlan>(
      "/api/households/mealplans",
      entry,
    )
  }

  async deleteMeal(id: number): Promise<void> {
    await mealieApiClient.delete(`/api/households/mealplans/${id}`)
  }

  async updateMealNote(meal: MealieMealPlan, text: string): Promise<MealieMealPlan> {
    return mealieApiClient.put<MealieMealPlan>(`/api/households/mealplans/${meal.id}`, {
      id: meal.id,
      date: meal.date,
      entryType: meal.entryType,
      title: meal.title ?? "",
      text,
      recipeId: meal.recipeId,
      groupId: meal.groupId,
      userId: meal.userId,
    })
  }
}
