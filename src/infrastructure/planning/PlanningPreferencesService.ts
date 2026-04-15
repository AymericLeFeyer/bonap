import { saveSettingToServer } from '../settings/ServerSettingsService.ts'

const KEY = "bonap_planning_prefs"

interface PlanningPrefs {
  showBreakfast: boolean
}

const DEFAULT: PlanningPrefs = { showBreakfast: false }

export const planningPrefsService = {
  load(): PlanningPrefs {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return DEFAULT
      return { ...DEFAULT, ...JSON.parse(raw) as Partial<PlanningPrefs> }
    } catch {
      return DEFAULT
    }
  },
  save(prefs: PlanningPrefs): void {
    const serialized = JSON.stringify(prefs)
    localStorage.setItem(KEY, serialized)
    saveSettingToServer('bonap_planning_prefs', serialized)
  },
}
