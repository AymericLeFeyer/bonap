import { useState, useCallback } from "react"
import { planningPrefsService } from "../../infrastructure/planning/PlanningPreferencesService.ts"

export function usePlanningPreferences() {
  const [prefs, setPrefs] = useState(() => planningPrefsService.load())

  const setShowBreakfast = useCallback((value: boolean) => {
    const next = { ...prefs, showBreakfast: value }
    planningPrefsService.save(next)
    setPrefs(next)
  }, [prefs])

  return { showBreakfast: prefs.showBreakfast, setShowBreakfast }
}
