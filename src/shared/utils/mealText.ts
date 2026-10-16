import type { Course } from "../types/mealie.ts"
import { COURSES, DEFAULT_COURSE } from "../types/mealie.ts"

/**
 * La note d'un repas Mealie porte aussi des métadonnées Bonap en préfixe :
 *   "[s:4]"       portions du repas (voir servings.ts)
 *   "[c:dessert]" place dans le repas — absent = plat
 * Format écrit : "[s:4][c:dessert]note utilisateur".
 */
export interface MealTextParts {
  servings?: number
  course: Course
  note: string
}

const MARKER = /^\[(s|c):([a-z0-9]+)\]/

export function decodeMealText(text?: string): MealTextParts {
  let rest = text ?? ""
  let servings: number | undefined
  let course: Course = DEFAULT_COURSE
  for (let m = rest.match(MARKER); m; m = rest.match(MARKER)) {
    const [whole, key, value] = m
    if (key === "s" && /^\d+$/.test(value)) servings = parseInt(value, 10)
    else if (key === "c" && COURSES.includes(value as Course)) course = value as Course
    else break
    rest = rest.slice(whole.length)
  }
  return { servings, course, note: rest }
}

/** Note initiale d'un repas ajouté pour ce type (undefined pour un plat). */
export function mealTextForCourse(course: Course): string | undefined {
  return encodeMealText({ course, note: "" }) || undefined
}

export function encodeMealText({ servings, course, note }: MealTextParts): string {
  const s = servings && servings > 0 ? `[s:${servings}]` : ""
  const c = course !== DEFAULT_COURSE ? `[c:${course}]` : ""
  return `${s}${c}${note}`
}
