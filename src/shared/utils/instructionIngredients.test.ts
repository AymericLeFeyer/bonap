import { describe, it, expect } from "vitest"
import type { MealieIngredient, MealieInstruction } from "../types/mealie.ts"
import { ingredientsForInstruction } from "./instructionIngredients.ts"

const farine: MealieIngredient = { referenceId: "ref-1", quantity: 250, unit: { name: "g" }, food: { name: "farine" } }
const oeufs: MealieIngredient = { referenceId: "ref-2", quantity: 3, food: { name: "œufs" } }
const lait: MealieIngredient = { referenceId: "ref-3", quantity: 50, unit: { name: "cl" }, food: { name: "lait" } }
const ingredients = [farine, oeufs, lait]

function step(refs: string[]): MealieInstruction {
  return {
    id: "step-1",
    text: "Mélanger",
    ingredientReferences: refs.map((referenceId) => ({ referenceId })),
  }
}

describe("ingredientsForInstruction", () => {
  it("retourne les ingrédients référencés par l'étape", () => {
    expect(ingredientsForInstruction(step(["ref-1", "ref-2"]), ingredients)).toEqual([farine, oeufs])
  })

  it("retourne une liste vide quand l'étape n'associe aucun ingrédient", () => {
    expect(ingredientsForInstruction(step([]), ingredients)).toEqual([])
  })

  it("retourne une liste vide quand le champ est absent (recette sans associations)", () => {
    expect(ingredientsForInstruction({ id: "s", text: "Cuire" }, ingredients)).toEqual([])
  })

  it("ignore une référence vers un ingrédient supprimé", () => {
    expect(ingredientsForInstruction(step(["ref-1", "ref-inconnu"]), ingredients)).toEqual([farine])
  })

  it("suit l'ordre de la liste d'ingrédients, pas celui des références", () => {
    const result = ingredientsForInstruction(step(["ref-3", "ref-1"]), ingredients)
    expect(result).toEqual([farine, lait])
  })

  it("ignore les ingrédients sans referenceId", () => {
    const libre: MealieIngredient = { note: "une pincée de sel" }
    expect(ingredientsForInstruction(step(["ref-1"]), [...ingredients, libre])).toEqual([farine])
  })
})
