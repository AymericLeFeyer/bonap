import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem, ShoppingList } from "../../../domain/shopping/entities/ShoppingItem.ts"
import type {
  MealieShoppingItem,
  MealieShoppingItemCreate,
  MealieShoppingItemUpdate,
  MealieRawPaginatedShoppingLists,
  MealieRawPaginatedShoppingItems,
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
      return { id: existing.id, name: existing.name }
    }

    // Aucune liste : on en crée une
    const created = await mealieApiClient.post<{ id: string; name: string }>(
      "/api/households/shopping/lists",
      { name: DEFAULT_LIST_NAME },
    )
    return { id: created.id, name: created.name }
  }

  async getItems(listId: string): Promise<ShoppingItem[]> {
    const raw = await mealieApiClient.get<MealieRawPaginatedShoppingItems>(
      `/api/households/shopping/lists/${listId}/items?page=1&perPage=-1`,
    )
    return raw.items.map(mapItem)
  }

  async addItem(listId: string, data: MealieShoppingItemCreate): Promise<ShoppingItem> {
    const raw = await mealieApiClient.post<MealieShoppingItem>(
      `/api/households/shopping/lists/${listId}/items`,
      data,
    )
    return mapItem(raw)
  }

  async addRecipeToList(listId: string, recipeId: string): Promise<void> {
    await mealieApiClient.post(
      `/api/households/shopping/lists/${listId}/recipe/${recipeId}`,
      {},
    )
  }

  async updateItem(listId: string, item: MealieShoppingItemUpdate): Promise<ShoppingItem> {
    const raw = await mealieApiClient.put<MealieShoppingItem>(
      `/api/households/shopping/lists/${listId}/items/${item.id}`,
      item,
    )
    return mapItem(raw)
  }

  async deleteItem(listId: string, itemId: string): Promise<void> {
    await mealieApiClient.delete(
      `/api/households/shopping/lists/${listId}/items/${itemId}`,
    )
  }

  async deleteCheckedItems(listId: string, items: ShoppingItem[]): Promise<void> {
    const checked = items.filter((i) => i.checked && i.source === "mealie")
    await Promise.all(checked.map((i) => this.deleteItem(listId, i.id)))
  }

  async deleteAllItems(listId: string, items: ShoppingItem[]): Promise<void> {
    const mealie = items.filter((i) => i.source === "mealie")
    await Promise.all(mealie.map((i) => this.deleteItem(listId, i.id)))
  }
}
