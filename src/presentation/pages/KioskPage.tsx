import { useState, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { Loader2, RefreshCw } from "lucide-react"
import type { MealieMealPlan } from "../../shared/types/mealie.ts"
import { getWeekPlanningUseCase } from "../../infrastructure/container.ts"
import { formatDate } from "../../shared/utils/date.ts"
import { cn } from "../../lib/utils.ts"
import { RecipeImage } from "../components/RecipeImage.tsx"
import { usePlanningPreferences } from "../hooks/usePlanningPreferences.ts"
import { getMealVisibleNote } from "../components/planning/planningUtils.ts"
import { RecipeDetailModal } from "../components/RecipeDetailModal.tsx"

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDayLabel(date: Date): string {
  const t = today()
  const diff = Math.round((date.getTime() - t.getTime()) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return "Demain"
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

const ALL_MEAL_TYPES = [
  { key: "breakfast", label: "Petit-déjeuner", hour: 8 },
  { key: "lunch", label: "Déjeuner", hour: 12 },
  { key: "dinner", label: "Dîner", hour: 19 },
] as const

function getNextMealKey(now: Date, daysAhead: number, mealTypes: ReadonlyArray<{ key: string; hour: number }>): { dateStr: string; type: string } | null {
  const t = today()
  const hour = now.getHours()
  for (let d = 0; d < daysAhead; d++) {
    const day = addDays(t, d)
    const dateStr = formatDate(day)
    for (const mt of mealTypes) {
      if (d > 0 || hour < mt.hour) return { dateStr, type: mt.key }
    }
  }
  return null
}

interface DayGroup {
  date: Date
  dateStr: string
  meals: Record<string, MealieMealPlan | undefined>
}

export function KioskPage() {
  const location = useLocation()
  const fromApp = (location.state as { fromApp?: boolean } | null)?.fromApp === true

  const { showBreakfast, kioskDays } = usePlanningPreferences()
  const mealTypes = ALL_MEAL_TYPES.filter((mt) => mt.key !== "breakfast" || showBreakfast)

  const [mealPlans, setMealPlans] = useState<MealieMealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [toastVisible, setToastVisible] = useState(fromApp)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const fetchMeals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const start = formatDate(today())
      const end = formatDate(addDays(today(), kioskDays - 1))
      const data = await getWeekPlanningUseCase.execute(start, end)
      setMealPlans(data)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [kioskDays])

  useEffect(() => { void fetchMeals() }, [fetchMeals])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => void fetchMeals(true), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchMeals])

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!toastVisible) return
    const timer = setTimeout(() => setToastVisible(false), 6000)
    return () => clearTimeout(timer)
  }, [toastVisible])

  const nextMeal = getNextMealKey(now, kioskDays, mealTypes)

  const days: DayGroup[] = Array.from({ length: kioskDays }, (_, i) => {
    const date = addDays(today(), i)
    const dateStr = formatDate(date)
    const meals: Record<string, MealieMealPlan | undefined> = {}
    for (const mt of mealTypes) {
      meals[mt.key] = mealPlans.find((m) => m.date === dateStr && m.entryType === mt.key)
    }
    return { date, dateStr, meals }
  })

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col select-none overflow-hidden">
      {/* Toast "mode kiosk" */}
      {toastVisible && (
        <div className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "bg-foreground text-background rounded-xl px-5 py-3 shadow-xl",
          "text-sm font-medium text-center max-w-sm",
          "transition-opacity duration-500",
        )}>
          Mode kiosk activé — modifiez l'URL ou revenez en arrière pour quitter
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <p className="text-3xl font-bold tabular-nums">{formatTime(now)}</p>
          <p className="text-sm text-muted-foreground capitalize">{formatFullDate(now)}</p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Mis à jour à {formatTime(lastRefresh)}
            </span>
          )}
          <button
            type="button"
            onClick={() => void fetchMeals(true)}
            className={cn(
              "p-2 rounded-full hover:bg-secondary transition-colors",
              refreshing && "animate-spin",
            )}
            title="Rafraîchir"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Days grid */}
      <div className="flex-1 overflow-x-auto">
        <div
          className="flex h-full gap-3 p-4"
          style={{ minWidth: `${kioskDays * 220}px` }}
        >
          {days.map(({ date, dateStr, meals }, dayIdx) => {
            const isToday = dayIdx === 0
            return (
              <div
                key={dateStr}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl p-4 min-w-0 flex-1",
                  isToday
                    ? "bg-primary/8 border-2 border-primary/30"
                    : "bg-card border border-border",
                )}
              >
                <div className={cn(
                  "text-center font-bold text-sm uppercase tracking-wider",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}>
                  {formatDayLabel(date)}
                </div>

                {mealTypes.map((mt) => {
                  const meal = meals[mt.key]
                  const isNext = nextMeal?.dateStr === dateStr && nextMeal?.type === mt.key
                  return (
                    <MealSlot
                      key={mt.key}
                      label={mt.label}
                      meal={meal}
                      isNext={isNext}
                      onSelect={(slug) => setSelectedSlug(slug)}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recipe detail modal (read-only + mode cuisine) */}
      <RecipeDetailModal
        slug={selectedSlug}
        onOpenChange={(open) => { if (!open) setSelectedSlug(null) }}
      />
    </div>
  )
}

interface MealSlotProps {
  label: string
  meal: MealieMealPlan | undefined
  isNext: boolean
  onSelect: (slug: string) => void
}

function MealSlot({ label, meal, isNext, onSelect }: MealSlotProps) {
  return (
    <div
      className={cn(
        "flex-1 rounded-xl overflow-hidden flex flex-col min-h-[100px]",
        isNext
          ? "ring-2 ring-primary shadow-md"
          : "bg-secondary/40 border border-border/50",
      )}
    >
      <div className={cn(
        "px-3 py-1.5 text-xs font-semibold shrink-0",
        isNext
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground",
      )}>
        {label}
        {isNext && <span className="ml-2 text-[10px] opacity-80">→ prochain repas</span>}
      </div>

      {meal?.recipe ? (
        <button
          type="button"
          className="flex-1 flex flex-col text-left hover:brightness-95 transition-[filter] cursor-pointer w-full"
          onClick={() => meal.recipe?.slug && onSelect(meal.recipe.slug)}
        >
          <RecipeCard meal={meal} />
        </button>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/50 italic p-2">
          Rien de prévu
        </div>
      )}
    </div>
  )
}

function RecipeCard({ meal }: { meal: MealieMealPlan }) {
  const recipe = meal.recipe!
  const note = getMealVisibleNote(meal)

  return (
    <div className="flex-1 flex flex-col">
      {/* Image */}
      <div className="relative w-full aspect-video bg-secondary overflow-hidden">
        <RecipeImage
          recipe={recipe}
          alt={recipe.name}
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full text-4xl"
        />
      </div>

      {/* Infos */}
      <div className="px-3 py-2 space-y-0.5">
        <p className="text-sm font-semibold leading-snug line-clamp-2">{recipe.name}</p>
        {note && (
          <p className="text-xs text-muted-foreground line-clamp-2">{note}</p>
        )}
      </div>
    </div>
  )
}
