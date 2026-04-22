import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mock des dépendances externes ─────────────────────────────────────────────
vi.mock("../api/index.ts", () => ({ mealieApiClient: {} }))
vi.mock("../auth/AuthService.ts", () => ({
  AuthService: class {
    getToken() { return "fake-token" }
  },
}))
vi.mock("../../../shared/utils/env.ts", () => ({
  getEnv: vi.fn().mockReturnValue("http://mealie.test"),
  isDockerRuntime: vi.fn().mockReturnValue(false),
  getIngressBasename: vi.fn().mockReturnValue(""),
}))

import { mealieApiClient } from "../api/index.ts"
import { AuthService } from "../auth/AuthService.ts"
import { RecipeRepository } from "./RecipeRepository.ts"

function makeClient(overrides = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    uploadImage: vi.fn(),
    postSse: vi.fn(),
    ...overrides,
  }
}

function authService() {
  return new AuthService() as InstanceType<typeof AuthService>
}

describe("RecipeRepository", () => {
  let client: ReturnType<typeof makeClient>
  let repo: RecipeRepository

  beforeEach(() => {
    client = makeClient()
    Object.assign(mealieApiClient, client)
    repo = new RecipeRepository(authService())
  })

  // ── getAll — normalisation pagination ────────────────────────────────────────

  describe("getAll", () => {
    it("normalise la réponse snake_case de l'API en camelCase", async () => {
      client.get.mockResolvedValue({
        page: 1,
        per_page: 30,
        total: 2,
        total_pages: 1,
        items: [
          { id: "r1", slug: "gaspacho", name: "Gaspacho", tags: [] },
          { id: "r2", slug: "pot-au-feu", name: "Pot-au-feu", tags: [] },
        ],
      })
      const result = await repo.getAll(1, 30)
      expect(result.perPage).toBe(30)
      expect(result.totalPages).toBe(1)
      expect(result.items).toHaveLength(2)
    })

    it("inclut le paramètre search dans l'URL si fourni", async () => {
      client.get.mockResolvedValue({ page: 1, per_page: 30, total: 0, total_pages: 0, items: [] })
      await repo.getAll(1, 30, { search: "pizza" })
      const url = client.get.mock.calls[0][0] as string
      expect(url).toContain("search=pizza")
    })

    it("inclut les catégories dans l'URL si fournies", async () => {
      client.get.mockResolvedValue({ page: 1, per_page: 30, total: 0, total_pages: 0, items: [] })
      await repo.getAll(1, 30, { categories: ["cat-1"] })
      const url = client.get.mock.calls[0][0] as string
      expect(url).toContain("categories=cat-1")
      expect(url).toContain("requireAllCategories=true")
    })
  })

  // ── minutesToString (via update) ─────────────────────────────────────────────

  describe("minutesToString (via update)", () => {
    const baseForm = {
      name: "Test",
      description: "",
      prepTime: "0",
      performTime: "0",
      totalTime: "0",
      seasons: [] as string[],
      categories: [] as Array<{ id: string; name: string; slug: string }>,
      tags: [] as Array<{ id: string; name: string; slug: string }>,
      recipeIngredient: [],
      recipeInstructions: [],
    }

    function setupUpdate(prepTime: string) {
      client.get.mockImplementation((url: string) => {
        if (url.includes("/organizers/tags")) return Promise.resolve({ items: [] })
        return Promise.resolve({ id: "r1", slug: "test", name: "Test", tags: [], prepTime: undefined })
      })
      client.put.mockResolvedValue({ id: "r1" })
      return repo.update("test", { ...baseForm, prepTime })
    }

    it("convertit '30' en '30 minutes'", async () => {
      await setupUpdate("30")
      const putBody = client.put.mock.calls[0][1]
      expect(putBody.prepTime).toBe("30 minutes")
    })

    it("convertit '1' en '1 minute' (singulier)", async () => {
      await setupUpdate("1")
      const putBody = client.put.mock.calls[0][1]
      expect(putBody.prepTime).toBe("1 minute")
    })

    it("envoie undefined pour '0'", async () => {
      await setupUpdate("0")
      const putBody = client.put.mock.calls[0][1]
      expect(putBody.prepTime).toBeUndefined()
    })
  })

  // ── resolveSeasonTags ────────────────────────────────────────────────────────

  describe("resolveSeasonTags (via updateSeasons)", () => {
    function setupGetByUrl(recipe: object, tags: object[]) {
      // updateSeasons appelle getBySlug + resolveSeasonTags en parallèle
      // → on route par URL pour éviter les problèmes d'ordre
      client.get.mockImplementation((url: string) => {
        if (url.includes("/organizers/tags")) return Promise.resolve({ items: tags })
        if (url.includes("/api/recipes/")) return Promise.resolve(recipe)
        return Promise.resolve({})
      })
    }

    it("inclut l'id si le tag de saison existe déjà dans Mealie", async () => {
      setupGetByUrl(
        { id: "r1", slug: "recette", name: "Recette", tags: [] },
        [{ id: "tag-ete", name: "saison-ete", slug: "saison-ete" }],
      )
      client.patch.mockResolvedValue({ id: "r1" })

      await repo.updateSeasons("recette", ["ete"])

      const patchBody = client.patch.mock.calls[0][1]
      const seasonTag = (patchBody.tags as Array<{ id?: string; slug: string }>).find((t) => t.slug === "saison-ete")
      expect(seasonTag?.id).toBe("tag-ete")
    })

    it("crée le tag sans id s'il n'existe pas encore", async () => {
      setupGetByUrl({ id: "r1", slug: "recette", name: "Recette", tags: [] }, [])
      client.patch.mockResolvedValue({ id: "r1" })

      await repo.updateSeasons("recette", ["printemps"])

      const patchBody = client.patch.mock.calls[0][1]
      const seasonTag = (patchBody.tags as Array<{ id?: string; slug: string }>).find((t) => t.slug === "saison-printemps")
      expect(seasonTag?.id).toBeUndefined()
      expect(seasonTag?.name).toBe("saison-printemps")
    })

    it("conserve les tags non-saison existants lors de la mise à jour", async () => {
      setupGetByUrl(
        {
          id: "r1",
          slug: "recette",
          name: "Recette",
          tags: [{ id: "tag-veggie", name: "végétarien", slug: "vegetarien" }],
        },
        [],
      )
      client.patch.mockResolvedValue({ id: "r1" })

      await repo.updateSeasons("recette", ["ete"])

      const patchBody = client.patch.mock.calls[0][1]
      const tags = patchBody.tags as Array<{ slug: string }>
      expect(tags.some((t) => t.slug === "vegetarien")).toBe(true)
      expect(tags.some((t) => t.slug === "saison-ete")).toBe(true)
    })
  })
})
