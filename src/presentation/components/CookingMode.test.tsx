import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { MealieIngredient, MealieInstruction } from "../../shared/types/mealie.ts"
import { CookingMode } from "./CookingMode.tsx"

const ingredients: MealieIngredient[] = [
  { referenceId: "ref-1", quantity: 250, unit: { name: "g" }, food: { name: "farine" } },
  { referenceId: "ref-2", quantity: 3, food: { name: "œufs" } },
  { referenceId: "ref-3", quantity: 50, unit: { name: "cl" }, food: { name: "lait" } },
]

const instructions: MealieInstruction[] = [
  {
    id: "step-1",
    text: "Mélanger la farine et les œufs",
    ingredientReferences: [{ referenceId: "ref-1" }, { referenceId: "ref-2" }],
  },
  { id: "step-2", text: "Cuire à la poêle" },
]

function renderCookingMode(props: Partial<Parameters<typeof CookingMode>[0]> = {}) {
  return render(
    <CookingMode
      recipeName="Crêpes"
      ingredients={ingredients}
      instructions={instructions}
      onClose={vi.fn()}
      {...props}
    />,
  )
}

/** Passe de l'écran ingrédients à l'étape 1. */
async function goToFirstStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Commencer" }))
}

describe("CookingMode", () => {
  it("affiche les ingrédients associés à l'étape courante", async () => {
    const user = userEvent.setup()
    renderCookingMode()
    await goToFirstStep(user)

    const panel = screen.getByText("Pour cette étape").closest("div")!
    expect(panel).toHaveTextContent("250")
    expect(panel).toHaveTextContent("farine")
    expect(panel).toHaveTextContent("œufs")
    expect(panel).not.toHaveTextContent("lait")
  })

  it("n'affiche pas d'encart sur une étape sans ingrédients associés", async () => {
    const user = userEvent.setup()
    renderCookingMode()
    await goToFirstStep(user)
    await user.click(screen.getByRole("button", { name: "Suivant" }))

    expect(screen.queryByText("Pour cette étape")).not.toBeInTheDocument()
    expect(screen.getByText("Cuire à la poêle")).toBeInTheDocument()
  })

  it("met les quantités de l'étape à l'échelle des portions demandées", async () => {
    const user = userEvent.setup()
    renderCookingMode({ baseServings: 4, targetServings: 8 })
    await goToFirstStep(user)

    const panel = screen.getByText("Pour cette étape").closest("div")!
    expect(panel).toHaveTextContent("500")
    expect(panel).toHaveTextContent("6")
  })

  it("n'affiche aucun encart pour une recette sans associations", async () => {
    const user = userEvent.setup()
    renderCookingMode({
      instructions: [{ id: "s1", text: "Tout mélanger" }],
    })
    await goToFirstStep(user)

    expect(screen.queryByText("Pour cette étape")).not.toBeInTheDocument()
  })

  it("affiche les unités comme Mealie : abréviation et pluriel accordé", () => {
    // L'API renvoie l'unité complète ; `pluralName` et `abbreviation` valent
    // null quand ils ne sont pas renseignés.
    renderCookingMode({
      ingredients: [
        {
          referenceId: "u-1",
          quantity: 200,
          unit: { name: "gramme", abbreviation: "g", useAbbreviation: true, pluralName: null },
          food: { name: "farine" },
        },
        {
          referenceId: "u-2",
          quantity: 4,
          unit: { name: "gousse", pluralName: "gousses", abbreviation: "", useAbbreviation: false },
          food: { name: "ail" },
        },
      ],
      instructions: [{ id: "s1", text: "Mélanger" }],
    })

    expect(screen.getByText("g")).toBeInTheDocument()
    expect(screen.queryByText("gramme")).not.toBeInTheDocument()
    expect(screen.getByText("gousses")).toBeInTheDocument()
  })

  it("accorde le pluriel sur la quantité mise à l'échelle, pas sur celle de base", () => {
    // 1 gousse pour 4 portions, portées à 8 : 2 gousses.
    renderCookingMode({
      baseServings: 4,
      targetServings: 8,
      ingredients: [
        {
          referenceId: "u-3",
          quantity: 1,
          unit: { name: "gousse", pluralName: "gousses", useAbbreviation: false },
          food: { name: "ail" },
        },
      ],
      instructions: [{ id: "s1", text: "Mélanger" }],
    })

    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("gousses")).toBeInTheDocument()
  })
})
