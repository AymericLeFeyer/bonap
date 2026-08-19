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
    // No quantity by default — these tests focus on the un-scaled fallback path.
    // Cases that exercise scaling pass a fully-formed ingredient inline below.
    quantity: 0,
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

  // ─── Scaling (#14) ────────────────────────────────────────────────────────

  it("scale les quantités quand quantity ET unit sont définis", async () => {
    await useCase.execute("list-1", [{
      recipeName: "Pâtes",
      recipeSlug: "pates",
      servingsRatio: 2,
      ingredients: [{
        referenceId: "farine",
        food: { id: "farine", name: "farine" },
        unit: { id: "g", name: "g" },
        quantity: 250,
        note: "",
        originalText: "250g farine",
      }],
    }])
    const items = repo.addItems.mock.calls[0][1]
    expect(items[0].note).toBe("500 g farine — Pâtes")
  })

  it("scale les quantités quantity-only (food sans unit) — '2 oignon' pour ratio 2", async () => {
    await useCase.execute("list-1", [{
      recipeName: "Soupe",
      recipeSlug: "soupe",
      servingsRatio: 2,
      ingredients: [{
        referenceId: "oignon",
        food: { id: "oignon", name: "oignon" },
        quantity: 1,
        note: "",
        originalText: "1 oignon",
      }],
    }])
    const items = repo.addItems.mock.calls[0][1]
    expect(items[0].note).toBe("2 oignon — Soupe")
  })

  it("fallback nom brut quand quantity > 0 mais ni food ni unit (impossible à formater)", async () => {
    await useCase.execute("list-1", [{
      recipeName: "Pâtes",
      recipeSlug: "pates",
      servingsRatio: 3,
      ingredients: [{
        referenceId: "x",
        food: null,
        unit: null,
        quantity: 1,
        note: "1 cup farine",
        originalText: "1 cup farine",
      }],
    }])
    const items = repo.addItems.mock.calls[0][1]
    expect(items[0].note).toBe("1 cup farine — Pâtes")
  })

  it("traite servingsRatio absent ou <= 0 comme 1 (pas de scaling)", async () => {
    await useCase.execute("list-1", [{
      recipeName: "R",
      recipeSlug: "r",
      ingredients: [{
        referenceId: "lait",
        food: { id: "lait", name: "lait" },
        unit: { id: "ml", name: "ml" },
        quantity: 100,
        note: "",
        originalText: "",
      }],
    }])
    const items = repo.addItems.mock.calls[0][1]
    expect(items[0].note).toBe("100 ml lait — R")
  })

  it("formate les quantités fractionnaires sans .0 superflu", async () => {
    await useCase.execute("list-1", [{
      recipeName: "R",
      recipeSlug: "r",
      servingsRatio: 1.5,
      ingredients: [{
        referenceId: "huile",
        food: { id: "huile", name: "huile" },
        unit: { id: "cl", name: "cl" },
        quantity: 2,
        note: "",
        originalText: "",
      }],
    }])
    const items = repo.addItems.mock.calls[0][1]
    expect(items[0].note).toBe("3 cl huile — R")
  })
})
