import { describe, it, expect } from "vitest"
import type { MealieRecipe } from "../types/mealie.ts"
import {
  getRecipeServings,
  parseServings,
  encodeServingsInText,
  decodeServingsFromText,
  formatQuantity,
} from "./servings.ts"

function makeRecipe(overrides: Partial<MealieRecipe> = {}): MealieRecipe {
  return { id: "r1", slug: "test", name: "Test", ...overrides }
}

describe("parseServings", () => {
  it("extrait le premier nombre trouvé", () => {
    expect(parseServings("4")).toBe(4)
    expect(parseServings("4 personnes")).toBe(4)
    expect(parseServings("pour 4")).toBe(4)
    expect(parseServings("4-6 personnes")).toBe(4)
  })

  it("retourne undefined si aucun nombre", () => {
    expect(parseServings(undefined)).toBeUndefined()
    expect(parseServings("")).toBeUndefined()
    expect(parseServings("personnes")).toBeUndefined()
  })
})

describe("getRecipeServings", () => {
  // Mealie >= 2 stocke le nombre dans recipeServings et garde recipeYield
  // comme simple libellé d'unité ("personnes", "parts"…).
  it("lit recipeServings en priorité (format Mealie v2/v3)", () => {
    const recipe = makeRecipe({
      recipeServings: 4,
      recipeYieldQuantity: 4,
      recipeYield: "personnes",
    })
    expect(getRecipeServings(recipe)).toBe(4)
  })

  it("retombe sur recipeYieldQuantity si recipeServings est absent", () => {
    const recipe = makeRecipe({ recipeYieldQuantity: 6, recipeYield: "parts" })
    expect(getRecipeServings(recipe)).toBe(6)
  })

  it("retombe sur le nombre contenu dans recipeYield (recettes legacy)", () => {
    const recipe = makeRecipe({ recipeYield: "4 personnes" })
    expect(getRecipeServings(recipe)).toBe(4)
  })

  it("ignore les valeurs nulles ou négatives", () => {
    expect(getRecipeServings(makeRecipe({ recipeServings: 0, recipeYield: "personnes" }))).toBeUndefined()
    expect(getRecipeServings(makeRecipe({ recipeServings: -2 }))).toBeUndefined()
    expect(getRecipeServings(makeRecipe())).toBeUndefined()
    expect(getRecipeServings(undefined)).toBeUndefined()
  })

  it("arrondit les portions fractionnaires renvoyées par l'API", () => {
    // L'API Mealie renvoie des floats (4.0). Une valeur fractionnaire ne doit
    // pas produire un ratio bancal côté affichage.
    expect(getRecipeServings(makeRecipe({ recipeServings: 4.0 }))).toBe(4)
    expect(getRecipeServings(makeRecipe({ recipeServings: 2.5 }))).toBe(2.5)
  })

  it("ne casse pas après une sauvegarde Bonap (recipeYield vidé de ses chiffres)", () => {
    // RecipeRepository.update retire le nombre de recipeYield à chaque save.
    // Une recette éditée dans Bonap doit garder ses portions (issue #14).
    const afterBonapSave = makeRecipe({
      recipeServings: 4,
      recipeYieldQuantity: 4,
      recipeYield: "",
    })
    expect(getRecipeServings(afterBonapSave)).toBe(4)
  })
})

describe("encodeServingsInText / decodeServingsFromText", () => {
  it("encode et décode le nombre de portions dans la note", () => {
    expect(encodeServingsInText(4, "ma note")).toBe("[s:4]ma note")
    expect(decodeServingsFromText("[s:4]ma note")).toEqual({ servings: 4, note: "ma note" })
  })

  it("laisse la note intacte sans préfixe", () => {
    expect(encodeServingsInText(undefined, "ma note")).toBe("ma note")
    expect(decodeServingsFromText("ma note")).toEqual({ servings: undefined, note: "ma note" })
  })
})

describe("formatQuantity", () => {
  it("arrondit à une décimale et supprime le .0", () => {
    expect(formatQuantity(4)).toBe("4")
    expect(formatQuantity(4.05)).toBe("4.1")
    expect(formatQuantity(2.5)).toBe("2.5")
  })
})
