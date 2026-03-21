import type { ShoppingItem, ShoppingList } from "../entities/ShoppingItem.ts"
import type { MealieShoppingItemCreate, MealieShoppingItemUpdate } from "../../../shared/types/mealie.ts"

export interface IShoppingRepository {
  /** Fetches or creates the default shopping list */
  getOrCreateDefaultList(): Promise<ShoppingList>

  /** Fetches all items from a list */
  getItems(listId: string): Promise<ShoppingItem[]>

  /** Adds a free-text item */
  addItem(listId: string, data: MealieShoppingItemCreate): Promise<ShoppingItem>

  /** Adds all ingredients of a recipe to the list */
  addRecipeToList(listId: string, recipeId: string): Promise<void>

  /** Checks or unchecks an item */
  updateItem(listId: string, item: MealieShoppingItemUpdate): Promise<ShoppingItem>

  /** Deletes an item */
  deleteItem(listId: string, itemId: string): Promise<void>

  /** Deletes all checked items */
  deleteCheckedItems(listId: string, items: ShoppingItem[]): Promise<void>

  /** Deletes all items */
  deleteAllItems(listId: string, items: ShoppingItem[]): Promise<void>
}
