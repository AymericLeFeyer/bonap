import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem, ShoppingLabel, ShoppingList } from "../../../domain/shopping/entities/ShoppingItem.ts"
import type {
  MealieShoppingItem,
  MealieShoppingItemCreate,
  MealieShoppingItemUpdate,
  MealieShoppingList,
  MealieRawPaginatedShoppingLists,
} from "../../../shared/types/mealie.ts"
import { mealieApiClient } from "../api/index.ts"

const DEFAULT_LIST_NAME = "Bonap"
const HABITUELS_LIST_NAME = "Habituels"

function mapItem(raw: MealieShoppingItem, recipeById: Map<string, string> = new Map()): ShoppingItem {
  const recipeNames = (raw.recipeReferences ?? [])
    .map((r) => r.recipe?.name ?? recipeById.get(r.recipeId))
    .filter((n): n is string => Boolean(n))
  return {
    id: raw.id,
    shoppingListId: raw.shoppingListId,
    checked: raw.checked,
    position: raw.position,
    isFood: raw.isFood,
    note: raw.note,
    quantity: raw.quantity,
    unitName: raw.unit?.name,
    foodName: raw.food?.name,
    label: raw.label
      ? { id: raw.label.id, name: raw.label.name, color: raw.label.color }
      : undefined,
    display: raw.display,
    recipeNames: recipeNames.length > 0 ? recipeNames : undefined,
    source: "mealie",
  }
}

export class ShoppingRepository implements IShoppingRepository {
  private async getOrCreateList(name: string, allLists?: MealieRawPaginatedShoppingLists): Promise<ShoppingList> {
    const raw = allLists ?? await mealieApiClient.get<MealieRawPaginatedShoppingLists>(
      "/api/households/shopping/lists?page=1&perPage=-1",
    )

    const existing = raw.items.find((l) => l.name === name)

    if (existing) {
      return { id: existing.id, name: existing.name, labels: [] }
    }

    const created = await mealieApiClient.post<{ id: string; name: string }>(
      "/api/households/shopping/lists",
      { name },
    )
    return { id: created.id, name: created.name, labels: [] }
  }

  async getOrCreateDefaultList(): Promise<ShoppingList> {
    return this.getOrCreateList(DEFAULT_LIST_NAME)
  }

  async getOrCreateHabituelsList(): Promise<ShoppingList> {
    return this.getOrCreateList(HABITUELS_LIST_NAME)
  }

  async getItems(listId: string): Promise<{ items: ShoppingItem[]; labels: ShoppingLabel[] }> {
    const [raw, recipesRaw] = await Promise.all([
      mealieApiClient.get<MealieShoppingList>(`/api/households/shopping/lists/${listId}`),
      mealieApiClient.get<{ items?: Array<{ id: string; name: string }> }>("/api/recipes?page=1&perPage=500").catch(() => ({ items: [] })),
    ])
    const recipeById = new Map((recipesRaw.items ?? []).map((r) => [r.id, r.name]))
    const labels: ShoppingLabel[] = (raw.labelSettings ?? []).map((s) => ({
      id: s.label.id,
      name: s.label.name,
      color: s.label.color,
    }))
    return {
      items: (raw.listItems ?? []).filter((i) => i.shoppingListId === listId).map((i) => mapItem(i, recipeById)),
      labels,
    }
  }

  async addItem(listId: string, data: MealieShoppingItemCreate): Promise<void> {
    await mealieApiClient.post(
      "/api/households/shopping/items/create-bulk",
      [{ ...data, shoppingListId: listId }],
    )
  }

  async addRecipeToList(listId: string, recipeId: string): Promise<void> {
    await mealieApiClient.post(
      `/api/households/shopping/lists/${listId}/recipe/${recipeId}`,
      {},
    )
  }

  async updateItem(_listId: string, item: MealieShoppingItemUpdate): Promise<ShoppingItem> {
    const raw = await mealieApiClient.put<MealieShoppingItem[] | null>(
      "/api/households/shopping/items",
      [item],
    )
    if (raw?.[0]) return mapItem(raw[0])
    // Fallback: construct from sent data if the API returns nothing
    return {
      id: item.id,
      shoppingListId: item.shoppingListId,
      checked: item.checked,
      position: item.position,
      isFood: item.isFood,
      note: item.note,
      quantity: item.quantity,
      display: item.display,
      source: "mealie",
    }
  }

  async deleteItem(_listId: string, itemId: string): Promise<void> {
    await mealieApiClient.delete(`/api/households/shopping/items?ids=${itemId}&`)
  }

  async deleteCheckedItems(_listId: string, items: ShoppingItem[]): Promise<void> {
    const ids = items.filter((i) => i.checked && i.source === "mealie").map((i) => i.id)
    if (!ids.length) return
    const query = ids.map((id) => `ids=${id}`).join("&")
    await mealieApiClient.delete(`/api/households/shopping/items?${query}&`)
  }

  async deleteAllItems(_listId: string, items: ShoppingItem[]): Promise<void> {
    const ids = items.filter((i) => i.source === "mealie").map((i) => i.id)
    if (!ids.length) return
    const query = ids.map((id) => `ids=${id}`).join("&")
    await mealieApiClient.delete(`/api/households/shopping/items?${query}&`)
  }
}
