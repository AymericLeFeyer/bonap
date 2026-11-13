import { AlarmClock } from "lucide-react"
import type { MealieMealPlan } from "../../../shared/types/mealie.ts"
import { cn } from "../../../lib/utils.ts"
import { decodeMealText } from "../../../shared/utils/mealText.ts"
import { BATCH_LOCATION_LABELS, formatBatchDate, thawReminder } from "../../../shared/utils/batch.ts"
import { formatDate } from "../../../shared/utils/date.ts"
import { BatchLocationIcon } from "../batch/BatchLocationIcon.tsx"

/**
 * Provenance d'un repas sorti du stock batch (« Congélateur · préparé le 2 nov. »)
 * et rappel de le sortir du congélateur la veille.
 */
export function MealBatchBadge({ meal, compact = false }: { meal: MealieMealPlan; compact?: boolean }) {
  const batch = decodeMealText(meal.text).batch
  if (!batch) return null
  const reminder = thawReminder(batch.location, meal.date, formatDate(new Date()))
  return (
    <div className={cn("flex flex-col gap-0.5", compact ? "text-[10px]" : "text-[11px]")}>
      <span
        className="flex items-center gap-1 text-muted-foreground"
        title={`Plat batch préparé le ${formatBatchDate(batch.preparedAt)}`}
      >
        <BatchLocationIcon location={batch.location} className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {BATCH_LOCATION_LABELS[batch.location]} · {formatBatchDate(batch.preparedAt)}
        </span>
      </span>
      {reminder && (
        <span className="flex items-start gap-1 font-semibold text-sky-700 dark:text-sky-400">
          <AlarmClock className="mt-px h-3 w-3 shrink-0" />
          <span>{reminder}</span>
        </span>
      )}
    </div>
  )
}
