import { ChevronLeft, ChevronRight, CalendarDays, Loader2, AlertCircle } from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { usePlanning } from "../hooks/usePlanning.ts"
import type { MealieMealPlan } from "../../shared/types/mealie.ts"

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "side"] as const
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Petit-dej",
  lunch: "Dejeuner",
  dinner: "Diner",
  side: "Accomp.",
}

function formatDayDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const startStr = weekStart.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  })
  const endStr = weekEnd.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return `${startStr} - ${endStr}`
}

function MealCard({ meal }: { meal: MealieMealPlan }) {
  const name = meal.recipe?.name ?? meal.title ?? "Sans titre"
  const imageUrl = meal.recipe
    ? `/api/media/recipes/${meal.recipe.id}/images/min-original.webp`
    : null

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card p-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-10 w-10 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <span className="line-clamp-2 text-xs font-medium leading-tight">
        {name}
      </span>
    </div>
  )
}

function DayColumn({
  dayLabel,
  dayDate,
  meals,
}: {
  dayLabel: string
  dayDate: Date
  meals: MealieMealPlan[]
}) {
  const isToday =
    new Date().toDateString() === dayDate.toDateString()

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col gap-1 rounded-lg border p-2 ${
        isToday ? "border-primary/50 bg-primary/5" : "bg-background"
      }`}
    >
      <div className="mb-1 text-center">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          {dayLabel}
        </div>
        <div className="text-sm font-medium">{formatDayDate(dayDate)}</div>
      </div>

      <div className="flex flex-col gap-1">
        {MEAL_TYPE_ORDER.map((type) => {
          const typeMeals = meals.filter((m) => m.entryType === type)
          if (typeMeals.length === 0) return null
          return (
            <div key={type}>
              <div className="mb-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                {MEAL_TYPE_LABELS[type]}
              </div>
              {typeMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          )
        })}
        {meals.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            &ndash;
          </div>
        )}
      </div>
    </div>
  )
}

export function PlanningPage() {
  const {
    mealPlans,
    loading,
    error,
    currentWeekStart,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = usePlanning()

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  const mealsByDay = new Map<string, MealieMealPlan[]>()
  for (const day of days) {
    const key = day.toISOString().slice(0, 10)
    mealsByDay.set(
      key,
      mealPlans.filter((m) => m.date === key),
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Planning</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-center text-sm font-medium text-muted-foreground">
        {formatWeekRange(currentWeekStart)}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {days.map((date, i) => (
            <DayColumn
              key={date.toISOString()}
              dayLabel={DAY_LABELS[i]}
              dayDate={date}
              meals={mealsByDay.get(date.toISOString().slice(0, 10)) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
