import { describe, it, expect } from "vitest"
import { buildRecipePrintHtml } from "./buildRecipePrintHtml.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"

const recipe = {
  id: "1",
  slug: "crepes",
  name: "Crêpes <maison>",
  prepTime: "PT15M",
  recipeServings: 4,
  recipeIngredient: [
    { quantity: 200, unit: { name: "g" }, food: { name: "farine" } },
    { quantity: 0, note: "une pincée de sel" },
  ],
  recipeInstructions: [{ id: "a", text: "Mélanger **doucement**\npuis reposer" }],
} as unknown as MealieRecipe

describe("buildRecipePrintHtml", () => {
  it("échappe le nom de la recette", () => {
    const html = buildRecipePrintHtml(recipe)
    expect(html).toContain("Crêpes &lt;maison&gt;")
    expect(html).not.toContain("<maison>")
  })

  it("met les quantités à l'échelle des portions choisies", () => {
    const html = buildRecipePrintHtml(recipe, { baseServings: 4, targetServings: 6 })
    expect(html).toContain("<strong>300</strong>")
    expect(html).toContain("6 portions")
  })

  it("garde les ingrédients sans quantité et les étapes", () => {
    const html = buildRecipePrintHtml(recipe, { baseServings: 4 })
    expect(html).toContain("une pincée de sel")
    expect(html).toContain("Mélanger doucement<br>puis reposer")
    expect(html).toContain("Préparation : 15 min")
  })

  it("n'insère pas d'image sans URL", () => {
    expect(buildRecipePrintHtml(recipe)).not.toContain("<img")
  })
})
