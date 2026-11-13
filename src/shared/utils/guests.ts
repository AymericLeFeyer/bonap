/**
 * Invités d'un repas, stockés dans la note du mealplan (`[g:Marc,Julie]`, voir
 * mealText.ts). Les noms sont saisis librement : on les nettoie pour qu'ils
 * restent lisibles dans le marqueur et on les compare sans tenir compte de la
 * casse ni des accents.
 */

const MAX_GUEST_NAME_LENGTH = 40

/** Nom affichable : sans caractère réservé au marqueur, espaces réduits. */
export function cleanGuestName(name: string): string {
  return name
    .replace(/[[\],]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_GUEST_NAME_LENGTH)
}

/** Clé de comparaison : « Zoé » et « zoe » désignent le même invité. */
export function guestKey(name: string): string {
  return cleanGuestName(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/** Noms nettoyés, vides retirés, doublons supprimés (premier gardé). */
export function normalizeGuestNames(names: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of names) {
    const name = cleanGuestName(raw)
    const key = guestKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(name)
  }
  return result
}

/** Date ISO « 2026-03-12 » → « 12.03.2026 ». */
export function formatGuestDate(date: string): string {
  const [y, m, d] = date.split("-")
  return y && m && d ? `${d}.${m}.${y}` : date
}

/** Phrase d'avertissement : « Marc a déjà goûté ce plat le 12.03.2026 ». */
export function tastingWarning({ name, date }: { name: string; date: string }): string {
  return `${name} a déjà goûté ce plat le ${formatGuestDate(date)}`
}
