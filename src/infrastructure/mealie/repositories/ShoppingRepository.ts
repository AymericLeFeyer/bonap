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

function mapItem(raw: MealieShoppingItem): ShoppingItem {
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
    source: "mealie",
  }
}

export class ShoppingRepository implements IShoppingRepository {
  async getOrCreateDefaultList(): Promise<ShoppingList> {
    const raw = await mealieApiClient.get<MealieRawPaginatedShoppingLists>(
      "/api/households/shopping/lists?page=1&perPage=-1",
    )

    const existing = raw.items.find((l) => l.name === DEFAULT_LIST_NAME) ?? raw.items[0]

    if (existing) {
      return { id: existing.id, name: existing.name, labels: [] }
    }

    // No list found: create one
    const created = await mealieApiClient.post<{ id: string; name: string }>(
      "/api/households/shopping/lists",
      { name: DEFAULT_LIST_NAME },
    )
    return { id: created.id, name: created.name, labels: [] }
  }

  async getItems(listId: string): Promise<{ items: ShoppingItem[]; labels: ShoppingLabel[] }> {
    const raw = await mealieApiClient.get<MealieShoppingList>(
      `/api/households/shopping/lists/${listId}`,
    )
    const labels: ShoppingLabel[] = (raw.labelSettings ?? []).map((s) => ({
      id: s.label.id,
      name: s.label.name,
      color: s.label.color,
    }))
    return { items: (raw.listItems ?? []).map(mapItem), labels }
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
