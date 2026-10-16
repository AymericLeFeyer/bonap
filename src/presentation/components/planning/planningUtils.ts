import type { Course, MealieMealPlan, MealieRecipe } from "../../../shared/types/mealie.ts"
import { COURSES } from "../../../shared/types/mealie.ts"
import { getRecipeServings } from "../../../shared/utils/servings.ts"
import { decodeMealText, encodeMealText, type MealTextParts } from "../../../shared/utils/mealText.ts"
import { getAllRecipeDetailsUseCase } from "../../../infrastructure/container.ts"

export function getMealServings(meal: MealieMealPlan): number | undefined {
  const fromText = decodeMealText(meal.text).servings
  if (fromText && fromText > 0) return fromText
  const base = getRecipeServings(meal.recipe)
  return base && base > 0 ? base : undefined
}

export function getMealVisibleNote(meal: MealieMealPlan): string {
  return decodeMealText(meal.text).note
}

export function getMealCourse(meal: MealieMealPlan): Course {
  return decodeMealText(meal.text).course
}

/** Réécrit la note du repas en ne changeant que les parties fournies. */
export function buildMealText(meal: MealieMealPlan, patch: Partial<MealTextParts>): string {
  return encodeMealText({ ...decodeMealText(meal.text), ...patch })
}

/** Repas d'un créneau triés entrée → plat → dessert (ordre d'ajout conservé à type égal). */
export function sortMealsByCourse(meals: MealieMealPlan[]): MealieMealPlan[] {
  return [...meals].sort((a, b) => COURSES.indexOf(getMealCourse(a)) - COURSES.indexOf(getMealCourse(b)))
}

export function getInitialServingsForNewMeal(recipe: MealieRecipe | undefined, familySize: number): number | undefined {
  const recipeBase = getRecipeServings(recipe)
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

export async function fetchAllRecipeDetails(): Promise<MealieRecipe[]> {
  return getAllRecipeDetailsUseCase.execute()
}
