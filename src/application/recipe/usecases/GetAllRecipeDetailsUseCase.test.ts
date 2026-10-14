import { describe, expect, it, vi } from "vitest"
import type { IRecipeRepository } from "../../../domain/recipe/repositories/IRecipeRepository.ts"
import { GetAllRecipeDetailsUseCase } from "./GetAllRecipeDetailsUseCase.ts"

function repositoryWith(slugsByPage: string[][]) {
  return {
    getAll: vi.fn(async (page: number) => ({
      items: slugsByPage[page - 1].map((slug) => ({ id: slug, slug, name: slug })),
      total: slugsByPage.flat().length,
      page,
      perPage: 100,
      totalPages: slugsByPage.length,
    })),
    getBySlug: vi.fn(async (slug: string) => ({ id: slug, slug, name: slug, nutrition: { calories: "100" } })),
  }
}

describe("GetAllRecipeDetailsUseCase", () => {
  it("relit chaque recette de toutes les pages pour obtenir nutrition et extras", async () => {
    const repository = repositoryWith([["a", "b"], ["c"]])
    const onProgress = vi.fn()

    const recipes = await new GetAllRecipeDetailsUseCase(repository as unknown as IRecipeRepository).execute({ onProgress })

    expect(repository.getAll).toHaveBeenCalledTimes(2)
    expect(recipes.map((recipe) => recipe.slug)).toEqual(["a", "b", "c"])
    expect(recipes[0].nutrition?.calories).toBe("100")
    expect(onProgress).toHaveBeenLastCalledWith(3, 3)
  })

  it("s'interrompt quand le chargement est annulé", async () => {
    const repository = repositoryWith([["a"]])
    const controller = new AbortController()
    controller.abort()

    await expect(
      new GetAllRecipeDetailsUseCase(repository as unknown as IRecipeRepository).execute({ signal: controller.signal }),
    ).rejects.toThrow()
    expect(repository.getBySlug).not.toHaveBeenCalled()
  })
})
