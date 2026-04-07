/**
 * Parse une durée en minutes.
 *
 * Accepte :
 * - number → minutes direct
 * - "90"
 * - "5 min", "5 minutes"
 * - "1h10", "1h 10", "1h10m", "2h"
 * - ISO 8601 → "PT1H30M"
 *
 * Retourne :
 * - nombre de minutes
 * - 0 si invalide
 */
export function parseDuration(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0

  if (typeof value === "number") {
    return value
  }

  const v = value
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")

  /**
   * CASE 1 — "1h10", "1h 10", "1h10m", "2h"
   */
  const compactMatch = v.match(/^(\d+)\s*h(?:\s*(\d+)\s*m?)?$/)
  if (compactMatch) {
    const hours = parseInt(compactMatch[1], 10)
    const minutes = parseInt(compactMatch[2] ?? "0", 10)
    return hours * 60 + minutes
  }

  /**
   * CASE 2 — "90", "5 min", "5 minutes"
   */
  if (/^(\d+)\s*(mn|min|mins|minute|minutes)?$/.test(v)) {
    return parseInt(v.match(/^(\d+)/)![1], 10)
  }

  /**
   * CASE 3 — ISO 8601 "PT1H30M"
   */
  const isoMatch = v.match(/^pt(?:(\d+)h)?(?:(\d+)m)?$/)
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] ?? "0", 10)
    const minutes = parseInt(isoMatch[2] ?? "0", 10)
    return hours * 60 + minutes
  }

  return 0
}

/**
 * Formate un nombre de minutes en texte lisible.
 *
 * - 30 → "30 min"
 * - 90 → "1 h 30 min"
 */
export function formatDurationFromMinutes(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return "—"

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}

/**
 * Formate une durée en texte lisible.
 *
 * Accepte plusieurs formats :
 *
 * 1) Minutes (number ou string numérique)
 *    - 30 → "30 min"
 *    - "90" → "1 h 30 min"
 *
 * 2) Texte humain
 *    - "8 min", "8 mins", "8 minutes"
 *
 * 3) Format heures
 *    - "1h10", "2h"
 *
 * 4) ISO 8601
 *    - "PT30M", "PT1H", "PT1H30M"
 *
 * 5) Valeurs null/invalides
 *    - → "—"
 */
export function formatDuration(value: string | number | null | undefined): string {
  const minutes = parseDuration(value)
  return formatDurationFromMinutes(minutes)
}

/**
 * Retourne uniquement la durée en minutes.
 *
 * - "1h10" → 70
 * - "45 min" → 45
 * - "PT1H30M" → 90
 */
export function formatDurationToNumber(value?: string | number | null): number {
  return parseDuration(value)
}