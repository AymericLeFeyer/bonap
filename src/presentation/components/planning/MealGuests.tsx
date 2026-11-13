import { TriangleAlert, Users } from "lucide-react"
import type { MealieMealPlan } from "../../../shared/types/mealie.ts"
import { cn } from "../../../lib/utils.ts"
import { decodeMealText } from "../../../shared/utils/mealText.ts"
import { tastingWarning } from "../../../shared/utils/guests.ts"
import { previousTastings, type GuestHistory } from "../../../domain/planning/services/GuestHistoryService.ts"

/** Invités d'un repas et avertissement si l'un d'eux a déjà goûté la recette. */
export function MealGuests({
  meal,
  history,
  compact = false,
}: {
  meal: MealieMealPlan
  history: GuestHistory[]
  compact?: boolean
}) {
  const guests = decodeMealText(meal.text).guests ?? []
  if (guests.length === 0) return null
  const warnings = previousTastings(history, meal)

  return (
    <div className={cn("flex flex-col gap-0.5", compact ? "text-[10px]" : "text-[11px]")}>
      <span className="flex items-center gap-1 text-muted-foreground" title="Invités">
        <Users className="h-3 w-3 shrink-0" />
        <span className="line-clamp-2">{guests.join(", ")}</span>
      </span>
      {warnings.map((w) => (
        <span
          key={w.name}
          className="flex items-start gap-1 font-medium text-amber-700 dark:text-amber-400"
        >
          <TriangleAlert className="h-3 w-3 shrink-0 mt-px" />
          <span>{tastingWarning(w)}</span>
        </span>
      ))}
    </div>
  )
}
