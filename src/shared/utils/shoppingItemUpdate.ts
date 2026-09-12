import type { ShoppingItem } from "../../domain/shopping/entities/ShoppingItem.ts"
import type { MealieShoppingItemUpdate } from "../types/mealie.ts"

/**
 * Champs modifiables lors d'une mise à jour d'article.
 * Tout ce qui n'est pas fourni est repris tel quel depuis l'article courant.
 */
export interface ShoppingItemPatch {
  checked?: boolean
  note?: string
  quantity?: number
  labelId?: string
}

/**
 * Construit le payload PUT `/api/households/shopping/items` à partir d'un article.
 *
 * PIÈGE MEALIE : ce PUT est un remplacement complet, pas un patch. Un payload sans
 * `foodId` / `unitId` détache l'aliment et l'unité de l'article ; au rechargement,
 * `food` et `unit` sont `null`, donc l'article perd son nom (il tombe sur `note`,
 * vide pour les articles issus de recettes) et son unité. Toujours passer par ce
 * helper plutôt que de composer l'objet à la main.
 */
export function toItemUpdate(
  item: ShoppingItem,
  listId: string,
  patch: ShoppingItemPatch = {},
): MealieShoppingItemUpdate {
  return {
    id: item.id,
    shoppingListId: listId,
    checked: patch.checked ?? item.checked,
    position: item.position,
    isFood: item.isFood,
    note: patch.note ?? item.note,
    quantity: patch.quantity ?? item.quantity,
    foodId: item.foodId,
    unitId: item.unit?.id,
    labelId: "labelId" in patch ? patch.labelId : item.label?.id,
    display: item.display,
  }
}
