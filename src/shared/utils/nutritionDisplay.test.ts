import { describe, expect, it } from "vitest"
import { nutritionForServings } from "./nutritionDisplay.ts"

describe("nutritionForServings", () => {
  it("multiplie une nutrition par portion par le nombre de portions choisi", () => {
    const recipe = { recipeServings: 4, nutrition: { calories: "39.3", proteinContent: "3.2" }, extras: { nutritionPerServing: "true" } }
    expect(nutritionForServings(recipe, 4)).toEqual({ calories: 157.2, proteinContent: 12.8 })
    expect(nutritionForServings(recipe, 1)).toEqual({ calories: 39.3, proteinContent: 3.2 })
  })

  it("ramène d'abord une ancienne nutrition (total de recette) à une portion", () => {
    const recipe = { recipeServings: 4, nutrition: { calories: "800 kcal" }, extras: {} }
    expect(nutritionForServings(recipe, 2)).toEqual({ calories: 400 })
  })

  it("ignore les champs absents ou illisibles", () => {
    expect(nutritionForServings({ nutrition: { calories: "", fatContent: "n/a" } }, 2)).toEqual({})
  })
})
