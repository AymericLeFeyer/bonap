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

