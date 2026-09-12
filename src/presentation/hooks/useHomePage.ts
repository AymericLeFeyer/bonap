import { useCallback, useState } from "react"
import { homePageService, DEFAULT_HOME_PAGE } from "../../infrastructure/settings/HomePageService.ts"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"
import { visibleNavItems } from "../components/navItems.ts"

/**
 * Page sur laquelle atterrir en ouvrant Bonap (route `/`).
 *
 * `resolved` est la route effectivement utilisable : si la page choisie n'est
 * plus accessible (Suggestions IA sans fournisseur configuré), on retombe sur
 * la destination par défaut plutôt que d'ouvrir une page vide.
 */
export function useHomePage() {
  const [homePage, setHomePageState] = useState(() => homePageService.load())

  const setHomePage = useCallback((route: string) => {
    homePageService.save(route)
    setHomePageState(homePageService.load())
  }, [])

  const available = visibleNavItems(llmConfigService.isConfigured())
  const resolved = available.some((item) => item.to === homePage) ? homePage : DEFAULT_HOME_PAGE

  return { homePage, setHomePage, resolved, available }
}
