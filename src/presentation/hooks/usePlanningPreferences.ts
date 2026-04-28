import { useState, useCallback } from "react"
import { planningPrefsService } from "../../infrastructure/planning/PlanningPreferencesService.ts"

export function usePlanningPreferences() {
  const [prefs, setPrefs] = useState(() => planningPrefsService.load())
  const [kioskPrefs, setKioskPrefs] = useState(() => planningPrefsService.loadKiosk())

  const setShowBreakfast = useCallback((value: boolean) => {
    const next = { ...prefs, showBreakfast: value }
    planningPrefsService.save(next)
    setPrefs(next)
  }, [prefs])

  const setKioskDays = useCallback((value: 3 | 5 | 7) => {
    const next = { kioskDays: value }
    planningPrefsService.saveKiosk(next)
    setKioskPrefs(next)
  }, [])

  return {
    showBreakfast: prefs.showBreakfast,
    setShowBreakfast,
    kioskDays: kioskPrefs.kioskDays,
    setKioskDays,
  }
}
