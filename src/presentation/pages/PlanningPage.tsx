import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
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
import { recipeImageUrl } from "../../shared/utils/image.ts"

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
  onAdd: () => void
  onMealTouchStart: (meal: MealieMealPlan, e: React.TouchEvent) => void
}

function MobileMealSection({ meals, onAdd, onMealTouchStart }: MobileMealSectionProps) {
  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      {meals.map((meal) => {
        return (
          <div
            key={meal.id}
            onTouchStart={(e) => onMealTouchStart(meal, e)}
            className={cn(
              "rounded-[var(--radius-lg)]",
              "bg-card border border-border/40 shadow-subtle overflow-hidden",
              "touch-none select-none",
            )}
          >
            {meal.recipe ? (
              <img
                src={recipeImageUrl(meal.recipe, "min-original")}
                alt={meal.recipe.name ?? "Repas"}
                draggable={false}
                className="w-full aspect-square object-cover pointer-events-none"
              />
            ) : (
              <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                <span className="text-[11px] text-muted-foreground font-medium px-2 text-center">
                  {meal.title ?? "Sans titre"}
                </span>
              </div>
            )}
          </div>
        )
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Ajouter un repas"
        className={cn(
          "flex w-full items-center justify-center rounded-[var(--radius-lg)]",
          "border border-dashed border-border/60 py-3",
          "text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/4",
          "transition-all duration-150",
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── MealCell ─────────────────────────────────────────────────────────────────

interface MealCellProps {
  meals: MealieMealPlan[]
  lastMeals: MealieMealPlan[]
  onAdd: () => void
  onDelete: (id: number) => void
  onSelectLeftover: (meal: MealieMealPlan) => void
  colorClass: string
  date: string
  entryType: string
  onDrop: (draggedMeal: MealieMealPlan, targetDate: string, targetType: string) => void
  onView: (slug: string) => void
}

function MealCell({
  meals, lastMeals, onAdd, onDelete, onSelectLeftover,
  colorClass, date, entryType, onDrop, onView,
}: MealCellProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const copyBtnRef = useRef<HTMLButtonElement>(null)
  const isEmpty = meals.length === 0

  const DROPDOWN_WIDTH = 200
  const handleCopyClick = () => {
    if (lastMeals.length === 0) return
    const rect = copyBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const overflowsRight = rect.left + DROPDOWN_WIDTH > window.innerWidth
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: overflowsRight
        ? rect.right + window.scrollX - DROPDOWN_WIDTH
        : rect.left + window.scrollX,
    })
    setDropdownOpen(true)
  }

  useEffect(() => {
    if (!dropdownOpen) return
    const close = () => setDropdownOpen(false)
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", close)
    }
  }, [dropdownOpen])

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
                    src={recipeImageUrl(meal.recipe, "min-original")}
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
            aria-label="Ajouter un repas"
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
            <>
              <button
                ref={copyBtnRef}
                type="button"
                onClick={handleCopyClick}
                disabled={lastMeals.length === 0}
                title={
                  lastMeals.length > 0
                    ? "Copier un repas précédent (restes)"
                    : "Aucun repas précédent disponible"
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
              {dropdownOpen && dropdownPos && createPortal(
                <div
                  className={cn(
                    "fixed z-50 w-[200px]",
                    "rounded-[var(--radius-lg)] border border-border/60",
                    "bg-card shadow-lg overflow-hidden",
                  )}
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {lastMeals.map((meal) => (
                    <button
                      key={meal.id}
                      type="button"
                      onClick={() => { setDropdownOpen(false); onSelectLeftover(meal) }}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 text-left",
                        "text-sm hover:bg-accent hover:text-accent-foreground",
                        "transition-colors",
                      )}
                    >
                      {meal.recipe && (
                        <img
                          src={recipeImageUrl(meal.recipe, "min-original")}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-[var(--radius-sm)] object-cover"
                        />
                      )}
                      <span className="line-clamp-2 leading-snug">
                        {meal.recipe?.name ?? meal.title ?? "Sans titre"}
                      </span>
                    </button>
                  ))}
                </div>,
                document.body,
              )}
            </>
          )}
        </div>
      </div>
    </td>
  )
}

// ─── PlanningPage ─────────────────────────────────────────────────────────────

const DRAG_THRESHOLD = 8

