import { saveSettingToServer } from '../settings/ServerSettingsService.ts'

const KEY = "bonap_planning_prefs"
const KIOSK_KEY = "bonap_kiosk_prefs"

interface PlanningPrefs {
  showBreakfast: boolean
}

interface KioskPrefs {
  kioskDays: 3 | 5 | 7
}

const DEFAULT: PlanningPrefs = { showBreakfast: false }
const DEFAULT_KIOSK: KioskPrefs = { kioskDays: 5 }

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
  loadKiosk(): KioskPrefs {
    try {
      const raw = localStorage.getItem(KIOSK_KEY)
      if (!raw) return DEFAULT_KIOSK
      return { ...DEFAULT_KIOSK, ...JSON.parse(raw) as Partial<KioskPrefs> }
    } catch {
      return DEFAULT_KIOSK
    }
  },
  saveKiosk(prefs: KioskPrefs): void {
    localStorage.setItem(KIOSK_KEY, JSON.stringify(prefs))
  },
}
