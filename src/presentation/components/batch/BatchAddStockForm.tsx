import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "../ui/button.tsx"
import { Input } from "../ui/input.tsx"
import {
  BATCH_LOCATIONS, BATCH_LOCATION_LABELS, type BatchLocation, type BatchStockEntry,
} from "../../../shared/utils/batch.ts"
import { formatDate } from "../../../shared/utils/date.ts"
import { cn } from "../../../lib/utils.ts"
import { BatchLocationIcon } from "./BatchLocationIcon.tsx"

/** Saisie d'une fournée : où, combien de plats, préparés quel jour. */
export function BatchAddStockForm({
  onAdd,
  disabled,
  defaultLocation = "freezer",
}: {
  onAdd: (entry: BatchStockEntry) => void | Promise<void>
  disabled?: boolean
  defaultLocation?: BatchLocation
}) {
  const [location, setLocation] = useState<BatchLocation>(defaultLocation)
  const [count, setCount] = useState(1)
  const [preparedAt, setPreparedAt] = useState(() => formatDate(new Date()))

  const submit = async () => {
    if (count < 1 || !preparedAt) return
    await onAdd({ location, count, preparedAt })
    setCount(1)
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-0.5" role="group" aria-label="Rangement">
        {BATCH_LOCATIONS.map((loc) => (
          <button
            key={loc}
            type="button"
            aria-pressed={location === loc}
            onClick={() => setLocation(loc)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
              location === loc ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BatchLocationIcon location={loc} className="h-3 w-3" />
            {BATCH_LOCATION_LABELS[loc]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1" aria-label="Nombre de plats">
        <button
          type="button"
          onClick={() => setCount((c) => Math.max(1, c - 1))}
          className="rounded border border-border/60 p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Un plat de moins"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-14 text-center text-xs font-semibold tabular-nums">
          {count} {count > 1 ? "plats" : "plat"}
        </span>
        <button
          type="button"
          onClick={() => setCount((c) => Math.min(50, c + 1))}
          className="rounded border border-border/60 p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="Un plat de plus"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <Input
        type="date"
        value={preparedAt}
        max={formatDate(new Date())}
        onChange={(e) => setPreparedAt(e.target.value)}
        className="h-8 w-[9.5rem] text-xs"
        aria-label="Date de préparation"
      />
      <Button size="sm" onClick={() => void submit()} disabled={disabled || !preparedAt}>
        Ajouter au stock
      </Button>
    </div>
  )
}
