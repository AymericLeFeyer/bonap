import { useState } from "react"
import { Link } from "react-router-dom"
import { Loader2, Users } from "lucide-react"
import { cn } from "../../lib/utils.ts"
import { useGuestHistory } from "../hooks/useGuestHistory.ts"
import { formatGuestDate, guestKey } from "../../shared/utils/guests.ts"

const ENTRY_LABELS: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
}

export function GuestsPage() {
  const { history, loading, error } = useGuestHistory()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selected =
    history.find((g) => guestKey(g.name) === selectedKey) ?? history[0] ?? null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Invités</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Les personnes reçues et les plats qui leur ont été servis. Les invités se saisissent
          dans la note d'un repas du planning.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : history.length === 0 ? (
        <div className="rounded-[var(--radius-2xl)] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 h-6 w-6" />
          Aucun invité pour l'instant. Ouvrez la note d'un repas dans le planning pour en ajouter.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <ul className="flex flex-row flex-wrap gap-1.5 md:flex-col">
            {history.map((guest) => {
              const key = guestKey(guest.name)
              const active = selected && guestKey(selected.name) === key
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm transition-colors",
                      active ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                    )}
                  >
                    <span className="font-medium">{guest.name}</span>
                    <span className={cn("text-xs tabular-nums", active ? "opacity-80" : "text-muted-foreground")}>
                      {guest.meals.length}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {selected && (
            <section className="space-y-3">
              <h2 className="font-heading text-lg font-bold">Plats servis à {selected.name}</h2>
              <ul className="divide-y divide-border/50 rounded-[var(--radius-xl)] border border-border/50 bg-card">
                {selected.meals.map((meal) => (
                  <li key={meal.mealId} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                    {meal.recipeSlug ? (
                      <Link to={`/recipes/${meal.recipeSlug}`} className="font-medium hover:underline">
                        {meal.recipeName}
                      </Link>
                    ) : (
                      <span className="font-medium">{meal.recipeName}</span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatGuestDate(meal.date)}
                      {ENTRY_LABELS[meal.entryType] ? ` · ${ENTRY_LABELS[meal.entryType]}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
