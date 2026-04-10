import { useCallback, useEffect, useRef, useState } from "react"
import type { MealieMealPlan } from "../../shared/types/mealie.ts"
import {
  getWeekPlanningUseCase,
  addMealUseCase,
  deleteMealUseCase,
  planningRepository,
} from "../../infrastructure/container.ts"
import { formatDate } from "../../shared/utils/date.ts"

// Prefetch margin: load ±14 days around the center date
const PREFETCH_MARGIN = 14

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  result.setHours(0, 0, 0, 0)
  return result
}

function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Retourne le mardi de la semaine en cours (lundi affiché = centerDate - 1) */
function currentWeekTuesday(): Date {
  const d = today()
  const dow = d.getDay() // 0=dim, 1=lun, ..., 6=sam
  // Lundi de la semaine courante (ISO : la semaine commence le lundi)
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const monday = addDays(d, diffToMonday)
  return addDays(monday, 1) // mardi = center qui affiche lundi en col 0
}

export function usePlanning() {
  const [centerDate, setCenterDate] = useState<Date>(() => currentWeekTuesday())
  const [nbDays, setNbDays] = useState<3 | 5 | 7>(7)
  const [mealPlans, setMealPlans] = useState<MealieMealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Range already loaded in memory
  const fetchedRange = useRef<{ start: string; end: string } | null>(null)
  const prefetching = useRef(false)

  const fetchRange = useCallback(async (start: string, end: string, silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const data = await getWeekPlanningUseCase.execute(start, end)
      setMealPlans((prev) => {
        const outside = prev.filter((m) => m.date < start || m.date > end)
        return [...outside, ...data]
      })
      fetchedRange.current = {
        start: fetchedRange.current
          ? fetchedRange.current.start < start ? fetchedRange.current.start : start
          : start,
        end: fetchedRange.current
          ? fetchedRange.current.end > end ? fetchedRange.current.end : end
          : end,
      }
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      if (!silent) setLoading(false)
      prefetching.current = false
    }
  }, [])

  useEffect(() => {
    // Same offset as the render: today in 2nd column → window = [centerDate-1 .. centerDate+nbDays-2]
    const visibleStart = formatDate(addDays(centerDate, -2))
    const visibleEnd = formatDate(addDays(centerDate, nbDays - 1))

    const cached = fetchedRange.current
    const isCovered =
      cached !== null && visibleStart >= cached.start && visibleEnd <= cached.end

    if (!isCovered) {
      // Outside cache: blocking fetch with spinner
      const fetchStart = formatDate(addDays(centerDate, -PREFETCH_MARGIN))
      const fetchEnd = formatDate(addDays(centerDate, PREFETCH_MARGIN))
      void fetchRange(fetchStart, fetchEnd, false)
      return
    }

    // Within cache: prefetch if approaching an edge (less than 3 days away)
    if (!prefetching.current && cached) {
      const nearStart = visibleStart <= formatDate(addDays(new Date(cached.start), 3))
      const nearEnd = visibleEnd >= formatDate(addDays(new Date(cached.end), -3))

      if (nearStart || nearEnd) {
        prefetching.current = true
        const fetchStart = formatDate(addDays(centerDate, -PREFETCH_MARGIN))
        const fetchEnd = formatDate(addDays(centerDate, PREFETCH_MARGIN))
        void fetchRange(fetchStart, fetchEnd, true)
      }
    }
  }, [centerDate, nbDays, fetchRange])

  const goToPrevDay = () => setCenterDate((prev) => addDays(prev, -1))
  const goToNextDay = () => setCenterDate((prev) => addDays(prev, 1))
  const goToPrevPeriod = () => setCenterDate((prev) => addDays(prev, -nbDays))
  const goToNextPeriod = () => setCenterDate((prev) => addDays(prev, nbDays))
  const goToToday = () => setCenterDate(currentWeekTuesday())
  const goToTodayMobile = () => setCenterDate(today())

  const addMeal = useCallback(async (date: string, entryType: string, recipeId: string) => {
    const newMeal = await addMealUseCase.execute(date, entryType, recipeId)
    setMealPlans((prev) => [...prev, newMeal])
    return newMeal
  }, [])

  const deleteMeal = useCallback(async (id: number) => {
    setMealPlans((prev) => prev.filter((m) => m.id !== id))
    await deleteMealUseCase.execute(id)
  }, [])

  const updateMealNote = useCallback(async (id: number, text: string) => {
    const meal = mealPlans.find((m) => m.id === id)
    if (!meal) return
    // Optimistic update
    setMealPlans((prev) => prev.map((m) => m.id === id ? { ...m, text } : m))
    try {
      await planningRepository.updateMealNote(meal, text)
    } catch {
      // Rollback
      setMealPlans((prev) => prev.map((m) => m.id === id ? { ...m, text: meal.text } : m))
    }
  }, [mealPlans])

  return {
    mealPlans,
    loading,
    error,
    centerDate,
    nbDays,
    setNbDays,
    goToPrevDay,
    goToNextDay,
    goToPrevPeriod,
    goToNextPeriod,
    goToToday,
    goToTodayMobile,
    addMeal,
    deleteMeal,
    updateMealNote,
  }
}
