import { describe, it, expect, vi, beforeEach } from "vitest"
import { AddRecipesToListUseCase } from "./AddRecipesToListUseCase.ts"

vi.mock("../../../infrastructure/shopping/RecipeSlugStore.ts", () => ({
  recipeSlugStore: { set: vi.fn() },
}))

import { recipeSlugStore } from "../../../infrastructure/shopping/RecipeSlugStore.ts"

function makeRepo() {
  return { addRecipes: vi.fn().mockResolvedValue(undefined) }
}

describe("AddRecipesToListUseCase", () => {
  let repo: ReturnType<typeof makeRepo>
  let useCase: AddRecipesToListUseCase

  beforeEach(() => {
    vi.clearAllMocks()
    repo = makeRepo()
    // @ts-expect-error - repo partiel pour les tests
    useCase = new AddRecipesToListUseCase(repo)
  })

  it("délègue l'expansion des ingrédients à Mealie plutôt que de la faire à la main", async () => {
    await useCase.execute("list-1", [
      { recipeId: "r1", recipeName: "Quiche lorraine", recipeSlug: "quiche-lorraine" },
    ])
    expect(repo.addRecipes).toHaveBeenCalledWith("list-1", [{ recipeId: "r1", quantity: 1 }])
  })

  it("transmet le ratio de portions comme facteur d'échelle", async () => {
    // 6 portions demandées sur une recette de 4 → 1.5
    await useCase.execute("list-1", [
      { recipeId: "r1", recipeName: "Pizza", recipeSlug: "pizza", servingsRatio: 1.5 },
    ])
    expect(repo.addRecipes).toHaveBeenCalledWith("list-1", [{ recipeId: "r1", quantity: 1.5 }])
  })

  it("additionne les ratios quand la même recette est planifiée plusieurs fois", async () => {
    await useCase.execute("list-1", [
      { recipeId: "r1", recipeName: "Pizza", recipeSlug: "pizza", servingsRatio: 1 },
      { recipeId: "r1", recipeName: "Pizza", recipeSlug: "pizza", servingsRatio: 0.5 },
      { recipeId: "r2", recipeName: "Salade", recipeSlug: "salade", servingsRatio: 2 },
    ])
    expect(repo.addRecipes).toHaveBeenCalledWith("list-1", [
      { recipeId: "r1", quantity: 1.5 },
      { recipeId: "r2", quantity: 2 },
    ])
  })

  it("retombe sur 1 quand le ratio est absent, nul ou négatif", async () => {
    await useCase.execute("list-1", [
      { recipeId: "r1", recipeName: "A", recipeSlug: "a" },
      { recipeId: "r2", recipeName: "B", recipeSlug: "b", servingsRatio: 0 },
      { recipeId: "r3", recipeName: "C", recipeSlug: "c", servingsRatio: -2 },
    ])
    expect(repo.addRecipes).toHaveBeenCalledWith("list-1", [
      { recipeId: "r1", quantity: 1 },
      { recipeId: "r2", quantity: 1 },
      { recipeId: "r3", quantity: 1 },
    ])
  })

  it("mémorise nom → slug pour la modale de détail", async () => {
    await useCase.execute("list-1", [
      { recipeId: "r1", recipeName: "Quiche lorraine", recipeSlug: "quiche-lorraine" },
    ])
    expect(recipeSlugStore.set).toHaveBeenCalledWith("Quiche lorraine", "quiche-lorraine")
  })

  it("ignore les entrées sans recipeId", async () => {
    await useCase.execute("list-1", [
      { recipeId: "", recipeName: "Sans id", recipeSlug: "sans-id" },
      { recipeId: "r2", recipeName: "OK", recipeSlug: "ok" },
    ])
    expect(repo.addRecipes).toHaveBeenCalledWith("list-1", [{ recipeId: "r2", quantity: 1 }])
  })

  it("n'appelle pas l'API quand il n'y a rien à ajouter", async () => {
    await useCase.execute("list-1", [])
    expect(repo.addRecipes).not.toHaveBeenCalled()
  })
})
