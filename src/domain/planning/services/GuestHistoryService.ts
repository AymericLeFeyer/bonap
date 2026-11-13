import type { MealieMealPlan } from "../../../shared/types/mealie.ts"
import { decodeMealText } from "../../../shared/utils/mealText.ts"
import { guestKey } from "../../../shared/utils/guests.ts"

/** Un repas servi à un invité. */
export interface GuestMeal {
  mealId: number
  date: string
  entryType: string
  recipeId?: string
  recipeSlug?: string
  recipeName: string
}

export interface GuestHistory {
  /** Nom affiché (dernière orthographe utilisée). */
  name: string
  /** Repas du plus récent au plus ancien. */
  meals: GuestMeal[]
}

/** Historique par invité (clé : `guestKey`), invités triés par nom. */
export function buildGuestHistory(mealPlans: MealieMealPlan[]): GuestHistory[] {
  const byKey = new Map<string, GuestHistory & { lastDate: string }>()
  for (const meal of mealPlans) {
    const guests = decodeMealText(meal.text).guests ?? []
    for (const name of guests) {
      const key = guestKey(name)
      const entry = byKey.get(key) ?? { name, meals: [], lastDate: "" }
      if (meal.date >= entry.lastDate) {
        entry.name = name
        entry.lastDate = meal.date
      }
      entry.meals.push({
        mealId: meal.id,
        date: meal.date,
        entryType: meal.entryType,
        recipeId: meal.recipeId ?? meal.recipe?.id,
        recipeSlug: meal.recipe?.slug,
        recipeName: meal.recipe?.name ?? meal.title ?? "Sans titre",
      })
      byKey.set(key, entry)
    }
  }
  return [...byKey.values()]
    .map(({ name, meals }) => ({
      name,
      meals: [...meals].sort((a, b) => b.date.localeCompare(a.date) || b.entryType.localeCompare(a.entryType)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }))
}

/** Invités ayant déjà mangé une recette : un nom, ses dates (plus récente d'abord). */
export function recipeTasters(history: GuestHistory[], recipeId: string): { name: string; dates: string[] }[] {
  return history
    .map((guest) => ({
      name: guest.name,
      dates: [...new Set(guest.meals.filter((m) => m.recipeId === recipeId).map((m) => m.date))],
    }))
    .filter((t) => t.dates.length > 0)
}

/**
 * Invités d'un repas qui ont déjà goûté sa recette lors d'un repas antérieur.
 * Renvoie la date la plus récente de chaque dégustation précédente.
 */
export function previousTastings(
  history: GuestHistory[],
  meal: Pick<MealieMealPlan, "id" | "date" | "recipeId" | "recipe" | "text">,
): { name: string; date: string }[] {
  const recipeId = meal.recipeId ?? meal.recipe?.id
  const guests = decodeMealText(meal.text).guests ?? []
  if (!recipeId || guests.length === 0) return []
  const byKey = new Map(history.map((g) => [guestKey(g.name), g]))
  const result: { name: string; date: string }[] = []
  for (const name of guests) {
    const previous = byKey
      .get(guestKey(name))
      ?.meals.find((m) => m.recipeId === recipeId && m.mealId !== meal.id && m.date < meal.date)
    if (previous) result.push({ name, date: previous.date })
  }
  return result
}

/** Même contrôle avant d'enregistrer : invités saisis pour une recette à une date. */
export function previousTastingsFor(
  history: GuestHistory[],
  recipeId: string | undefined,
  date: string,
  guests: string[],
  excludeMealId?: number,
): { name: string; date: string }[] {
  if (!recipeId) return []
  return previousTastings(history, {
    id: excludeMealId ?? -1,
    date,
    recipeId,
    text: guests.length > 0 ? `[g:${guests.join(",")}]` : "",
  })
}
