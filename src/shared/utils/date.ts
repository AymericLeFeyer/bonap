/**
 * Formats a date as YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Computes the (fractional) number of weeks between two YYYY-MM-DD dates.
 * Returns at least 1.
 */
export function getWeeksBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diffDays / 7)
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function formatDayFr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}
