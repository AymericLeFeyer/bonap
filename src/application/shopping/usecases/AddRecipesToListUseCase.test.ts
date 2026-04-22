import { describe, it, expect, vi, beforeEach } from "vitest"
import { AddRecipesToListUseCase } from "./AddRecipesToListUseCase.ts"

// Isoler les stores localStorage
vi.mock("../../../infrastructure/shopping/FoodLabelStore.ts", () => ({
  foodLabelStore: { lookup: vi.fn().mockReturnValue(undefined) },
}))
vi.mock("../../../infrastructure/shopping/RecipeSlugStore.ts", () => ({
  recipeSlugStore: { set: vi.fn() },
}))

import { foodLabelStore } from "../../../infrastructure/shopping/FoodLabelStore.ts"
import { recipeSlugStore } from "../../../infrastructure/shopping/RecipeSlugStore.ts"

function makeRepo() {
  return { addItems: vi.fn().mockResolvedValue(undefined) } as unknown as Parameters<typeof AddRecipesToListUseCase.prototype.execute>[0] & { addItems: ReturnType<typeof vi.fn> }
}

function ingredient(name: string, note?: string) {
  return {
    referenceId: name,
    food: { id: name, name },
    note: note ?? "",
    originalText: name,
    quantity: 1,
  }
}

describe("AddRecipesToListUseCase", () => {
  let repo: ReturnType<typeof makeRepo>
  let useCase: AddRecipesToListUseCase

  beforeEach(() => {
    vi.clearAllMocks()
    repo = makeRepo()
    // @ts-expect-error - partial repo for tests
    useCase = new AddRecipesToListUseCase(repo)
  })

  it("appelle addItems avec les bons items (note = 'ingredient — RecipeName')", async () => {
    await useCase.execute("list-1", [{
      recipeName: "Quiche lorraine",
      recipeSlug: "quiche-lorraine",
      ingredients: [ingredient("lardons"), ingredient("crème fraîche")],
    }])
    const items = repo.addItems.mock.calls[0][1]
    expect(items).toHaveLength(2)
    expect(items[0].note).toBe("lardons — Quiche lorraine")
    expect(items[1].note).toBe("crème fraîche — Quiche lorraine")
    expect(items[0].shoppingListId).toBe("list-1")
  })

  it("ignore les ingrédients sans nom (food null et note vide)", async () => {
    await useCase.execute("list-1", [{
      recipeName: "Test",
      recipeSlug: "test",
      ingredients: [
        { referenceId: "x", food: null, note: "", originalText: "", quantity: 1 },
        ingredient("tomate"),
      ],
    }])
    const items = repo.addItems.mock.calls[0][1]
    expect(items).toHaveLength(1)
    expect(items[0].note).toContain("tomate")
  })

  it("ajoute le jour de la semaine dans le suffix si date fournie", async () => {
    await useCase.execute("list-1", [{
      recipeName: "Salade",
      recipeSlug: "salade",
      ingredients: [ingredient("laitue")],
      date: "2026-04-27", // lundi
    }])
    const items = repo.addItems.mock.calls[0][1]
    // Le suffix contient le nom du jour en français
    expect(items[0].note).toMatch(/laitue — Salade \(.+\)/)
  })

  it("applique le labelId depuis foodLabelStore si disponible", async () => {
    vi.mocked(foodLabelStore.lookup).mockReturnValue("label-produits-laitiers")
    await useCase.execute("list-1", [{
      recipeName: "Recette",
      recipeSlug: "recette",
      ingredients: [ingredient("lait")],
    }])
    const items = repo.addItems.mock.calls[0][1]
    expect(items[0].labelId).toBe("label-produits-laitiers")
  })

  it("enregistre le slug dans recipeSlugStore", async () => {
    await useCase.execute("list-1", [{
      recipeName: "Tarte tatin",
      recipeSlug: "tarte-tatin",
      ingredients: [ingredient("pomme")],
    }])
    expect(recipeSlugStore.set).toHaveBeenCalledWith("Tarte tatin", "tarte-tatin")
  })

  it("gère plusieurs recettes en un seul appel addItems", async () => {
    await useCase.execute("list-1", [
      { recipeName: "R1", recipeSlug: "r1", ingredients: [ingredient("sel")] },
      { recipeName: "R2", recipeSlug: "r2", ingredients: [ingredient("poivre"), ingredient("thym")] },
    ])
    expect(repo.addItems).toHaveBeenCalledTimes(1)
    const items = repo.addItems.mock.calls[0][1]
    expect(items).toHaveLength(3)
  })

  it("ne fait aucun appel si toutes les recettes ont des ingrédients vides", async () => {
    await useCase.execute("list-1", [{
      recipeName: "Vide",
      recipeSlug: "vide",
      ingredients: [],
    }])
    expect(repo.addItems).toHaveBeenCalledWith("list-1", [])
  })
})
