import type { MealieMealPlan } from "../../../shared/types/mealie.ts"

export interface IPlanningRepository {
  getWeekPlanning(
    startDate: string,
    endDate: string,
  ): Promise<MealieMealPlan[]>
  addMeal(entry: {
    date: string
    entryType: string
    recipeId: string
  }): Promise<MealieMealPlan>
  deleteMeal(id: number): Promise<void>
  updateMealNote(meal: import("../../../shared/types/mealie.ts").MealieMealPlan, text: string): Promise<import("../../../shared/types/mealie.ts").MealieMealPlan>
}
