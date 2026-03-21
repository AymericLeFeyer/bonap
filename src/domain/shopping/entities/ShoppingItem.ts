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
  /** Texte affiché (calculé par Mealie ou note brute) */
  display?: string
  /** Type custom : article non alimentaire stocké en localStorage */
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
