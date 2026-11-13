import { Refrigerator, Snowflake } from "lucide-react"
import type { BatchLocation } from "../../../shared/utils/batch.ts"
import { cn } from "../../../lib/utils.ts"

export function BatchLocationIcon({ location, className }: { location: BatchLocation; className?: string }) {
  return location === "freezer"
    ? <Snowflake className={cn("h-3.5 w-3.5 text-sky-600 dark:text-sky-400", className)} aria-hidden />
    : <Refrigerator className={cn("h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400", className)} aria-hidden />
}
