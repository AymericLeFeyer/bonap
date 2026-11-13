import type { IPlanningRepository } from "../../../domain/planning/repositories/IPlanningRepository.ts"
import { buildGuestHistory, type GuestHistory } from "../../../domain/planning/services/GuestHistoryService.ts"
import { formatDate } from "../../../shared/utils/date.ts"

/** Années de planning relues pour retrouver les invités passés. */
const HISTORY_YEARS = 5

export class GetGuestHistoryUseCase {
  private planningRepository: IPlanningRepository

  constructor(planningRepository: IPlanningRepository) {
    this.planningRepository = planningRepository
  }

  async execute(today: Date = new Date()): Promise<GuestHistory[]> {
    const start = new Date(today)
    start.setFullYear(start.getFullYear() - HISTORY_YEARS)
    const end = new Date(today)
    end.setFullYear(end.getFullYear() + 1)
    const meals = await this.planningRepository.getWeekPlanning(formatDate(start), formatDate(end))
    return buildGuestHistory(meals)
  }
}
