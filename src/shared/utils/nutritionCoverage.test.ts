import { describe, expect, it } from "vitest"
import { coverageLevel, isNutritionPlannable, readNutritionCoverage } from "./nutritionCoverage.ts"

describe("coverageLevel", () => {
  it("applique les seuils 90 % et 70 %", () => {
    expect(coverageLevel(0.95)).toBe("reliable")
    expect(coverageLevel(0.9)).toBe("reliable")
    expect(coverageLevel(0.8)).toBe("partial")
    expect(coverageLevel(0.7)).toBe("partial")
    expect(coverageLevel(0.69)).toBe("unreliable")
  })
})

describe("readNutritionCoverage", () => {
  it("lit la couverture enregistrée dans les extras", () => {
    expect(readNutritionCoverage({ extras: { nutritionCoverage: "0.82" } })).toBe(0.82)
  })

  it("renvoie null pour une nutrition antérieure à la couverture", () => {
    expect(readNutritionCoverage({ extras: {} })).toBeNull()
    expect(readNutritionCoverage({})).toBeNull()
  })
})

describe("isNutritionPlannable", () => {
  it("écarte les estimations non fiables, garde les anciennes nutritions", () => {
    expect(isNutritionPlannable({ extras: { nutritionCoverage: "0.5" } })).toBe(false)
    expect(isNutritionPlannable({ extras: { nutritionCoverage: "0.75" } })).toBe(true)
    expect(isNutritionPlannable({})).toBe(true)
  })
})
