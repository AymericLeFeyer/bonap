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

export interface MealieRecipe {
  id: string
  slug: string
  name: string
  description?: string
  image?: string
  recipeCategory?: MealieCategory[]
  prepTime?: string
  cookTime?: string
  recipeIngredient?: MealieIngredient[]
  recipeInstructions?: MealieInstruction[]
}

export interface MealiePaginatedRecipes {
  items: MealieRecipe[]
  total: number
  page: number
  perPage: number
}

export interface MealieMealPlan {
  id: number
  date: string
  entryType: string
  title?: string
  recipeId?: string
  recipe?: MealieRecipe
}
