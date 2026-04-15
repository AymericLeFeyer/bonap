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
    localStorage.setItem(KEY, JSON.stringify(prefs))
  },
}
