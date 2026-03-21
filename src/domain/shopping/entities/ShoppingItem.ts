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
  /** Item source: "local" means non-food item stored in localStorage */
  source: "mealie" | "local"
}

export interface ShoppingList {
  id: string
  name: string
}

export interface CustomItem {
  id: string
  note: string
  checked: boolean
}
