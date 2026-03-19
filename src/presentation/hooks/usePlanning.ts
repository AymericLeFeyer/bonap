import { useCallback, useEffect, useState } from "react"
import type { MealieMealPlan } from "../../shared/types/mealie.ts"
import { GetWeekPlanningUseCase } from "../../application/planning/usecases/GetWeekPlanningUseCase.ts"
import { PlanningRepository } from "../../infrastructure/mealie/repositories/PlanningRepository.ts"

const getWeekPlanningUseCase = new GetWeekPlanningUseCase(
  new PlanningRepository(),
)

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function usePlanning() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    getMonday(new Date()),
  )
  const [mealPlans, setMealPlans] = useState<MealieMealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlanning = useCallback(async (weekStart: Date) => {
    setLoading(true)
    setError(null)
    try {
      const startDate = formatDate(weekStart)
      const endDate = formatDate(addDays(weekStart, 6))
      const data = await getWeekPlanningUseCase.execute(startDate, endDate)
      setMealPlans(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPlanning(currentWeekStart)
  }, [currentWeekStart, fetchPlanning])

  const goToPrevWeek = () =>
    setCurrentWeekStart((prev) => addDays(prev, -7))

  const goToNextWeek = () =>
    setCurrentWeekStart((prev) => addDays(prev, 7))

  const goToCurrentWeek = () => setCurrentWeekStart(getMonday(new Date()))

  return {
    mealPlans,
    loading,
    error,
    currentWeekStart,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
  }
}
