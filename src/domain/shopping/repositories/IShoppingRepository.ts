import type { ShoppingItem, ShoppingList } from "../entities/ShoppingItem.ts"
import type { MealieShoppingItemCreate, MealieShoppingItemUpdate } from "../../../shared/types/mealie.ts"

export interface IShoppingRepository {
  /** Récupère ou crée la liste de courses principale */
  getOrCreateDefaultList(): Promise<ShoppingList>

  /** Récupère tous les items d'une liste */
  getItems(listId: string): Promise<ShoppingItem[]>

  /** Ajoute un item texte libre */
  addItem(listId: string, data: MealieShoppingItemCreate): Promise<ShoppingItem>

  /** Ajoute tous les ingrédients d'une recette à la liste */
  addRecipeToList(listId: string, recipeId: string): Promise<void>

  /** Coche ou décoche un item */
  updateItem(listId: string, item: MealieShoppingItemUpdate): Promise<ShoppingItem>

  /** Supprime un item */
  deleteItem(listId: string, itemId: string): Promise<void>

  /** Supprime tous les items cochés */
  deleteCheckedItems(listId: string, items: ShoppingItem[]): Promise<void>

  /** Supprime tous les items */
  deleteAllItems(listId: string, items: ShoppingItem[]): Promise<void>
}
