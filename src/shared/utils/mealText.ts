import type { Course } from "../types/mealie.ts"
import { COURSES, DEFAULT_COURSE } from "../types/mealie.ts"
import { normalizeGuestNames } from "./guests.ts"

/**
 * La note d'un repas Mealie porte aussi des métadonnées Bonap en préfixe :
 *   "[s:4]"            portions du repas (voir servings.ts)
 *   "[c:dessert]"      place dans le repas — absent = plat
 *   "[g:Marc,Julie]"   invités présents au repas (voir guests.ts)
 * Format écrit : "[s:4][c:dessert][g:Marc,Julie]note utilisateur".
 */
export interface MealTextParts {
  servings?: number
  course: Course
  /** Invités du repas ; absent ou vide = aucun. */
  guests?: string[]
  note: string
}

const MARKER = /^\[(s|c):([a-z0-9]+)\]/
const GUESTS_MARKER = /^\[g:([^\]]*)\]/

export function decodeMealText(text?: string): MealTextParts {
  let rest = text ?? ""
  let servings: number | undefined
  let course: Course = DEFAULT_COURSE
  let guests: string[] | undefined
  for (;;) {
    const guestsMatch = rest.match(GUESTS_MARKER)
    if (guestsMatch) {
      const names = normalizeGuestNames(guestsMatch[1].split(","))
      if (names.length > 0) guests = names
      rest = rest.slice(guestsMatch[0].length)
      continue
    }
    const m = rest.match(MARKER)
    if (!m) break
    const [whole, key, value] = m
    if (key === "s" && /^\d+$/.test(value)) servings = parseInt(value, 10)
    else if (key === "c" && COURSES.includes(value as Course)) course = value as Course
    else break
    rest = rest.slice(whole.length)
  }
  return guests ? { servings, course, guests, note: rest } : { servings, course, note: rest }
}

/** Note initiale d'un repas ajouté pour ce type (undefined pour un plat). */
export function mealTextForCourse(course: Course): string | undefined {
  return encodeMealText({ course, note: "" }) || undefined
}

export function encodeMealText({ servings, course, guests, note }: MealTextParts): string {
  const s = servings && servings > 0 ? `[s:${servings}]` : ""
  const c = course !== DEFAULT_COURSE ? `[c:${course}]` : ""
  const names = normalizeGuestNames(guests ?? [])
  const g = names.length > 0 ? `[g:${names.join(",")}]` : ""
  return `${s}${c}${g}${note}`
}
