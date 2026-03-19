import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Loader2, AlertCircle, Copy, Eye, Trash2 } from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { usePlanning } from "../hooks/usePlanning.ts"
import { RecipePickerDialog } from "../components/RecipePickerDialog.tsx"
import { RecipeDetailModal } from "../components/RecipeDetailModal.tsx"
import type { MealieMealPlan, MealieRecipe } from "../../shared/types/mealie.ts"

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

const MEAL_TYPES = [
  { key: "lunch", label: "Déjeuner", color: "bg-amber-50 border-amber-200" },
  { key: "dinner", label: "Dîner", color: "bg-orange-50 border-orange-200" },
] as const

function formatDayDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function formatDateRange(days: Date[]): string {
  if (days.length === 0) return ""
  const first = days[0]
  const last = days[days.length - 1]
  return `${first.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — ${last.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── MealCell ────────────────────────────────────────────────────────────────

interface MealCellProps {
  meals: MealieMealPlan[]
  previousMeal: MealieMealPlan | null
  onAdd: () => void
  onDelete: (id: number) => void
  onLeftovers: () => void
  colorClass: string
  date: string
  entryType: string
  onDrop: (draggedMeal: MealieMealPlan, targetDate: string, targetType: string) => void
  onView: (slug: string) => void
}

function MealCell({
  meals,
  previousMeal,
  onAdd,
  onDelete,
  onLeftovers,
  colorClass,
  date,
  entryType,
  onDrop,
  onView,
}: MealCellProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isEmpty = meals.length === 0

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const raw = e.dataTransfer.getData("application/json")
    if (!raw) return
    try {
      const meal = JSON.parse(raw) as MealieMealPlan
      onDrop(meal, date, entryType)
    } catch {
      // données invalides — on ignore
    }
  }

  return (
    <td
      className={`border border-border p-2 align-top ${colorClass} ${
        isDragOver ? "ring-2 ring-inset ring-primary" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-2">
        {meals.map((meal) => {
          const name = meal.recipe?.name ?? meal.title ?? "Sans titre"
          return (
            <div
              key={meal.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/json", JSON.stringify(meal))
                e.dataTransfer.effectAllowed = "move"
              }}
              className="flex flex-col rounded-md bg-white/80 shadow-sm cursor-grab active:cursor-grabbing overflow-hidden"
            >
              {/* Image + nom */}
              <div className="flex items-center gap-2 p-2">
                {meal.recipe && (
                  <img
                    src={`/api/media/recipes/${meal.recipe.id}/images/min-original.webp`}
                    alt={name}
                    className="h-20 w-20 shrink-0 rounded object-cover"
                  />
                )}
                <span className="line-clamp-4 flex-1 text-sm font-medium leading-tight">
                  {name}
                </span>
              </div>

              {/* Barre d'actions */}
              <div className="flex border-t border-border/40">
                {meal.recipe?.slug && (
                  <button
                    type="button"
                    onClick={() => onView(meal.recipe!.slug)}
                    title="Voir la recette"
                    className="flex flex-1 items-center justify-center py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(meal.id)}
                  title="Supprimer du planning"
                  className="flex flex-1 items-center justify-center py-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Actions : + et Restes */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onAdd}
            className="flex flex-1 items-center justify-center rounded-md border border-dashed border-current/20 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {isEmpty && (
            <button
              type="button"
              onClick={onLeftovers}
              disabled={!previousMeal}
              title={
                previousMeal
                  ? `Copier "${previousMeal.recipe?.name ?? "le repas"}" du créneau précédent`
                  : "Aucun repas au créneau précédent"
              }
              className="flex items-center justify-center rounded-md border border-dashed border-current/20 px-2 py-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </td>
  )
}

// ─── PlanningPage ─────────────────────────────────────────────────────────────

export function PlanningPage() {
  const {
    mealPlans,
    loading,
    error,
    centerDate,
    nbDays,
    setNbDays,
    goToPrevDay,
    goToNextDay,
    goToToday,
    addMeal,
    deleteMeal,
  } = usePlanning()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingSlot, setPendingSlot] = useState<{ date: string; entryType: string } | null>(null)
  const [previewSlug, setPreviewSlug] = useState<string | null>(null)

  const handlePreviewOpenChange = (open: boolean) => {
    if (!open) setPreviewSlug(null)
  }

  // Calcul des jours affichés — centrés sur centerDate
  const halfWindow = Math.floor(nbDays / 2)
  const days = Array.from({ length: nbDays }, (_, i) => {
    return addDays(centerDate, i - halfWindow)
  })

  const getMeals = (date: Date, type: string): MealieMealPlan[] => {
    const key = date.toISOString().slice(0, 10)
    return mealPlans.filter((m) => m.date === key && m.entryType === type)
  }

  const getPreviousMeal = (date: Date, type: string): MealieMealPlan | null => {
    // Créneau chronologiquement précédent : midi → soir J-1 ; soir → midi du même jour
    const [prevDate, prevType] =
      type === "lunch"
        ? [addDays(date, -1), "dinner"]
        : [date, "lunch"]
    const prevKey = prevDate.toISOString().slice(0, 10)
    const prevMeals = mealPlans.filter((m) => m.date === prevKey && m.entryType === prevType)
    return prevMeals.length > 0 ? prevMeals[0] : null
  }

  const handleAddMeal = (date: string, entryType: string) => {
    setPendingSlot({ date, entryType })
    setPickerOpen(true)
  }

  const handleRecipeSelect = async (recipe: MealieRecipe) => {
    if (!pendingSlot) return
    await addMeal(pendingSlot.date, pendingSlot.entryType, recipe.id)
    setPendingSlot(null)
  }

  const handleLeftovers = async (date: Date, entryType: string) => {
    const prev = getPreviousMeal(date, entryType)
    if (!prev?.recipe) return
    await addMeal(date.toISOString().slice(0, 10), entryType, prev.recipe.id)
  }

  const handleDrop = async (
    draggedMeal: MealieMealPlan,
    targetDate: string,
    targetType: string,
  ) => {
    // Eviter de drop sur la même cellule
    if (draggedMeal.date === targetDate && draggedMeal.entryType === targetType) return
    if (!draggedMeal.recipe) return
    await deleteMeal(draggedMeal.id)
    await addMeal(targetDate, targetType, draggedMeal.recipe.id)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Planning</h1>

        <div className="flex items-center gap-2">
          {/* Sélecteur nombre de jours */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {([3, 5, 7] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNbDays(n)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  nbDays === n
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {n}j
              </button>
            ))}
          </div>

          <Button variant="outline" size="icon" onClick={goToPrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm font-medium text-muted-foreground">
        {formatDateRange(days)}
      </p>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <div>
            <table className="w-full border-collapse text-sm table-fixed">
              <thead>
                <tr>
                  {/* Colonne étiquette */}
                  <th className="w-20 border border-border bg-secondary px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground" />
                  {days.map((date) => {
                    const isToday = new Date().toDateString() === date.toDateString()
                    const dayLabel = DAY_LABELS[date.getDay()]
                    return (
                      <th
                        key={date.toISOString()}
                        className={`border border-border px-2 py-2 text-center font-semibold ${
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        <div className="text-xs uppercase tracking-wide opacity-70">
                          {dayLabel}
                        </div>
                        <div className="text-sm">{formatDayDate(date)}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map(({ key, label, color }) => (
                  <tr key={key}>
                    <td className="border border-border bg-secondary px-3 py-2 align-middle w-20">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                      </span>
                    </td>
                    {days.map((date) => {
                      const dateStr = date.toISOString().slice(0, 10)
                      const meals = getMeals(date, key)
                      const prevMeal = getPreviousMeal(date, key)
                      return (
                        <MealCell
                          key={date.toISOString()}
                          meals={meals}
                          previousMeal={prevMeal}
                          onAdd={() => handleAddMeal(dateStr, key)}
                          onDelete={deleteMeal}
                          onLeftovers={() => handleLeftovers(date, key)}
                          colorClass={color}
                          date={dateStr}
                          entryType={key}
                          onDrop={handleDrop}
                          onView={setPreviewSlug}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RecipePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleRecipeSelect}
      />

      <RecipeDetailModal
        slug={previewSlug}
        onOpenChange={handlePreviewOpenChange}
      />
    </div>
  )
}
