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
<<<<<<< HEAD
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
=======
  if (value === null || value === undefined || value === "") return "—"

  let totalMinutes: number

  if (typeof value === "number") {
    totalMinutes = value
  } else if (typeof value === "string") {
    const v = value
      .trim()
      .toLowerCase()
      .replace(/\./g, "")        // enlève les points (ex: "min.")
      .replace(/\u00a0/g, " ")   // espaces insécables
      .replace(/\s+/g, " ")      // normalise espaces

    /**
     * CASE 1 — "1h10", "1h 10", "1h10m", "2h"
     */
    const compactMatch = v.match(/^(\d+)\s*h(?:\s*(\d+)\s*m?)?$/)
    if (compactMatch) {
      const hours = parseInt(compactMatch[1], 10)
      const minutes = parseInt(compactMatch[2] ?? "0", 10)
      totalMinutes = hours * 60 + minutes
    }

    /**
     * CASE 2 — "90", "5 min", "5 minutes"
     */
    else if (/^(\d+)\s*(min|mins|minute|minutes)?$/.test(v)) {
      const match = v.match(/^(\d+)/)
      totalMinutes = parseInt(match![1], 10)
    }

    /**
     * CASE 3 — string numérique "90"
     */
    else if (/^\d+$/.test(v)) {
      totalMinutes = parseInt(v, 10)
    }

    /**
     * CASE 4 — ISO 8601 "PT1H30M"
     */
    else {
      const match = v.match(/^pt(?:(\d+)h)?(?:(\d+)m)?$/)

      if (!match) return "—"

      const hours = parseInt(match[1] ?? "0", 10)
      const minutes = parseInt(match[2] ?? "0", 10)

      totalMinutes = hours * 60 + minutes
    }
  } else {
    return "—"
  }

  if (totalMinutes <= 0) return "—"

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}


export function parsePrepTimeToMinutes(value?: string): string {
  if (!value) return ""
  if (/^\d+$/.test(value.trim())) {
    const n = parseInt(value.trim(), 10)
    return n > 0 ? String(n) : ""
  }
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return ""
  const hours = parseInt(match[1] ?? "0")
  const minutes = parseInt(match[2] ?? "0")
  const total = hours * 60 + minutes
  return total > 0 ? String(total) : ""
}

export function formatMinutes(value: string): string {
  const n = Number(value)
  if (!n || n <= 0) return ""
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h > 0 && m > 0) return `${h} h ${m} min`
  if (h > 0) return `${h} h`
  return `${m} min`
}

export function formatDurationToNumber(value?: string): number {
  if (!value) return 0

  const v = value.trim().toLowerCase()

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
>>>>>>> f905814d36a40f0fea940f73a355cdfbad52ab11
}