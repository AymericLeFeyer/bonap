import { describe, it, expect } from "vitest"
import { buildGuestHistory, previousTastings, recipeTasters } from "./GuestHistoryService.ts"
import type { MealieMealPlan } from "../../../shared/types/mealie.ts"

function meal(id: number, date: string, recipeId: string, text: string): MealieMealPlan {
  return { id, date, entryType: "dinner", recipeId, text, recipe: { id: recipeId, slug: recipeId, name: `Recette ${recipeId}` } }
}

const plans = [
  meal(1, "2026-03-12", "r1", "[s:4][g:Marc,Julie]"),
  meal(2, "2026-05-01", "r2", "[g:marc]anniversaire"),
  meal(3, "2026-06-10", "r1", "[g:Zoé]"),
  meal(4, "2026-06-11", "r3", "sans invité"),
]

describe("buildGuestHistory", () => {
  it("regroupe les invités sans tenir compte de la casse", () => {
    const history = buildGuestHistory(plans)
    expect(history.map((g) => g.name)).toEqual(["Julie", "marc", "Zoé"])
    const marc = history.find((g) => g.name === "marc")!
    expect(marc.meals.map((m) => m.date)).toEqual(["2026-05-01", "2026-03-12"])
  })
})

describe("recipeTasters", () => {
  it("liste qui a goûté une recette et quand", () => {
    const tasters = recipeTasters(buildGuestHistory(plans), "r1")
    expect(tasters).toEqual([
      { name: "Julie", dates: ["2026-03-12"] },
      { name: "marc", dates: ["2026-03-12"] },
      { name: "Zoé", dates: ["2026-06-10"] },
    ])
  })
})

describe("previousTastings", () => {
  it("signale un invité qui a déjà goûté le plat avant ce repas", () => {
    const history = buildGuestHistory(plans)
    const upcoming = meal(5, "2026-12-01", "r1", "[g:MARC,Paul]")
    expect(previousTastings(history, upcoming)).toEqual([{ name: "MARC", date: "2026-03-12" }])
  })

  it("ignore le repas lui-même et les repas postérieurs", () => {
    const history = buildGuestHistory(plans)
    expect(previousTastings(history, plans[0])).toEqual([])
  })
})
