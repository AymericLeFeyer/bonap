import { useState } from "react"
import { CookingPot, Loader2, Minus, Trash2 } from "lucide-react"
import { Badge } from "../ui/badge.tsx"
import { Input } from "../ui/input.tsx"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import {
  addToStock, getBatchInfo, normalizeStock, stockCount, takeFromStock,
  type BatchInfo, type BatchStockEntry,
} from "../../../shared/utils/batch.ts"
import { useUpdateBatch } from "../../hooks/useUpdateBatch.ts"
import { cn } from "../../../lib/utils.ts"
import { BatchAddStockForm } from "./BatchAddStockForm.tsx"
import { BatchStockLine } from "./BatchStockLine.tsx"

function DaysInput({
  label,
  value,
  onCommit,
  disabled,
}: {
  label: string
  value?: number
  onCommit: (days: number | undefined) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value ? String(value) : "")
  const commit = () => {
    if (draft === null) return
    const n = Number.parseInt(draft, 10)
    const next = Number.isFinite(n) && n > 0 ? n : undefined
    setDraft(null)
    if (next !== value) onCommit(next)
  }
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        value={shown}
        placeholder="—"
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
        className="h-7 w-16 px-2 text-xs tabular-nums"
      />
      jours
    </label>
  )
}

/**
 * Section « Batch cooking » d'une fiche recette : marquer la recette, régler
 * les durées de conservation et tenir le stock de plats préparés.
 */
export function BatchRecipePanel({
  recipe,
  onRecipeChange,
  className,
}: {
  recipe: MealieRecipe
  onRecipeChange: (recipe: MealieRecipe) => void
  className?: string
}) {
  const { updateBatch, loading, error } = useUpdateBatch()
  const info = getBatchInfo(recipe)
  const total = stockCount(info.stock)

  const apply = async (update: (current: BatchInfo) => BatchInfo) => {
    const updated = await updateBatch(recipe.slug, update)
    if (updated) onRecipeChange(updated)
  }

  const removeEntry = (entry: BatchStockEntry) =>
    apply((current) => ({
      ...current,
      stock: normalizeStock(current.stock.filter((e) => !(e.location === entry.location && e.preparedAt === entry.preparedAt))),
    }))

  return (
    <div className={cn("space-y-3 rounded-[var(--radius-xl)] border border-border/50 bg-secondary/30 p-3.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
          <CookingPot className="h-3 w-3" />
          Batch cooking
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        </p>
        <Badge
          variant={info.enabled ? "default" : "outline"}
          className={cn("select-none", total > 0 && info.enabled ? "cursor-not-allowed opacity-80" : "cursor-pointer")}
          title={total > 0 && info.enabled ? "Videz le stock avant de retirer la recette du batch" : undefined}
          onClick={() => {
            if (loading || (info.enabled && total > 0)) return
            void apply((current) => ({ ...current, enabled: !current.enabled }))
          }}
        >
          {info.enabled ? "Recette batch" : "Marquer batch"}
        </Badge>
      </div>

      {info.enabled && (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <DaysInput
              label="Frigo"
              value={info.fridgeDays}
              disabled={loading}
              onCommit={(fridgeDays) => void apply((current) => ({ ...current, fridgeDays }))}
            />
            <DaysInput
              label="Congélateur"
              value={info.freezerDays}
              disabled={loading}
              onCommit={(freezerDays) => void apply((current) => ({ ...current, freezerDays }))}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold">
              {total === 0 ? "Aucun plat en stock" : `${total} ${total > 1 ? "plats" : "plat"} en stock`}
            </p>
            {info.stock.map((entry) => (
              <BatchStockLine
                key={`${entry.location}:${entry.preparedAt}`}
                entry={entry}
                info={info}
                actions={(
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void apply((current) => ({
                        ...current,
                        stock: takeFromStock(current.stock, entry.location, entry.preparedAt).stock,
                      }))}
                      title="Un plat consommé"
                      className="rounded border border-border/60 p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void removeEntry(entry)}
                      title="Retirer du stock"
                      className="rounded border border-border/60 p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              />
            ))}
            <BatchAddStockForm
              disabled={loading}
              onAdd={(entry) => apply((current) => ({ ...current, stock: addToStock(current.stock, entry) }))}
            />
          </div>
        </>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
