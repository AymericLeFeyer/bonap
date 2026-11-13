import { describe, expect, it } from "vitest"
import { MICRONUTRIENTS, micronutrientsForServings, micronutrientsToStore } from "./micronutrients.ts"
import { NUTRITION_EXTRAS } from "./nutritionCoverage.ts"

describe("micronutrientsToStore", () => {
  it("garde les valeurs assez couvertes et retire les autres", () => {
    const stored = micronutrientsToStore({
      iron: { perServing: 3.2, coverage: 0.95 },
      iodine: { perServing: 4, coverage: 0.4 },
      vitaminB12: { perServing: 0, coverage: 1 },
    })
    expect(stored[NUTRITION_EXTRAS.ironMg]).toBe(3.2)
    // Mesuré à zéro sur toute la recette : un vrai 0, conservé.
    expect(stored[NUTRITION_EXTRAS.vitaminB12Ug]).toBe(0)
    expect(stored[NUTRITION_EXTRAS.iodineUg]).toBeNull()
    expect(stored[NUTRITION_EXTRAS.zincMg]).toBeNull()
    expect(Object.keys(stored)).toHaveLength(MICRONUTRIENTS.length)
  })

  it("retire tout si l'estimation n'a pas de micronutriments (ancien BFF)", () => {
    expect(Object.values(micronutrientsToStore(undefined)).every((value) => value === null)).toBe(true)
  })
})

describe("micronutrientsForServings", () => {
  const extras = { nutritionPerServing: "true", nutritionIronMg: "2.5", nutritionAlaG: "0.123" }

  it("multiplie par les portions et laisse les absents à null", () => {
    const rows = micronutrientsForServings({ extras }, 2)
    expect(rows?.find((row) => row.field === "iron")?.value).toBe(5)
    expect(rows?.find((row) => row.field === "ala")?.value).toBe(0.25)
    expect(rows?.find((row) => row.field === "iodine")?.value).toBeNull()
  })

  it("ne montre rien pour une nutrition sans micronutriments", () => {
    expect(micronutrientsForServings({ extras: { nutritionPerServing: "true" } }, 2)).toBeNull()
  })

  it("ignore les micronutriments d'une nutrition qui n'est pas par portion", () => {
    expect(micronutrientsForServings({ extras: { nutritionIronMg: "2.5" } }, 2)).toBeNull()
  })
})
