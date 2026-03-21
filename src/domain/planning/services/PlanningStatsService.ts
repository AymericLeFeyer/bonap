import type { MealieMealPlan, MealieRecipe } from "../../../shared/types/mealie.ts"
import { formatDate } from "../../../shared/utils/date.ts"

export interface CategoryStat {
  name: string
  count: number
  percentage: number
}

/**
 * Computes the percentage of "leftover" meals (same recipe on two consecutive slots).
 */
export function computeLeftoverPercentage(mealPlans: MealieMealPlan[]): number {
  if (mealPlans.length < 2) return 0

  const sorted = [...mealPlans].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.entryType.localeCompare(b.entryType)
  })

  let leftovers = 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (
      prev.recipeId &&
      curr.recipeId &&
      prev.recipeId === curr.recipeId
    ) {
      leftovers++
    }
  }

  return Math.round((leftovers / (mealPlans.length - 1)) * 100)
}

/**
 * Computes the number of consecutive weeks with a complete plan (≥1 meal/day),
 * going back from the end of the period.
 */
export function computeStreak(
  mealPlans: MealieMealPlan[],
  startDate: string,
  endDate: string,
): number {
  const datesWithMeal = new Set(mealPlans.map((m) => m.date))

  const start = new Date(startDate)
  const end = new Date(endDate)

  // Rewind to the Monday of the end week
  const current = new Date(end)
  const dayOfWeek = current.getDay() === 0 ? 6 : current.getDay() - 1
  current.setDate(current.getDate() - dayOfWeek)
  current.setHours(0, 0, 0, 0)

  let streak = 0

  while (current >= start) {
    let weekComplete = true
    for (let d = 0; d < 7; d++) {
      const day = new Date(current)
      day.setDate(day.getDate() + d)
      if (day > end) break
      if (day < start) continue
      const dateStr = formatDate(day)
      if (!datesWithMeal.has(dateStr)) {
        weekComplete = false
        break
      }
    }
    if (weekComplete) {
      streak++
    } else {
      break
    }
    current.setDate(current.getDate() - 7)
  }

  return streak
}

/**
 * Computes the category distribution across a set of planned recipes.
 */
export function computeCategoryStats(plannedRecipes: MealieRecipe[]): CategoryStat[] {
  const countMap = new Map<string, number>()
  for (const recipe of plannedRecipes) {
    const cats = recipe.recipeCategory ?? []
    if (cats.length === 0) {
      countMap.set("Sans catégorie", (countMap.get("Sans catégorie") ?? 0) + 1)
    } else {
      for (const cat of cats) {
        countMap.set(cat.name, (countMap.get(cat.name) ?? 0) + 1)
      }
    }
  }

  const total = Array.from(countMap.values()).reduce((sum, v) => sum + v, 0)
  if (total === 0) return []

  return Array.from(countMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
}
