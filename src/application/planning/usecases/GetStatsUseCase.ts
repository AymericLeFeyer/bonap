import { formatDate } from "../../../shared/utils/date.ts"

export type StatsPeriod = "30d" | "90d" | "12m"

export interface PeriodDates {
  startDate: string
  endDate: string
}

/**
 * Computes the start and end dates for a given period.
 */
export function getPeriodDates(period: StatsPeriod): PeriodDates {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  if (period === "30d") {
    start.setDate(start.getDate() - 29)
  } else if (period === "90d") {
    start.setDate(start.getDate() - 89)
  } else {
    start.setFullYear(start.getFullYear() - 1)
    start.setDate(start.getDate() + 1)
  }

  return { startDate: formatDate(start), endDate: formatDate(end) }
}
