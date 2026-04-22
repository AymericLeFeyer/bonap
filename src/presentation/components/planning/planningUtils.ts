import type { MealieMealPlan, MealieRecipe } from "../../../shared/types/mealie.ts"
import { decodeServingsFromText, parseServings } from "../../../shared/utils/servings.ts"
import { getRecipesUseCase } from "../../../infrastructure/container.ts"

export function getMealServings(meal: MealieMealPlan): number | undefined {
  const fromText = decodeServingsFromText(meal.text).servings
  if (fromText && fromText > 0) return fromText
  const base = parseServings(meal.recipe?.recipeYield)
  return base && base > 0 ? base : undefined
}

export function getMealVisibleNote(meal: MealieMealPlan): string {
  return decodeServingsFromText(meal.text).note
}

export function getInitialServingsForNewMeal(recipe: MealieRecipe | undefined, familySize: number): number | undefined {
  const recipeBase = parseServings(recipe?.recipeYield)
  if (!recipeBase || recipeBase <= 0) return undefined
  return familySize > 0 ? familySize : recipeBase
}

export function formatDayDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function formatDateRange(days: Date[]): string {
  if (days.length === 0) return ""
  const first = days[0]
  const last = days[days.length - 1]
  return `${first.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — ${last.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function fetchAllRecipes(): Promise<MealieRecipe[]> {
  const first = await getRecipesUseCase.execute(1, 100)
  const all = [...first.items]
  for (let page = 2; page <= first.totalPages; page += 1) {
    const chunk = await getRecipesUseCase.execute(page, 100)
    all.push(...chunk.items)
  }
  return all
}
