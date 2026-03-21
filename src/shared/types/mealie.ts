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
