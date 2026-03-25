/**
 * Formate une durée en texte lisible.
 *
 * Accepte deux formats :
 *   - Entier ou string numérique (minutes) : "30", "90", 30
 *   - ISO 8601 : "PT30M", "PT1H", "PT1H30M"
 *
 * Exemples :
 *   30       → "30 min"
 *   90       → "1 h 30 min"
 *   60       → "1 h"
 *   "PT30M"  → "30 min"
 *   "PT1H"   → "1 h"
 *   "PT1H30M"→ "1 h 30 min"
 *   null/""  → "—"
 */
export function formatDuration(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"

  let totalMinutes: number

  if (typeof value === "number") {
    totalMinutes = value
  } else if (/^\d+$/.test(value.trim())) {
    // String numérique pure → minutes
    totalMinutes = parseInt(value.trim(), 10)
  } else {
    // Format ISO 8601
    const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/)
    if (!match) return "—"
    const hours = parseInt(match[1] ?? "0", 10)
    const minutes = parseInt(match[2] ?? "0", 10)
    totalMinutes = hours * 60 + minutes
  }

  if (totalMinutes <= 0) return "—"

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}
