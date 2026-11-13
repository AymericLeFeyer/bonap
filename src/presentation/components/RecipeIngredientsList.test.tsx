import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { RecipeIngredientsList } from "./RecipeIngredientsList.tsx"
import type { MealieIngredient } from "../../shared/types/mealie.ts"

const ingredients = [
  { quantity: 200, unit: { name: "g" }, food: { name: "farine" } },
  { quantity: 0, food: { name: "sel" }, note: "une pincée" },
] as unknown as MealieIngredient[]

describe("RecipeIngredientsList", () => {
  it("affiche les quantités de base sans ratio", () => {
    render(<RecipeIngredientsList ingredients={ingredients} />)
    expect(screen.getByText("200")).toBeTruthy()
  })

  it("met les quantités à l'échelle des portions choisies", () => {
    render(<RecipeIngredientsList ingredients={ingredients} servingsRatio={6 / 4} />)
    expect(screen.getByText("300")).toBeTruthy()
  })

  it("n'affiche pas de quantité nulle", () => {
    render(<RecipeIngredientsList ingredients={ingredients} servingsRatio={2} />)
    expect(screen.queryByText("0")).toBeNull()
  })
})
