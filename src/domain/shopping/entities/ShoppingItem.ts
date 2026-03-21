export interface ShoppingLabel {
  id: string
  name: string
  color?: string
}

export interface ShoppingItem {
  id: string
  shoppingListId: string
  checked: boolean
  position: number
  isFood: boolean
  note?: string
  quantity?: number
  unitName?: string
  foodName?: string
  label?: ShoppingLabel
  /** Display text (computed by Mealie or raw note) */
  display?: string
  source: "mealie"
}

export interface ShoppingList {
  id: string
  name: string
  labels: ShoppingLabel[]
}

