import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getCurrentSeason, getRecipeSeasonsFromTags, isSeasonTag } from "./season.ts"

describe("getCurrentSeason", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("retourne 'printemps' en mars", () => {
    vi.setSystemTime(new Date("2026-03-15"))
    expect(getCurrentSeason()).toBe("printemps")
  })

  it("retourne 'printemps' en mai", () => {
    vi.setSystemTime(new Date("2026-05-15"))
    expect(getCurrentSeason()).toBe("printemps")
  })

  it("retourne 'ete' en juillet", () => {
    vi.setSystemTime(new Date("2026-07-15"))
    expect(getCurrentSeason()).toBe("ete")
  })

  it("retourne 'automne' en octobre", () => {
    vi.setSystemTime(new Date("2026-10-15"))
    expect(getCurrentSeason()).toBe("automne")
  })

  it("retourne 'hiver' en janvier", () => {
    vi.setSystemTime(new Date("2026-01-15"))
    expect(getCurrentSeason()).toBe("hiver")
  })

  it("retourne 'hiver' en décembre", () => {
    vi.setSystemTime(new Date("2026-12-15"))
    expect(getCurrentSeason()).toBe("hiver")
  })
})

describe("getRecipeSeasonsFromTags", () => {
  it("retourne [] pour tags vides ou undefined", () => {
    expect(getRecipeSeasonsFromTags(undefined)).toEqual([])
    expect(getRecipeSeasonsFromTags([])).toEqual([])
  })

  it("extrait les saisons préfixées 'saison-'", () => {
    const tags = [
      { id: "1", name: "saison-ete", slug: "saison-ete" },
      { id: "2", name: "rapide", slug: "rapide" },
    ]
    expect(getRecipeSeasonsFromTags(tags)).toEqual(["ete"])
  })

  it("extrait plusieurs saisons", () => {
    const tags = [
      { id: "1", name: "saison-printemps", slug: "saison-printemps" },
      { id: "2", name: "saison-ete", slug: "saison-ete" },
    ]
    expect(getRecipeSeasonsFromTags(tags)).toEqual(["printemps", "ete"])
  })

  it("ignore les tags saison- invalides", () => {
    const tags = [
      { id: "1", name: "saison-inexistante", slug: "saison-inexistante" },
      { id: "2", name: "saison-hiver", slug: "saison-hiver" },
    ]
    expect(getRecipeSeasonsFromTags(tags)).toEqual(["hiver"])
  })
})

describe("isSeasonTag", () => {
  it("retourne true pour un tag saison-", () => {
    expect(isSeasonTag({ id: "1", name: "saison-ete", slug: "saison-ete" })).toBe(true)
  })

  it("retourne false pour un tag non saison", () => {
    expect(isSeasonTag({ id: "1", name: "rapide", slug: "rapide" })).toBe(false)
  })
})
