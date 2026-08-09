import type { ShoppingItem, ShoppingLabel, ShoppingList } from "../entities/ShoppingItem.ts"
import type { MealieShoppingItemCreate, MealieShoppingItemUpdate } from "../../../shared/types/mealie.ts"

/** A recipe to expand into the list, with a scaling factor for its quantities. */
export interface ShoppingRecipeEntry {
  recipeId: string
  /** 1 = quantités de la recette telles quelles, 1.5 = une fois et demie. */
  quantity: number
}

export interface IShoppingRepository {
  /** Fetches or creates the default shopping list */
  getOrCreateDefaultList(): Promise<ShoppingList>

  /** Fetches or creates the "Habituels" shopping list */
  getOrCreateHabituelsList(): Promise<ShoppingList>

  /** Fetches all items and available labels from a list */
  getItems(listId: string): Promise<{ items: ShoppingItem[]; labels: ShoppingLabel[] }>

  /** Adds a free-text item */
  addItem(listId: string, data: MealieShoppingItemCreate): Promise<void>

  /** Adds multiple items in a single bulk call */
  addItems(listId: string, items: MealieShoppingItemCreate[]): Promise<void>

  /**
   * Adds whole recipes to the list, letting Mealie expand their ingredients.
   * `quantity` scales every ingredient of that recipe.
   */
  addRecipes(listId: string, entries: ShoppingRecipeEntry[]): Promise<void>

  /** Checks or unchecks an item */
  updateItem(listId: string, item: MealieShoppingItemUpdate): Promise<ShoppingItem>

  /** Deletes an item */
  deleteItem(listId: string, itemId: string): Promise<void>

  /** Deletes all checked items */
  deleteCheckedItems(listId: string, items: ShoppingItem[]): Promise<void>

  /** Deletes all items */
  deleteAllItems(listId: string, items: ShoppingItem[]): Promise<void>
}
