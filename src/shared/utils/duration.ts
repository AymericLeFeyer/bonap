/**
 * Formate une durée ISO 8601 en texte lisible.
 *
 * Exemples :
 *   PT30M    → "30 min"
 *   PT1H     → "1 h"
 *   PT1H30M  → "1 h 30 min"
 *   null/""  → "—"
 */
export function formatDuration(iso: string | null | undefined): string {
  if (!iso) return "—"

  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/)
  if (!match) return "—"

  const hours = parseInt(match[1] ?? "0", 10)
  const minutes = parseInt(match[2] ?? "0", 10)

  if (hours === 0 && minutes === 0) return "—"
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}
