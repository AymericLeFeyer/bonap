import { describe, it, expect, vi, beforeEach } from "vitest"
import { ShoppingRepository } from "./ShoppingRepository.ts"

// ─── Fake API client ──────────────────────────────────────────────────────────

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    uploadImage: vi.fn(),
    postSse: vi.fn(),
    ...overrides,
  }
}

// On injecte le client en monkey-patchant l'import — les repos utilisent
// le singleton `mealieApiClient`. On le remplace via vi.mock pour simplifier.
vi.mock("../api/index.ts", () => ({ mealieApiClient: {} }))
import { mealieApiClient } from "../api/index.ts"

// ─── Helpers de fixture ───────────────────────────────────────────────────────

function rawItem(overrides = {}) {
  return {
    id: "item-1",
    shoppingListId: "list-1",
    checked: false,
    position: 0,
    isFood: true,
    note: "Lait",
    quantity: 2,
    unit: { name: "L" },
    food: { name: "lait" },
    label: { id: "label-1", name: "Produits laitiers", color: "#aaa" },
    display: "2 L lait",
    recipeReferences: [],
    ...overrides,
  }
}

function listResponse(items = [rawItem()]) {
  return {
    id: "list-1",
    name: "Bonap",
    listItems: items,
    labelSettings: [
      { label: { id: "label-1", name: "Produits laitiers", color: "#aaa" } },
    ],
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ShoppingRepository", () => {
  let repo: ShoppingRepository
  let client: ReturnType<typeof makeClient>

  beforeEach(() => {
    client = makeClient()
    Object.assign(mealieApiClient, client)
    repo = new ShoppingRepository()
  })

  // ── getOrCreateDefaultList ──────────────────────────────────────────────────

  describe("getOrCreateDefaultList", () => {
    it("retourne la liste existante 'Bonap'", async () => {
      client.get.mockResolvedValue({
        items: [{ id: "list-bonap", name: "Bonap" }],
      })
      const list = await repo.getOrCreateDefaultList()
      expect(list.id).toBe("list-bonap")
      expect(list.name).toBe("Bonap")
    })

    it("crée la liste si 'Bonap' est absente", async () => {
      client.get.mockResolvedValue({ items: [] })
      client.post.mockResolvedValue({ id: "list-new", name: "Bonap" })
      const list = await repo.getOrCreateDefaultList()
      expect(client.post).toHaveBeenCalledWith(
        "/api/households/shopping/lists",
        { name: "Bonap" },
      )
      expect(list.id).toBe("list-new")
    })
  })

  // ── getItems — mapItem ──────────────────────────────────────────────────────

  describe("getItems", () => {
    it("mappe correctement un item avec food, unit et label", async () => {
      client.get
        .mockResolvedValueOnce(listResponse())   // shopping list
        .mockResolvedValueOnce({ items: [] })      // recipes (fallback)
      const { items, labels } = await repo.getItems("list-1")
      expect(items).toHaveLength(1)
      const item = items[0]
      expect(item.foodName).toBe("lait")
      expect(item.unitName).toBe("L")
      expect(item.label?.name).toBe("Produits laitiers")
      expect(item.source).toBe("mealie")
      expect(labels).toHaveLength(1)
      expect(labels[0].name).toBe("Produits laitiers")
    })

    it("filtre les items dont shoppingListId ne correspond pas", async () => {
      const wrongItem = rawItem({ shoppingListId: "other-list" })
      client.get
        .mockResolvedValueOnce(listResponse([wrongItem]))
        .mockResolvedValueOnce({ items: [] })
      const { items } = await repo.getItems("list-1")
      expect(items).toHaveLength(0)
    })

    it("récupère les noms de recettes via recipeReferences", async () => {
      const item = rawItem({
        recipeReferences: [{ recipeId: "r1", recipe: { name: "Quiche lorraine" } }],
      })
      client.get
        .mockResolvedValueOnce(listResponse([item]))
        .mockResolvedValueOnce({ items: [] })
      const { items } = await repo.getItems("list-1")
      expect(items[0].recipeNames).toEqual(["Quiche lorraine"])
    })
  })

  // ── deleteItem — quirk & final ──────────────────────────────────────────────

  describe("deleteItem", () => {
    it("appelle DELETE avec le quirk '&' final sur un seul id", async () => {
      client.delete.mockResolvedValue(undefined)
      await repo.deleteItem("list-1", "item-abc")
      expect(client.delete).toHaveBeenCalledWith(
        "/api/households/shopping/items?ids=item-abc&",
      )
    })
  })

  describe("deleteCheckedItems", () => {
    it("construit la query string avec '&' final pour plusieurs ids", async () => {
      client.delete.mockResolvedValue(undefined)
      const items = [
        { id: "id-1", checked: true, source: "mealie" as const },
        { id: "id-2", checked: true, source: "mealie" as const },
        { id: "id-3", checked: false, source: "mealie" as const }, // pas coché → ignoré
      ] as Parameters<typeof repo.deleteCheckedItems>[1]
      await repo.deleteCheckedItems("list-1", items)
      const url = client.delete.mock.calls[0][0] as string
      expect(url).toContain("ids=id-1")
      expect(url).toContain("ids=id-2")
      expect(url).not.toContain("id-3")
      expect(url.endsWith("&")).toBe(true)
    })

    it("ne fait aucun appel si aucun item coché", async () => {
      const items = [{ id: "id-1", checked: false, source: "mealie" as const }] as Parameters<typeof repo.deleteCheckedItems>[1]
      await repo.deleteCheckedItems("list-1", items)
      expect(client.delete).not.toHaveBeenCalled()
    })
  })

  // ── updateItem — fallback PUT null ──────────────────────────────────────────

  describe("updateItem", () => {
    const itemUpdate = {
      id: "item-1",
      shoppingListId: "list-1",
      checked: true,
      position: 0,
      isFood: true,
    }

    it("retourne l'item mappé si l'API répond avec un tableau", async () => {
      client.put.mockResolvedValue([rawItem({ checked: true })])
      const result = await repo.updateItem("list-1", itemUpdate)
      expect(result.checked).toBe(true)
      expect(result.foodName).toBe("lait")
    })

    it("retourne un fallback si l'API retourne null (quirk Mealie)", async () => {
      client.put.mockResolvedValue(null)
      const result = await repo.updateItem("list-1", itemUpdate)
      expect(result.id).toBe("item-1")
      expect(result.checked).toBe(true)
      expect(result.source).toBe("mealie")
    })

    it("retourne un fallback si l'API retourne un tableau vide", async () => {
      client.put.mockResolvedValue([])
      const result = await repo.updateItem("list-1", itemUpdate)
      expect(result.id).toBe("item-1")
    })
  })
})
