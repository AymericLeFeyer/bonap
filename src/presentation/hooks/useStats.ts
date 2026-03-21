import { useCallback, useEffect, useState } from "react"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import {
  getPlanningRangeUseCase,
  getRecipesByIdsUseCase,
  getRecipesUseCase,
} from "../../infrastructure/container.ts"
import { getPeriodDates } from "../../application/planning/usecases/GetStatsUseCase.ts"
import type { StatsPeriod } from "../../application/planning/usecases/GetStatsUseCase.ts"
import {
  computeLeftoverPercentage,
  computeStreak,
  computeCategoryStats,
} from "../../domain/planning/services/PlanningStatsService.ts"
import type { CategoryStat } from "../../domain/planning/services/PlanningStatsService.ts"
import { getWeeksBetween } from "../../shared/utils/date.ts"

export type { StatsPeriod }

export interface TopRecipe {
  recipe: MealieRecipe
  count: number
}

export interface TopIngredient {
  name: string
  count: number
}

export type { CategoryStat }

export interface StatsData {
  /** Most frequently planned recipes */
  topRecipes: TopRecipe[]
  /** Most used ingredients */
  topIngredients: TopIngredient[]
  /** % of "leftover" meals (same recipe on two consecutive slots) */
  leftoverPercentage: number
  /** Number of lunch meals */
  lunchCount: number
  /** Number of dinner meals */
  dinnerCount: number
  /** Lunch ratio (0-1) */
  lunchRatio: number
  /** Average number of planned meals per week */
  avgMealsPerWeek: number
  /** Catalogue recipes never planned during the period */
  neverPlannedRecipes: MealieRecipe[]
  /** Distribution by category */
  categoryStats: CategoryStat[]
  /** Number of consecutive weeks with a complete plan (≥1 meal/day) */
  streak: number
  /** Total number of meals planned during the period */
  totalMeals: number
}

const MAX_INGREDIENT_RECIPES = 20

export function useStats() {
  const [period, setPeriod] = useState<StatsPeriod>("30d")
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const computeStats = useCallback(async (selectedPeriod: StatsPeriod) => {
    setLoading(true)
    setError(null)
    try {
      const { startDate, endDate } = getPeriodDates(selectedPeriod)

      // 1. Fetch the meal plans for the period
      const mealPlans = await getPlanningRangeUseCase.execute(startDate, endDate)

      // 2. Count planned recipe occurrences
      const recipeCounts = new Map<string, number>()
      for (const meal of mealPlans) {
        if (meal.recipe?.slug) {
          recipeCounts.set(meal.recipe.slug, (recipeCounts.get(meal.recipe.slug) ?? 0) + 1)
        }
      }

      // 3. Top recipes (sorted by frequency)
      const sortedSlugs = Array.from(recipeCounts.entries())
        .sort((a, b) => b[1] - a[1])

      // Recipes are already in meal.recipe, extract them
      const recipeMap = new Map<string, MealieRecipe>()
      for (const meal of mealPlans) {
        if (meal.recipe?.slug && !recipeMap.has(meal.recipe.slug)) {
          recipeMap.set(meal.recipe.slug, meal.recipe)
        }
      }

      const topRecipes: TopRecipe[] = sortedSlugs
        .slice(0, 10)
        .filter(([slug]) => recipeMap.has(slug))
        .map(([slug, count]) => ({ recipe: recipeMap.get(slug)!, count }))

      // 4. Fetch details of the top 20 recipes for ingredient aggregation
      const top20Slugs = sortedSlugs.slice(0, MAX_INGREDIENT_RECIPES).map(([slug]) => slug)
      const detailedRecipes = await getRecipesByIdsUseCase.execute(top20Slugs)

      // 5. Aggregate ingredients (weighted by number of times planned)
      const ingredientCounts = new Map<string, number>()
      for (const recipe of detailedRecipes) {
        const count = recipeCounts.get(recipe.slug) ?? 1
        for (const ing of recipe.recipeIngredient ?? []) {
          const name = ing.food?.name?.trim()
          if (name) {
            ingredientCounts.set(name, (ingredientCounts.get(name) ?? 0) + count)
          }
        }
      }
      const topIngredients: TopIngredient[] = Array.from(ingredientCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count }))

      // 6. Leftover percentage
      const leftoverPercentage = computeLeftoverPercentage(mealPlans)

      // 7. Lunch / dinner breakdown
      const lunchCount = mealPlans.filter((m) =>
        m.entryType?.toLowerCase().includes("lunch") ||
        m.entryType?.toLowerCase().includes("déjeuner") ||
        m.entryType?.toLowerCase().includes("dejeuner"),
      ).length
      const dinnerCount = mealPlans.filter((m) =>
        m.entryType?.toLowerCase().includes("dinner") ||
        m.entryType?.toLowerCase().includes("dîner") ||
        m.entryType?.toLowerCase().includes("diner") ||
        m.entryType?.toLowerCase().includes("supper"),
      ).length
      const totalTyped = lunchCount + dinnerCount
      const lunchRatio = totalTyped > 0 ? lunchCount / totalTyped : 0.5

      // 8. Average meals per week
      const weeks = getWeeksBetween(startDate, endDate)
      const avgMealsPerWeek = Math.round((mealPlans.length / weeks) * 10) / 10

      // 9. Recipes never planned (full catalogue)
      const allRecipesResult = await getRecipesUseCase.execute(1, -1)
      const allRecipes = allRecipesResult.items
      const plannedSlugsSet = new Set(recipeCounts.keys())
      const neverPlannedRecipes = allRecipes
        .filter((r) => !plannedSlugsSet.has(r.slug))
        .slice(0, 50)

      // 10. Category distribution (over all unique planned recipes)
      const uniquePlannedRecipes = Array.from(recipeMap.values())
      const categoryStats = computeCategoryStats(uniquePlannedRecipes)

      // 11. Consecutive planning streak
      const streak = computeStreak(mealPlans, startDate, endDate)

      setStats({
        topRecipes,
        topIngredients,
        leftoverPercentage,
        lunchCount,
        dinnerCount,
        lunchRatio,
        avgMealsPerWeek,
        neverPlannedRecipes,
        categoryStats,
        streak,
        totalMeals: mealPlans.length,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void computeStats(period)
  }, [period, computeStats])

  const setPeriodAndRefresh = useCallback((newPeriod: StatsPeriod) => {
    setPeriod(newPeriod)
  }, [])

  return {
    period,
    setPeriod: setPeriodAndRefresh,
    stats,
    loading,
    error,
  }
}
