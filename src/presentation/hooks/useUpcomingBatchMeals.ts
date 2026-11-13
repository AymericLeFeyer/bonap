import { useCallback, useEffect, useState } from "react"
import { getPlanningRangeUseCase } from "../../infrastructure/container.ts"
import type { MealieMealPlan } from "../../shared/types/mealie.ts"
import { decodeMealText } from "../../shared/utils/mealText.ts"
import { addDaysToDate } from "../../shared/utils/batch.ts"
import { formatDate } from "../../shared/utils/date.ts"

const HORIZON_DAYS = 14

/** Repas planifiés depuis le stock batch, d'aujourd'hui à J+14. */
export function useUpcomingBatchMeals() {
  const [meals, setMeals] = useState<MealieMealPlan[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const today = formatDate(new Date())
      const plans = await getPlanningRangeUseCase.execute(today, addDaysToDate(today, HORIZON_DAYS))
      setMeals(
        plans
          .filter((m) => decodeMealText(m.text).batch)
          .sort((a, b) => a.date.localeCompare(b.date)),
      )
    } catch {
      setMeals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { meals, loading, reload }
}
