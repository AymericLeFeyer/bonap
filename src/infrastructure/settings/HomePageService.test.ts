import { describe, it, expect, beforeEach } from "vitest"
import { homePageService, DEFAULT_HOME_PAGE, HOME_PAGE_ROUTES } from "./HomePageService.ts"

describe("homePageService", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("retourne la page recettes par défaut", () => {
    expect(homePageService.load()).toBe(DEFAULT_HOME_PAGE)
  })

  it("relit la page enregistrée", () => {
    homePageService.save("/planning")
    expect(homePageService.load()).toBe("/planning")
  })

  it("ignore une route inconnue et retombe sur la valeur par défaut", () => {
    homePageService.save("/nimportequoi")
    expect(homePageService.load()).toBe(DEFAULT_HOME_PAGE)
  })

  it("ignore une valeur corrompue déjà présente dans localStorage", () => {
    localStorage.setItem("bonap_home_page", "/route-supprimee")
    expect(homePageService.load()).toBe(DEFAULT_HOME_PAGE)
  })

  it("accepte toutes les entrées de navigation", () => {
    for (const route of HOME_PAGE_ROUTES) {
      homePageService.save(route)
      expect(homePageService.load()).toBe(route)
    }
  })
})
