export type Season = "printemps" | "ete" | "automne" | "hiver" | "sans"

export const SEASONS: Season[] = ["printemps", "ete", "automne", "hiver", "sans"]

export const SEASON_LABELS: Record<Season, string> = {
  printemps: "Printemps",
  ete: "Été",
  automne: "Automne",
  hiver: "Hiver",
  sans: "Sans Saison",
}

export interface MealieFood {
  id: string
  name: string
  pluralName?: string | null
  description?: string
  labelId?: string | null
  label?: { id: string; name: string; color?: string } | null
}

export interface MealieUnit {
  id: string
  name: string
  pluralName?: string | null
  abbreviation?: string
  useAbbreviation?: boolean
}

export interface MealieIngredient {
  quantity?: number
  unit?: { id?: string; name: string }
  food?: { id?: string; name: string }
  note?: string
  display?: string
  originalText?: string | null
  referenceId?: string
  title?: string
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
  seasons?: Season[]
  orderBy?: string
  orderDirection?: string
}

export interface RecipeFormIngredient {
  quantity: string
  /** Nom de l'unité (ex: "gramme"). Résolu vers un id au moment de l'envoi. */
  unit: string
  unitId?: string
  /** Nom de l'aliment (ex: "farine"). Résolu ou créé au moment de l'envoi. */
  food: string
  foodId?: string
  note: string
  /** UUID Mealie — préservé pour retrouver l'ingrédient original lors du PUT */
  referenceId?: string
}

export interface RecipeFormInstruction {
  text: string
  /** UUID Mealie — préservé pour ne pas recréer les instructions à chaque save */
  id?: string
}

export interface RecipeFormData {
  name: string
  description: string
  prepTime: string
  performTime: string
  totalTime: string
  imageFile?: File
  recipeIngredient: RecipeFormIngredient[]
  recipeInstructions: RecipeFormInstruction[]
  seasons: Season[]
  categories: Array<{ id: string; name: string; slug: string }>
  tags: Array<{ id: string; name: string; slug: string }>
}

export interface MealieRecipe {
  id: string
  slug: string
  name: string
  description?: string
  image?: string
  dateUpdated?: string
  recipeCategory?: MealieCategory[]
  tags?: MealieTag[]
  prepTime?: string
  performTime?: string
  totalTime?: string
  recipeIngredient?: MealieIngredient[]
  recipeInstructions?: MealieInstruction[]
  extras?: Record<string, string>
  orgURL?: string
  nutrition?: MealieNutrition
  rating?: number
}

export interface MealieNutrition {
  calories?: string
  carbohydrateContent?: string
  cholesterolContent?: string
  fatContent?: string
  fiberContent?: string
  proteinContent?: string
  saturatedFatContent?: string
  sodiumContent?: string
  sugarContent?: string
  transFatContent?: string
  unsaturatedFatContent?: string
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
  listItems?: MealieShoppingItem[]
  labelSettings?: { label: MealieShoppingLabel }[]
}

export interface MealieShoppingItemRecipeRef {
  recipeId: string
  recipe?: { id: string; name: string; slug: string }
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
  recipeReferences?: MealieShoppingItemRecipeRef[]
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

export interface MealieFavorite {
  recipeId: string
  isFavorite: boolean
  userId: string
  id: string
}

export interface MealieFavoritesResponse {
  ratings: MealieFavorite[]
}

export interface MealieRatings {
  recipeId: string
  isFavorite: boolean
}
