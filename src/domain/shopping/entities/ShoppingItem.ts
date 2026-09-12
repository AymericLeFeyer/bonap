export interface ShoppingLabel {
  id: string
  name: string
  color?: string
}

/** Unit of measure attached to an item, with the fields Mealie uses to render it. */
export interface ShoppingUnit {
  id: string
  name: string
  pluralName?: string
  abbreviation?: string
  pluralAbbreviation?: string
  useAbbreviation?: boolean
}

export interface ShoppingItem {
  id: string
  shoppingListId: string
  checked: boolean
  position: number
  isFood: boolean
  note?: string
  quantity?: number
  unit?: ShoppingUnit
  foodName?: string
  /**
   * Mealie food id backing this item, when `isFood` is true.
   * Must be sent back on every update: the PUT replaces the whole item, so
   * omitting it detaches the food and the item loses its name and unit.
   */
  foodId?: string
  label?: ShoppingLabel
  /** Display text (computed by Mealie or raw note) */
  display?: string
  /** Names of recipes that require this item */
  recipeNames?: string[]
  source: "mealie"
}

export interface ShoppingList {
  id: string
  name: string
  labels: ShoppingLabel[]
}

