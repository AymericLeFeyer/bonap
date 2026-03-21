export type Season = "printemps" | "ete" | "automne" | "hiver"

export const SEASONS: Season[] = ["printemps", "ete", "automne", "hiver"]

export const SEASON_LABELS: Record<Season, string> = {
  printemps: "Printemps",
  ete: "Été",
  automne: "Automne",
  hiver: "Hiver",
}

export interface MealieIngredient {
  quantity?: number
  unit?: { name: string }
  food?: { name: string }
  note?: string
}

export interface MealieInstruction {
  id: string
  title?: string
  text: string
}

export interface MealieCategory {
  id: string
  groupId: string
  name: string
  slug: string
}

export interface MealieTag {
  id: string
  name: string
  slug: string
}

export interface RecipeFilters {
  search?: string
  categories?: string[]
  tags?: string[]
  maxTotalTime?: number
  seasons?: Season[]
}

export interface RecipeFormIngredient {
  quantity: string
  unit: string
  food: string
  note: string
}

export interface RecipeFormInstruction {
  text: string
}

export interface RecipeFormData {
  name: string
  description: string
  prepTime: string
  recipeIngredient: RecipeFormIngredient[]
  recipeInstructions: RecipeFormInstruction[]
  imageUrl: string
  seasons: Season[]
}

export interface MealieRecipe {
  id: string
  slug: string
  name: string
  description?: string
  image?: string
  recipeCategory?: MealieCategory[]
  tags?: MealieTag[]
  prepTime?: string
  cookTime?: string
  recipeIngredient?: MealieIngredient[]
  recipeInstructions?: MealieInstruction[]
  extras?: Record<string, string>
}

export interface MealieRawPaginatedRecipes {
  items: MealieRecipe[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface MealiePaginatedRecipes {
  items: MealieRecipe[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface MealieMealPlan {
  id: number
  date: string
  entryType: string
  title?: string
  recipeId?: string
  recipe?: MealieRecipe
}

export interface MealieRawPaginatedMealPlans {
  items: MealieMealPlan[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface MealiePaginatedMealPlans {
  items: MealieMealPlan[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ─── Shopping ─────────────────────────────────────────────────────────────────

export interface MealieShoppingLabel {
  id: string
  name: string
  color?: string
}

export interface MealieShoppingList {
  id: string
  name: string
  groupId: string
  householdId?: string
}

export interface MealieShoppingItem {
  id: string
  shoppingListId: string
  checked: boolean
  position: number
  isFood: boolean
  note?: string
  quantity?: number
  unit?: { id: string; name: string }
  food?: { id: string; name: string }
  label?: MealieShoppingLabel
  display?: string
}

export interface MealieShoppingItemCreate {
  shoppingListId: string
  checked?: boolean
  position?: number
  isFood?: boolean
  note?: string
  quantity?: number
  unitId?: string
  foodId?: string
  labelId?: string
}

export interface MealieShoppingItemUpdate {
  id: string
  shoppingListId: string
  checked: boolean
  position: number
  isFood: boolean
  note?: string
  quantity?: number
  unitId?: string
  foodId?: string
  labelId?: string
  display?: string
}

export interface MealieRawPaginatedShoppingLists {
  items: MealieShoppingList[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface MealieRawPaginatedShoppingItems {
  items: MealieShoppingItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
}
