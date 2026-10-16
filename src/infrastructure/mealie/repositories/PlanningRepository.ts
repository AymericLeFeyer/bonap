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
    recipeId?: string
    title?: string
    text?: string
  }): Promise<MealieMealPlan> {
    const created = await mealieApiClient.post<MealieMealPlan>(
      "/api/households/mealplans",
      entry,
    )
    // La note porte le type et les portions : on la garde même si la réponse ne la renvoie pas.
    return entry.text && !created.text ? { ...created, text: entry.text } : created
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
