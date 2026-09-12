import { saveSettingToServer } from "./ServerSettingsService.ts"
import { NAV_ROUTES } from "../../shared/constants/navigation.ts"

const KEY = "bonap_home_page"

/** Destination historique de la route `/` — reste le repli si rien n'est choisi. */
export const DEFAULT_HOME_PAGE = "/recipes"

/** Routes proposables comme page d'accueil (les entrées de navigation principales). */
export const HOME_PAGE_ROUTES = NAV_ROUTES.map((route) => route.to)

export const homePageService = {
  /**
   * Route d'accueil enregistrée. Retombe sur `/recipes` si la valeur stockée
   * ne correspond plus à une entrée de navigation (route retirée, données
   * corrompues, préférence synchronisée depuis une version plus récente).
   */
  load(): string {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw && HOME_PAGE_ROUTES.includes(raw)) return raw
    } catch {
      /* localStorage indisponible */
    }
    return DEFAULT_HOME_PAGE
  },

  save(route: string): void {
    const value = HOME_PAGE_ROUTES.includes(route) ? route : DEFAULT_HOME_PAGE
    try {
      localStorage.setItem(KEY, value)
    } catch {
      /* localStorage indisponible */
    }
    saveSettingToServer(KEY, value)
  },
}
