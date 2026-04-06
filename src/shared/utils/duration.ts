/**
 * Formate une durée en texte lisible.
 *
 * Accepte plusieurs formats :
 *
 * 1) Minutes (number ou string numérique)
 *    - 30 → "30 min"
 *    - "90" → "1 h 30 min"
 *
 * 2) Texte humain simple (NEW)
 *    - "8 min", "8 mins", "8 minutes"
 *
 * 3) ISO 8601 (format Mealie)
 *    - "PT30M" → "30 min"
 *    - "PT1H" → "1 h"
 *    - "PT1H30M" → "1 h 30 min"
 *
 * 4) Valeurs null/invalides
 *    - null / undefined / "" → "—"
 */
export function formatDuration(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—"

  let totalMinutes: number

  /**
   * CASE 1 — number direct (minutes)
   */
  if (typeof value === "number") {
    totalMinutes = value
  }

  /**
   * CASE 2 — string
   */
  else if (typeof value === "string") {
    const v = value.trim().toLowerCase()

    /**
     * NEW — format humain : "8 min", "8 minutes"
     * Permet de supporter des valeurs non ISO venant de l’UI ou API
     */
    const humanMatch = v.match(/^(\d+)\s*(min|mins|minute|minutes)?$/)
    if (humanMatch) {
      totalMinutes = parseInt(humanMatch[1], 10)
    }

    /**
     * CASE 2.1 — string numérique pur : "90"
     */
    else if (/^\d+$/.test(v)) {
      totalMinutes = parseInt(v, 10)
    }

    /**
     * CASE 2.2 — ISO 8601 Mealie : "PT1H30M"
     */
    else {
      const match = v.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/)

      if (!match) return "—"

      const hours = parseInt(match[1] ?? "0", 10)
      const minutes = parseInt(match[2] ?? "0", 10)

      totalMinutes = hours * 60 + minutes
    }
  }

  /**
   * CASE 3 — type inconnu
   */
  else {
    return "—"
  }

  /**
   * Sécurité : on ignore les valeurs invalides ou nulles
   */
  if (totalMinutes <= 0) return "—"

  /**
   * Conversion finale en format lisible
   */
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}


export function formatDurationToNumber(value?: string): number {
  if (!value) return 0

  const v = value.trim().toLowerCase()

  let totalMinutes = 0

  // "10", "15"
  if (/^\d+$/.test(v)) {
    return parseInt(v, 10)
  }

  // "10 min", "10 minutes"
  if (/^\d+\s*(min|minute|minutes)$/.test(v)) {
    return parseInt(v, 10)
  }

  // "1h", "1h30"
  const hourMatch = v.match(/(\d+)\s*h(?:\s*(\d+))?/)
  if (hourMatch) {
    const h = parseInt(hourMatch[1] ?? "0", 10)
    const m = parseInt(hourMatch[2] ?? "0", 10)
    return h * 60 + m
  }

  // "PT1H30M" (ISO)
  const isoMatch = v.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (isoMatch) {
    const h = parseInt(isoMatch[1] ?? "0", 10)
    const m = parseInt(isoMatch[2] ?? "0", 10)
    return h * 60 + m
  }

  return 0
}