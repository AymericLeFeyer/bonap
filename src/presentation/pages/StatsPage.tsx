import { useStats, type StatsPeriod } from "../hooks/useStats.ts"
import { cn } from "../../lib/utils.ts"

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "12m", label: "12 mois" },
]

// ─── Utility components ───────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function ProportionBar({
  leftLabel,
  rightLabel,
  leftRatio,
  leftCount,
  rightCount,
}: {
  leftLabel: string
  rightLabel: string
  leftRatio: number
  leftCount: number
  rightCount: number
}) {
  const leftPct = Math.round(leftRatio * 100)
  const rightPct = 100 - leftPct
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">
          {leftLabel} <span className="text-muted-foreground">({leftCount})</span>
        </span>
        <span className="font-medium">
          {rightLabel} <span className="text-muted-foreground">({rightCount})</span>
        </span>
      </div>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary transition-all duration-500"
          style={{ width: `${leftPct}%` }}
          title={`${leftLabel} : ${leftPct}%`}
        />
        <div
          className="bg-muted transition-all duration-500"
          style={{ width: `${rightPct}%` }}
          title={`${rightLabel} : ${rightPct}%`}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{leftPct}%</span>
        <span>{rightPct}%</span>
      </div>
    </div>
  )
}

function RankedList({
  title,
  items,
  maxCount,
}: {
  title: string
  items: { label: string; count: number; sub?: string }[]
  maxCount: number
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">Pas encore de données sur cette période.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ol className="space-y-2">
        {items.map((item, i) => {
          const pct = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0
          return (
            <li key={item.label} className="flex items-center gap-3">
              <span className="w-5 shrink-0 text-right text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="truncate text-sm font-medium">{item.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.count}x
                  </span>
                </div>
                {item.sub && (
                  <p className="truncate text-xs text-muted-foreground">{item.sub}</p>
                )}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function CategoryBars({
  stats,
}: {
  stats: { name: string; count: number; percentage: number }[]
}) {
  if (stats.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Distribution par catégorie</h3>
        <p className="text-sm text-muted-foreground">Pas encore de données sur cette période.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Distribution par catégorie</h3>
      <ul className="space-y-2.5">
        {stats.map((cat) => (
          <li key={cat.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="truncate font-medium">{cat.name}</span>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                {cat.count} — {cat.percentage}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${cat.percentage}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function NeverPlannedList({
  recipes,
}: {
  recipes: { slug: string; name: string }[]
}) {
  if (recipes.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold">Recettes jamais planifiées</h3>
        <p className="text-sm text-muted-foreground">
          Toutes les recettes du catalogue ont été planifiées sur cette période.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold">Recettes jamais planifiées</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        {recipes.length} recette{recipes.length > 1 ? "s" : ""} du catalogue absente
        {recipes.length > 1 ? "s" : ""} du planning
        {recipes.length === 50 ? " (50 premières affichées)" : ""}
      </p>
      <ul className="columns-1 sm:columns-2 gap-x-4 space-y-1">
        {recipes.map((r) => (
          <li key={r.slug} className="break-inside-avoid text-sm text-muted-foreground truncate">
            {r.name}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function StatsPage() {
  const { period, setPeriod, stats, loading, error } = useStats()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-sm text-muted-foreground">Analyse de vos habitudes culinaires</p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 rounded-lg border bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                period === p.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && stats && (
        <div className="space-y-6">
          {/* Global empty state */}
          {stats.totalMeals === 0 && (
            <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
              <p className="text-lg font-semibold">Aucun repas planifié sur cette période</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Commencez à remplir votre planning pour voir apparaître des statistiques.
              </p>
            </div>
          )}

          {stats.totalMeals > 0 && (
            <>
              {/* Key figures */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="Repas planifiés"
                  value={stats.totalMeals}
                />
                <StatCard
                  label="Moy. / semaine"
                  value={stats.avgMealsPerWeek}
                  sub="repas par semaine"
                />
                <StatCard
                  label="% restes"
                  value={`${stats.leftoverPercentage}%`}
                  sub="même plat consécutif"
                />
                <StatCard
                  label="Streak"
                  value={stats.streak}
                  sub={stats.streak === 1 ? "semaine complète" : "semaines complètes"}
                />
              </div>

              {/* Lunch / dinner breakdown */}
              {(stats.lunchCount > 0 || stats.dinnerCount > 0) && (
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold">Répartition déjeuner / dîner</h3>
                  <ProportionBar
                    leftLabel="Déjeuner"
                    rightLabel="Dîner"
                    leftRatio={stats.lunchRatio}
                    leftCount={stats.lunchCount}
                    rightCount={stats.dinnerCount}
                  />
                </div>
              )}

              {/* Top recipes + top ingredients */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <RankedList
                  title="Top recettes cuisinées"
                  items={stats.topRecipes.map((tr) => ({
                    label: tr.recipe.name,
                    count: tr.count,
                    sub: tr.recipe.recipeCategory?.map((c) => c.name).join(", "),
                  }))}
                  maxCount={stats.topRecipes[0]?.count ?? 1}
                />
                <RankedList
                  title="Top ingrédients consommés"
                  items={stats.topIngredients.map((ti) => ({
                    label: ti.name,
                    count: ti.count,
                  }))}
                  maxCount={stats.topIngredients[0]?.count ?? 1}
                />
              </div>

              {/* Category distribution */}
              <CategoryBars stats={stats.categoryStats} />

              {/* Never-planned recipes */}
              <NeverPlannedList
                recipes={stats.neverPlannedRecipes.map((r) => ({
                  slug: r.slug,
                  name: r.name,
                }))}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