export function PlanningPage() {
  const {
    mealPlans, loading, error, centerDate, nbDays, setNbDays,
    goToPrevDay, goToNextDay, goToPrevPeriod, goToNextPeriod, goToToday, goToTodayMobile,
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
  const [mobileMenuMeal, setMobileMenuMeal] = useState<{ meal: MealieMealPlan; y: number } | null>(null)
  const mobileMenuMealRef = useRef<((data: { meal: MealieMealPlan; y: number } | null) => void) | null>(null)

  // ── Mobile touch drag state ──
  const touchDragRef = useRef<{
    meal: MealieMealPlan
    startX: number
    startY: number
    active: boolean
    longPressReady: boolean
  } | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ghostState, setGhostState] = useState<{ meal: MealieMealPlan; x: number; y: number } | null>(null)
  const [mobileDragOver, setMobileDragOver] = useState<{ date: string; type: string } | null>(null)

  useEffect(() => { mobileMenuMealRef.current = setMobileMenuMeal }, [])

  const handlePreviewOpenChange = (open: boolean) => {
    if (!open) setPreviewSlug(null)
  }

  const days = Array.from({ length: nbDays }, (_, i) => addDays(centerDate, i - 1))
  const mobileDays = Array.from({ length: nbDays }, (_, i) => addDays(centerDate, i))

  const handleAddToCart = async () => {
    const visibleDateStrs = new Set(days.map((d) => formatDate(d)))
    const meals = mealPlans
      .filter((m) => visibleDateStrs.has(m.date) && m.recipe?.slug && m.recipe?.name)
      .map((m) => ({ slug: m.recipe!.slug, recipeName: m.recipe!.name }))
    await addRecipesToCart(meals)
  }

  const getMeals = (date: Date, type: string): MealieMealPlan[] => {
    const key = formatDate(date)
    return mealPlans.filter((m) => m.date === key && m.entryType === type)
  }

  const getLastMeals = (date: Date, type: string, count: number): MealieMealPlan[] => {
    const result: MealieMealPlan[] = []
    const seenIds = new Set<string>()
    let currentDate = date
    let currentType = type
    for (let i = 0; i < count * 8 && result.length < count; i++) {
      if (currentType === "lunch") {
        currentDate = addDays(currentDate, -1)
        currentType = "dinner"
      } else {
        currentType = "lunch"
      }
      const key = formatDate(currentDate)
      const slots = mealPlans.filter((m) => m.date === key && m.entryType === currentType)
      for (const meal of slots) {
        if (meal.recipe && !seenIds.has(meal.recipe.id)) {
          seenIds.add(meal.recipe.id)
          result.push(meal)
          if (result.length >= count) break
        }
      }
    }
    return result
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

  const handleLeftoverSelect = async (date: Date, entryType: string, meal: MealieMealPlan) => {
    if (!meal.recipe) return
    await addMeal(formatDate(date), entryType, meal.recipe.id)
  }

  const handleDrop = useCallback(async (
    draggedMeal: MealieMealPlan,
    targetDate: string,
    targetType: string,
  ) => {
    if (draggedMeal.date === targetDate && draggedMeal.entryType === targetType) return
    if (!draggedMeal.recipe) return
    await deleteMeal(draggedMeal.id)
    await addMeal(targetDate, targetType, draggedMeal.recipe.id)
  }, [deleteMeal, addMeal])

  // Use a ref so touch handlers always call the latest version without re-mounting the effect
  const handleDropRef = useRef(handleDrop)
  useEffect(() => { handleDropRef.current = handleDrop }, [handleDrop])

  // ── Mobile touch D&D handlers ──
  const handleMealTouchStart = useCallback((meal: MealieMealPlan, e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchDragRef.current = {
      meal,
      startX: touch.clientX,
      startY: touch.clientY,
      active: false,
      longPressReady: false,
    }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      if (touchDragRef.current) {
        touchDragRef.current.longPressReady = true
      }
    }, 400)
  }, [])

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!touchDragRef.current) return
      if (!touchDragRef.current.longPressReady) return
      const touch = e.touches[0]
      const dx = touch.clientX - touchDragRef.current.startX
      const dy = touch.clientY - touchDragRef.current.startY

      if (!touchDragRef.current.active && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        touchDragRef.current.active = true
      }

      if (touchDragRef.current.active) {
        e.preventDefault() // prevent scroll during drag
        setGhostState({ meal: touchDragRef.current.meal, x: touch.clientX, y: touch.clientY })

        const el = document.elementFromPoint(touch.clientX, touch.clientY)
        const slot = el?.closest<HTMLElement>("[data-date][data-type]")
        setMobileDragOver(slot ? { date: slot.dataset.date!, type: slot.dataset.type! } : null)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchDragRef.current) return
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      if (touchDragRef.current.active) {
        const touch = e.changedTouches[0]
        const el = document.elementFromPoint(touch.clientX, touch.clientY)
        const slot = el?.closest<HTMLElement>("[data-date][data-type]")
        if (slot) {
          void handleDropRef.current(touchDragRef.current.meal, slot.dataset.date!, slot.dataset.type!)
        }
      } else if (!touchDragRef.current.longPressReady) {
        // Tap simple : ouvrir le menu près du tap
        const touch = e.changedTouches[0]
        mobileMenuMealRef.current?.({ meal: touchDragRef.current.meal, y: touch.clientY })
      }
      touchDragRef.current = null
      setGhostState(null)
      setMobileDragOver(null)
    }

    document.addEventListener("touchmove", onTouchMove, { passive: false })
    document.addEventListener("touchend", onTouchEnd)
    return () => {
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  useEffect(() => {
    if (window.innerWidth < 768) {
      goToTodayMobile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            {mobileDays.map((date) => {
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
                  <div className="grid grid-cols-2 divide-x divide-border/40">
                    {MEAL_TYPES.map(({ key, label, color }) => {
                      const dateStr = formatDate(date)
                      const meals = getMeals(date, key)
                      const isDropTarget = mobileDragOver?.date === dateStr && mobileDragOver.type === key
                      return (
                        <div
                          key={key}
                          data-date={dateStr}
                          data-type={key}
                          className={cn(
                            color,
                            "border-t border-border/40",
                            isDropTarget && "ring-2 ring-inset ring-primary/40 bg-primary/6",
                          )}
                        >
                          <div className="px-3 pt-2 pb-1">
                            <span className="text-[9.5px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
                              {label}
                            </span>
                          </div>
                          <MobileMealSection
                            meals={meals}
                            onAdd={() => handleAddMeal(dateStr, key)}
                            onMealTouchStart={handleMealTouchStart}
                          />
                        </div>
                      )
                    })}
                  </div>
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
                      const dateStr = formatDate(date)
                      const meals = getMeals(date, key)
                      const lastMeals = getLastMeals(date, key, 3)
                      return (
                        <MealCell
                          key={date.toISOString()}
                          meals={meals}
                          lastMeals={lastMeals}
                          onAdd={() => handleAddMeal(dateStr, key)}
                          onDelete={deleteMeal}
                          onSelectLeftover={(meal) => void handleLeftoverSelect(date, key, meal)}
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

      {/* ── Ghost de drag mobile ── */}
      {ghostState && createPortal(
        <div
          className={cn(
            "fixed pointer-events-none z-50",
            "flex items-center gap-2 p-2 pr-3",
            "max-w-[200px] rounded-[var(--radius-lg)] overflow-hidden",
            "bg-card border border-primary/50 shadow-xl opacity-90",
          )}
          style={{
            left: ghostState.x - 100,
            top: ghostState.y - 28,
            transform: "rotate(2deg) scale(1.03)",
          }}
        >
          {ghostState.meal.recipe && (
            <img
              src={recipeImageUrl(ghostState.meal.recipe, "min-original")}
              alt=""
              className="h-10 w-10 shrink-0 rounded-[var(--radius-md)] object-cover"
            />
          )}
          <span className="text-[12px] font-medium leading-snug line-clamp-2">
            {ghostState.meal.recipe?.name ?? ghostState.meal.title ?? "Repas"}
          </span>
        </div>,
        document.body,
      )}

      {mobileMenuMeal && (() => {
        const MENU_HEIGHT = 160
        const MARGIN = 8
        const viewportH = window.innerHeight
        const showAbove = mobileMenuMeal.y + MENU_HEIGHT + MARGIN > viewportH
        const posStyle: React.CSSProperties = showAbove
          ? { bottom: viewportH - mobileMenuMeal.y + MARGIN }
          : { top: mobileMenuMeal.y + MARGIN }
        return (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMobileMenuMeal(null)}
          >
            <div
              className={cn(
                "absolute left-4 right-4 mx-auto max-w-xs",
                "rounded-[var(--radius-xl)]",
                "bg-card border border-border/50 shadow-xl overflow-hidden",
              )}
              style={posStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-border/40">
                <p className="text-sm font-semibold line-clamp-1">
                  {mobileMenuMeal.meal.recipe?.name ?? mobileMenuMeal.meal.title ?? "Repas"}
                </p>
              </div>
              <div className="flex flex-col">
                {mobileMenuMeal.meal.recipe?.slug && (
                  <button
                    type="button"
                    onClick={() => { setPreviewSlug(mobileMenuMeal.meal.recipe!.slug); setMobileMenuMeal(null) }}
                    className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-secondary transition-colors"
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Voir la recette
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { void deleteMeal(mobileMenuMeal.meal.id); setMobileMenuMeal(null) }}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer du planning
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuMeal(null)}
                  className="flex items-center justify-center px-4 py-3 text-sm text-muted-foreground border-t border-border/40 hover:bg-secondary transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
