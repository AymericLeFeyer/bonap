import type { Course } from "../types/mealie.ts"
import { COURSES, DEFAULT_COURSE } from "../types/mealie.ts"
import { normalizeGuestNames } from "./guests.ts"
import type { BatchLocation } from "./batch.ts"

/**
 * La note d'un repas Mealie porte aussi des métadonnées Bonap en préfixe :
 *   "[s:4]"            portions du repas (voir servings.ts)
 *   "[c:dessert]"      place dans le repas — absent = plat
 *   "[g:Marc,Julie]"   invités présents au repas (voir guests.ts)
 *   "[b:freezer:2026-11-02]"  plat sorti du stock batch (voir batch.ts) :
 *                      endroit + date de préparation, pour le remettre en
 *                      stock si le repas est déprogrammé.
 * Format écrit : "[s:4][c:dessert][b:freezer:2026-11-02][g:Marc,Julie]note utilisateur".
 */
export interface MealBatchSource {
  location: BatchLocation
  preparedAt: string
}

export interface MealTextParts {
  servings?: number
  course: Course
  /** Invités du repas ; absent ou vide = aucun. */
  guests?: string[]
  /** Plat pris dans le stock batch ; absent = cuisiné pour l'occasion. */
  batch?: MealBatchSource
  note: string
}

const MARKER = /^\[(s|c):([a-z0-9]+)\]/
const GUESTS_MARKER = /^\[g:([^\]]*)\]/
const BATCH_MARKER = /^\[b:(fridge|freezer):(\d{4}-\d{2}-\d{2})\]/

export function decodeMealText(text?: string): MealTextParts {
  let rest = text ?? ""
  let servings: number | undefined
  let course: Course = DEFAULT_COURSE
  let guests: string[] | undefined
  let batch: MealBatchSource | undefined
  for (;;) {
    const batchMatch = rest.match(BATCH_MARKER)
    if (batchMatch) {
      batch = { location: batchMatch[1] as BatchLocation, preparedAt: batchMatch[2] }
      rest = rest.slice(batchMatch[0].length)
      continue
    }
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
  const parts: MealTextParts = { servings, course, note: rest }
  if (guests) parts.guests = guests
  if (batch) parts.batch = batch
  return parts
}

/** Note initiale d'un repas ajouté pour ce type (undefined pour un plat). */
export function mealTextForCourse(course: Course): string | undefined {
  return encodeMealText({ course, note: "" }) || undefined
}

export function encodeMealText({ servings, course, guests, batch, note }: MealTextParts): string {
  const s = servings && servings > 0 ? `[s:${servings}]` : ""
  const c = course !== DEFAULT_COURSE ? `[c:${course}]` : ""
  const names = normalizeGuestNames(guests ?? [])
  const g = names.length > 0 ? `[g:${names.join(",")}]` : ""
  const b = batch ? `[b:${batch.location}:${batch.preparedAt}]` : ""
  return `${s}${c}${b}${g}${note}`
}
