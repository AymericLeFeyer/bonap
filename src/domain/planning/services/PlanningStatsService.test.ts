import { describe, it, expect } from "vitest"
import {
  computeLeftoverPercentage,
  computeStreak,
  computeCategoryStats,
} from "./PlanningStatsService.ts"
import type { MealieMealPlan, MealieRecipe } from "../../../shared/types/mealie.ts"

function plan(id: number, date: string, entryType: string, recipeId?: string): MealieMealPlan {
  return { id, date, entryType, recipeId }
}

describe("computeLeftoverPercentage", () => {
  it("retourne 0 si moins de 2 repas", () => {
    expect(computeLeftoverPercentage([])).toBe(0)
    expect(computeLeftoverPercentage([plan(1, "2026-04-22", "lunch", "r1")])).toBe(0)
  })

  it("détecte un restes lunch → dinner le même jour", () => {
    const plans = [
      plan(1, "2026-04-22", "lunch", "r1"),
      plan(2, "2026-04-22", "dinner", "r1"),
    ]
    expect(computeLeftoverPercentage(plans)).toBe(100)
  })

  it("détecte un restes dinner → lunch le lendemain", () => {
    const plans = [
      plan(1, "2026-04-22", "dinner", "r1"),
      plan(2, "2026-04-23", "lunch", "r1"),
    ]
    expect(computeLeftoverPercentage(plans)).toBe(100)
  })

  it("ne compte pas des repas espacés de plus d'un jour", () => {
    const plans = [
      plan(1, "2026-04-22", "dinner", "r1"),
      plan(2, "2026-04-25", "lunch", "r1"),
    ]
    expect(computeLeftoverPercentage(plans)).toBe(0)
  })

  it("calcule un pourcentage correct sur plusieurs paires", () => {
    const plans = [
      plan(1, "2026-04-22", "lunch", "r1"),
      plan(2, "2026-04-22", "dinner", "r1"),
      plan(3, "2026-04-23", "lunch", "r2"),
      plan(4, "2026-04-23", "dinner", "r3"),
    ]
    expect(computeLeftoverPercentage(plans)).toBe(33)
  })

  it("ignore un repas sans recipeId", () => {
    const plans = [
      plan(1, "2026-04-22", "lunch"),
      plan(2, "2026-04-22", "dinner", "r1"),
    ]
    expect(computeLeftoverPercentage(plans)).toBe(0)
  })
})

describe("computeStreak", () => {
  it("retourne 0 pour un planning vide", () => {
    expect(computeStreak([], "2026-04-20", "2026-04-26")).toBe(0)
  })

  it("retourne 1 pour une semaine complète", () => {
    const dates = [
      "2026-04-20", "2026-04-21", "2026-04-22",
      "2026-04-23", "2026-04-24", "2026-04-25", "2026-04-26",
    ]
    const plans = dates.map((date, i) => plan(i, date, "dinner", "r1"))
    expect(computeStreak(plans, "2026-04-20", "2026-04-26")).toBe(1)
  })

  it("retourne 0 s'il manque un jour dans la semaine", () => {
    const dates = [
      "2026-04-20", "2026-04-21", "2026-04-22",
      "2026-04-23", "2026-04-24", "2026-04-25", // manque 04-26
    ]
    const plans = dates.map((date, i) => plan(i, date, "dinner", "r1"))
    expect(computeStreak(plans, "2026-04-20", "2026-04-26")).toBe(0)
  })
})

function recipe(name: string, categoryNames: string[]): MealieRecipe {
  return {
    id: name,
    slug: name,
    name,
    recipeCategory: categoryNames.map((n, i) => ({
      id: `c${i}`,
      name: n,
      slug: n,
    })),
  }
}

describe("computeCategoryStats", () => {
  it("retourne [] pour un set vide", () => {
    expect(computeCategoryStats([])).toEqual([])
  })

  it("compte les catégories et trie par count décroissant", () => {
    const recipes = [
      recipe("r1", ["Plat principal"]),
      recipe("r2", ["Plat principal"]),
      recipe("r3", ["Dessert"]),
    ]
    const stats = computeCategoryStats(recipes)
    expect(stats).toHaveLength(2)
    expect(stats[0]).toEqual({ name: "Plat principal", count: 2, percentage: 67 })
    expect(stats[1]).toEqual({ name: "Dessert", count: 1, percentage: 33 })
  })

  it("marque les recettes sans catégorie comme 'Sans catégorie'", () => {
    const recipes = [recipe("r1", [])]
    const stats = computeCategoryStats(recipes)
    expect(stats).toEqual([{ name: "Sans catégorie", count: 1, percentage: 100 }])
  })

  it("compte chaque catégorie d'une recette multi-catégories", () => {
    const recipes = [recipe("r1", ["Plat principal", "Végétarien"])]
    const stats = computeCategoryStats(recipes)
    expect(stats).toHaveLength(2)
    expect(stats.find((s) => s.name === "Plat principal")?.count).toBe(1)
    expect(stats.find((s) => s.name === "Végétarien")?.count).toBe(1)
  })
})
