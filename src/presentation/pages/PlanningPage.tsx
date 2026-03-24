import { useState } from "react"
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Plus, Loader2, AlertCircle, Copy, Eye, Trash2, ShoppingCart, CheckCircle2,
} from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { usePlanning } from "../hooks/usePlanning.ts"
import { useAddRecipesToCart } from "../hooks/useAddRecipesToCart.ts"
import { RecipePickerDialog } from "../components/RecipePickerDialog.tsx"
import { RecipeDetailModal } from "../components/RecipeDetailModal.tsx"
import type { MealieMealPlan, MealieRecipe } from "../../shared/types/mealie.ts"
import { formatDate } from "../../shared/utils/date.ts"
import { cn } from "../../lib/utils.ts"

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

const MEAL_TYPES = [
  {
    key: "lunch",
    label: "Déjeuner",
    color: "bg-[oklch(0.97_0.016_78)] dark:bg-[oklch(0.19_0.016_65)]",
    borderColor: "border-[oklch(0.88_0.030_78)] dark:border-[oklch(0.28_0.020_65)]",
  },
  {
    key: "dinner",
    label: "Dîner",
    color: "bg-[oklch(0.96_0.020_55)] dark:bg-[oklch(0.18_0.018_50)]",
    borderColor: "border-[oklch(0.87_0.030_52)] dark:border-[oklch(0.26_0.018_50)]",
  },
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

// ─── MobileMealSection ────────────────────────────────────────────────────────

interface MobileMealSectionProps {
  meals: MealieMealPlan[]
  previousMeal: MealieMealPlan | null
  onAdd: () => void
  onDelete: (id: number) => void
  onLeftovers: () => void
  onView: (slug: string) => void
}

function MobileMealSection({ meals, previousMeal, onAdd, onDelete, onLeftovers, onView }: MobileMealSectionProps) {
  const isEmpty = meals.length === 0
  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      {meals.map((meal) => {
        const name = meal.recipe?.name ?? meal.title ?? "Sans titre"
        return (
          <div
            key={meal.id}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-lg)]",
              "bg-card border border-border/40 shadow-subtle overflow-hidden",
            )}
          >
            {meal.recipe && (
              <img
                src={`/api/media/recipes/${meal.recipe.id}/images/min-original.webp`}
                alt={name}
                className="h-14 w-14 shrink-0 object-cover"
              />
            )}
            <span className="flex-1 text-[13px] font-medium leading-snug line-clamp-2 pr-1">{name}</span>
            <div className="flex shrink-0 flex-col border-l border-border/40">
              {meal.recipe?.slug && (
                <button
                  type="button"
                  onClick={() => onView(meal.recipe!.slug)}
                  className="flex items-center justify-center p-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(meal.id)}
                className="flex items-center justify-center p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            "flex flex-1 items-center justify-center rounded-[var(--radius-lg)]",
            "border border-dashed border-border/60 py-2",
            "text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/4",
            "transition-all duration-150",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {isEmpty && (
          <button
            type="button"
            onClick={onLeftovers}
            disabled={!previousMeal}
            title={previousMeal ? `Copier "${previousMeal.recipe?.name ?? "le repas"}"` : "Aucun repas précédent"}
            className={cn(
              "flex items-center justify-center rounded-[var(--radius-lg)]",
              "border border-dashed border-border/60 px-3 py-2",
              "text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/4",
              "disabled:cursor-not-allowed disabled:opacity-30",
              "transition-all duration-150",
            )}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── MealCell ─────────────────────────────────────────────────────────────────

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
  meals, previousMeal, onAdd, onDelete, onLeftovers,
  colorClass, date, entryType, onDrop, onView,
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
      // Invalid drag data — ignore
    }
  }

  return (
    <td
      className={cn(
        "border border-border/50 p-2 align-top min-w-[130px]",
        colorClass,
        isDragOver && "ring-2 ring-inset ring-primary/40 bg-primary/6",
      )}
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
              className={cn(
                "flex flex-col rounded-[var(--radius-lg)]",
                "bg-card border border-border/40 shadow-subtle",
                "cursor-grab active:cursor-grabbing",
                "hover:border-primary/30 hover:shadow-warm",
                "transition-all duration-150 overflow-hidden",
              )}
            >
              <div className="flex items-center gap-2 p-2">
                {meal.recipe && (
                  <img
                    src={`/api/media/recipes/${meal.recipe.id}/images/min-original.webp`}
                    alt={name}
                    className="h-[72px] w-[72px] shrink-0 rounded-[var(--radius-md)] object-cover"
                  />
                )}
                <span className="line-clamp-4 flex-1 text-[12.5px] font-medium leading-snug">
                  {name}
                </span>
              </div>

              <div className="flex border-t border-border/30">
                {meal.recipe?.slug && (
                  <button
                    type="button"
                    onClick={() => onView(meal.recipe!.slug)}
                    title="Voir la recette"
                    className="flex flex-1 items-center justify-center py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(meal.id)}
                  title="Supprimer du planning"
                  className="flex flex-1 items-center justify-center py-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive border-l border-border/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        <div className="flex gap-1">
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "flex flex-1 items-center justify-center rounded-[var(--radius-md)]",
              "border border-dashed border-border/50 py-2",
              "text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/4",
              "transition-all duration-150",
            )}
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
              className={cn(
                "flex items-center justify-center rounded-[var(--radius-md)]",
                "border border-dashed border-border/50 px-2 py-2",
                "text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/4",
                "disabled:cursor-not-allowed disabled:opacity-30",
                "transition-all duration-150",
              )}
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
    mealPlans, loading, error, centerDate, nbDays, setNbDays,
    goToPrevDay, goToNextDay, goToPrevPeriod, goToNextPeriod, goToToday,
    addMeal, deleteMeal,
  } = usePlanning()

  const {
    addRecipes: addRecipesToCart,
    loading: addingToCart,
    error: cartError,
    success: cartSuccess,
  } = useAddRecipesToCart()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingSlot, setPendingSlot] = useState<{ date: string; entryType: string } | null>(null)
  const [previewSlug, setPreviewSlug] = useState<string | null>(null)

  const handlePreviewOpenChange = (open: boolean) => {
    if (!open) setPreviewSlug(null)
  }

  const days = Array.from({ length: nbDays }, (_, i) => addDays(centerDate, i - 1))

  const handleAddToCart = async () => {
    const visibleDateStrs = new Set(days.map((d) => formatDate(d)))
    const recipeIds = mealPlans
      .filter((m) => visibleDateStrs.has(m.date) && m.recipe?.id)
      .map((m) => m.recipe!.id)
    const unique = [...new Set(recipeIds)]
    await addRecipesToCart(unique)
  }

  const getMeals = (date: Date, type: string): MealieMealPlan[] => {
    const key = date.toISOString().slice(0, 10)
    return mealPlans.filter((m) => m.date === key && m.entryType === type)
  }

  const getPreviousMeal = (date: Date, type: string): MealieMealPlan | null => {
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
    if (draggedMeal.date === targetDate && draggedMeal.entryType === targetType) return
    if (!draggedMeal.recipe) return
    await deleteMeal(draggedMeal.id)
    await addMeal(targetDate, targetType, draggedMeal.recipe.id)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── En-tête sticky ── */}
      <div
        className={cn(
          "sticky top-0 z-20 -mx-4 md:-mx-7",
          "bg-background/95 backdrop-blur-md",
          "px-4 pb-3 pt-5 md:px-7",
          "border-b border-border/40",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Planning</h1>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground font-medium">
              {formatDateRange(days)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Ajouter au panier */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleAddToCart()}
              disabled={addingToCart}
              className="gap-1.5"
            >
              {addingToCart ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : cartSuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.55_0.16_145)]" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {cartSuccess ? "Ajouté !" : "Ajouter au panier"}
              </span>
            </Button>

            {/* Sélecteur nombre de jours */}
            <div className={cn(
              "flex items-center rounded-[var(--radius-lg)]",
              "border border-border overflow-hidden",
              "bg-card shadow-subtle",
            )}>
              {([3, 5, 7] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNbDays(n)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold transition-colors",
                    nbDays === n
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {n}j
                </button>
              ))}
            </div>

            {/* Navigation temporelle */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={goToPrevPeriod}>
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={goToPrevDay}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="px-3">
                Aujourd'hui
              </Button>
              <Button variant="outline" size="icon-sm" onClick={goToNextDay}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon-sm" onClick={goToNextPeriod}>
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/50" />
        </div>
      )}

      {(error || cartError) && (
        <div className={cn(
          "flex items-center gap-3 rounded-[var(--radius-xl)]",
          "border border-destructive/20 bg-destructive/8 p-4 text-destructive",
        )}>
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error ?? `Panier : ${cartError}`}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Vue mobile : cartes verticales ── */}
          <div className="flex flex-col gap-3 md:hidden">
            {days.slice(1).map((date) => {
              const isToday = new Date().toDateString() === date.toDateString()
              const dayLabel = DAY_LABELS[date.getDay()]
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "rounded-[var(--radius-xl)] border overflow-hidden",
                    isToday ? "border-primary/40 shadow-warm" : "border-border/50 shadow-subtle",
                  )}
                >
                  <div className={cn(
                    "px-4 py-2.5 text-sm font-bold",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground",
                  )}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.10em] mr-2 opacity-60">{dayLabel}</span>
                    {formatDayDate(date)}
                  </div>
                  {MEAL_TYPES.map(({ key, label, color }) => {
                    const dateStr = date.toISOString().slice(0, 10)
                    const meals = getMeals(date, key)
                    const prevMeal = getPreviousMeal(date, key)
                    return (
                      <div key={key} className={cn(color, "border-t border-border/40")}>
                        <div className="px-3 pt-2 pb-1">
                          <span className="text-[9.5px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
                            {label}
                          </span>
                        </div>
                        <MobileMealSection
                          meals={meals}
                          previousMeal={prevMeal}
                          onAdd={() => handleAddMeal(dateStr, key)}
                          onDelete={deleteMeal}
                          onLeftovers={() => handleLeftovers(date, key)}
                          onView={setPreviewSlug}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* ── Vue desktop : tableau ── */}
          <div className={cn(
            "hidden md:block overflow-x-auto",
            "rounded-[var(--radius-xl)] border border-border/50",
            "shadow-subtle",
          )}>
            <table className="w-full border-collapse text-sm table-fixed">
              <thead>
                <tr>
                  <th className={cn(
                    "w-[80px] border-b border-r border-border/50 bg-secondary/60",
                    "px-3 py-2.5 text-left",
                  )} />
                  {days.map((date) => {
                    const isToday = new Date().toDateString() === date.toDateString()
                    const dayLabel = DAY_LABELS[date.getDay()]
                    return (
                      <th
                        key={date.toISOString()}
                        className={cn(
                          "border-b border-r border-border/50 px-2 py-2.5 text-center font-semibold",
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/60 text-foreground",
                        )}
                      >
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.10em] opacity-60">
                          {dayLabel}
                        </div>
                        <div className="text-[13px] font-bold mt-0.5">{formatDayDate(date)}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map(({ key, label, color, borderColor }) => (
                  <tr key={key}>
                    <td className={cn(
                      "border-b border-r border-border/50 bg-secondary/60",
                      "px-3 py-2 align-middle w-[80px]",
                    )}>
                      <span className="text-[9.5px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
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
                          colorClass={cn(color, "border-b border-r", borderColor)}
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
        </>
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
