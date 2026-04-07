import { useState, useEffect } from "react"
import { Loader2, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.tsx"
import { getPlanningRangeUseCase } from "../../infrastructure/container.ts"
import type { MealieMealPlan } from "../../shared/types/mealie.ts"
import { cn } from "../../lib/utils.ts"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDayFr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

// ─── PlanningSlotPicker ───────────────────────────────────────────────────────

export interface PlanningSlotPickerProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  recipeName: string
  onSelect: (date: string, entryType: string, existingMealId?: number) => Promise<void>
}

export function PlanningSlotPicker({ open, onOpenChange, recipeName, onSelect }: PlanningSlotPickerProps) {
  const [slots, setSlots] = useState<MealieMealPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [addingSlot, setAddingSlot] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const today = new Date()
    const end = new Date(today)
    end.setDate(end.getDate() + 13)
    getPlanningRangeUseCase
      .execute(toDateStr(today), toDateStr(end))
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [open])

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return toDateStr(d)
  })

  const mealMap = new Map(slots.map((m) => [`${m.date}-${m.entryType}`, m]))

  const handleSlotClick = async (date: string, entryType: string) => {
    const key = `${date}-${entryType}`
    const existing = mealMap.get(key)
    setAddingSlot(key)
    try {
      await onSelect(date, entryType, existing?.id)
    } finally {
      setAddingSlot(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">
            Où placer ce plat ?
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{recipeName}</p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1 -mr-1">
            {days.map((date) => {
              const lunch = mealMap.get(`${date}-lunch`)
              const dinner = mealMap.get(`${date}-dinner`)
              return (
                <div key={date} className="grid grid-cols-[88px_1fr_1fr] items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground capitalize truncate">
                    {formatDayFr(date)}
                  </span>
                  <SlotButton
                    meal={lunch}
                    label="Déj."
                    isAdding={addingSlot === `${date}-lunch`}
                    onClick={() => void handleSlotClick(date, "lunch")}
                  />
                  <SlotButton
                    meal={dinner}
                    label="Dîner"
                    isAdding={addingSlot === `${date}-dinner`}
                    onClick={() => void handleSlotClick(date, "dinner")}
                  />
                </div>
              )
            })}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/50 text-center pt-1">
          Cliquez sur un créneau vide pour l'ajouter, ou sur un repas existant pour le remplacer.
        </p>
      </DialogContent>
    </Dialog>
  )
}

// ─── SlotButton ───────────────────────────────────────────────────────────────

function SlotButton({ meal, label, isAdding, onClick }: {
  meal?: MealieMealPlan
  label: string
  isAdding: boolean
  onClick: () => void
}) {
  if (isAdding) {
    return (
      <div className="h-8 flex items-center justify-center rounded-[var(--radius-md)] border border-primary/30 bg-primary/5">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
      </div>
    )
  }

  if (meal) {
    return (
      <button
        onClick={onClick}
        title={`Remplacer : ${meal.recipe?.name ?? meal.title}`}
        className={cn(
          "h-8 px-2 text-left rounded-[var(--radius-md)] border border-border",
          "bg-muted/40 hover:border-destructive/40 hover:bg-destructive/5",
          "transition-colors group overflow-hidden",
        )}
      >
        <span className="text-[11px] text-foreground/70 group-hover:text-destructive truncate block leading-none">
          {meal.recipe?.name ?? meal.title ?? label}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-2 rounded-[var(--radius-md)] border border-dashed border-border/50",
        "hover:border-primary/50 hover:bg-primary/5",
        "transition-colors flex items-center justify-center gap-1",
      )}
    >
      <Plus className="h-3 w-3 text-muted-foreground/40" />
      <span className="text-[11px] text-muted-foreground/40">{label}</span>
    </button>
  )
}
