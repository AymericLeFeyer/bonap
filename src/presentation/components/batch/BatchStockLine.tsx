import type { ReactNode } from "react"
import {
  BATCH_LOCATION_LABELS, expiryLabel, expiryStatus, formatBatchDate,
  type BatchInfo, type BatchStockEntry,
} from "../../../shared/utils/batch.ts"
import { formatDate } from "../../../shared/utils/date.ts"
import { cn } from "../../../lib/utils.ts"
import { BatchLocationIcon } from "./BatchLocationIcon.tsx"

const STATUS_CLASSES = {
  expired: "text-destructive font-semibold",
  soon: "text-amber-700 dark:text-amber-400 font-semibold",
  ok: "text-muted-foreground",
  unknown: "text-muted-foreground/70 italic",
} as const

/** Une entrée de stock : « ❄ 3 plats · préparés le 2 nov. · à consommer avant le … ». */
export function BatchStockLine({
  entry,
  info,
  actions,
  className,
}: {
  entry: BatchStockEntry
  info: Pick<BatchInfo, "fridgeDays" | "freezerDays">
  actions?: ReactNode
  className?: string
}) {
  const { status, expiry, daysLeft } = expiryStatus(entry, info, formatDate(new Date()))
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <BatchLocationIcon location={entry.location} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="leading-tight">
          <span className="font-semibold tabular-nums">{entry.count}</span>
          {" "}{entry.count > 1 ? "plats" : "plat"}
          <span className="text-muted-foreground"> · {BATCH_LOCATION_LABELS[entry.location].toLowerCase()} · préparé{entry.count > 1 ? "s" : ""} le {formatBatchDate(entry.preparedAt)}</span>
        </p>
        <p className={cn("text-xs leading-tight", STATUS_CLASSES[status])}>{expiryLabel(daysLeft, expiry)}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </div>
  )
}
