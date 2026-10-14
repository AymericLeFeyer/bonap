import { describe, expect, it } from "vitest"
import type { MealieRecipe } from "../types/mealie.ts"
import { generateBalancedMealPlan } from "./balancedMealPlanner.ts"

const LUNCH = [{ date: "2026-10-05", entryType: "lunch" as const }]

function recipe(slug: string, calories: string, extras: Record<string, string>): MealieRecipe {
  return {
    id: slug,
    slug,
    name: slug,
    recipeServings: 4,
    nutrition: { calories, proteinContent: "30", carbohydrateContent: "65", fatContent: "22", fiberContent: "8" },
    extras,
  }
}

describe("generateBalancedMealPlan — nutrition CIQUAL", () => {
  it("ne divise pas par les portions une nutrition déjà exprimée par portion", () => {
    const perServing = recipe("par-portion", "680", { nutritionPerServing: "true", nutritionCoverage: "0.95" })
    const wholeRecipe = recipe("recette-entiere", "680", {})

    const [planned] = generateBalancedMealPlan([wholeRecipe, perServing], [], LUNCH)

    expect(planned.recipe.slug).toBe("par-portion")
  })

  it("ignore l'estimation d'une recette non fiable (couverture < 70 %)", () => {
    const unreliable = recipe("non-fiable", "680", { nutritionPerServing: "true", nutritionCoverage: "0.5" })
    const reliable = recipe("fiable", "400", { nutritionPerServing: "true", nutritionCoverage: "0.95" })

    const [planned] = generateBalancedMealPlan([unreliable, reliable], [], LUNCH)

    expect(planned.recipe.slug).toBe("fiable")
  })
})
