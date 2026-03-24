import { useStats, type StatsPeriod } from "../hooks/useStats.ts"
import { TrendingUp, Calendar, RefreshCw, Zap } from "lucide-react"
import { cn } from "../../lib/utils.ts"

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "12m", label: "12 mois" },
]

// ─── Composants utilitaires ───────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5 hover:shadow-warm transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.10em] text-muted-foreground/50">{label}</p>
          <p className="mt-1.5 font-heading text-4xl font-bold tabular-nums tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-xl)]", accent)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
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
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">
          {leftLabel} <span className="font-normal text-muted-foreground">({leftCount})</span>
        </span>
        <span className="font-semibold">
          {rightLabel} <span className="font-normal text-muted-foreground">({rightCount})</span>
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="bg-primary transition-all duration-700 ease-out"
          style={{ width: `${leftPct}%` }}
          title={`${leftLabel} : ${leftPct}%`}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span className="font-medium">{leftPct}%</span>
        <span className="font-medium">{rightPct}%</span>
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
      <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">
        <h3 className="mb-3 text-sm font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">Pas encore de données sur cette période.</p>
      </div>
    )
  }
  return (
    <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">
      <h3 className="mb-4 text-sm font-bold">{title}</h3>
      <ol className="space-y-3">
        {items.map((item, i) => {
          const pct = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0
          return (
            <li key={item.label} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  i === 0
                    ? "bg-primary text-primary-foreground"
                    : i === 1
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="truncate text-sm font-semibold">{item.label}</span>
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                    {item.count}x
                  </span>
                </div>
                {item.sub && (
                  <p className="truncate text-xs text-muted-foreground mb-1">{item.sub}</p>
                )}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/80">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
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
      <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">
        <h3 className="mb-3 text-sm font-bold">Distribution par catégorie</h3>
        <p className="text-sm text-muted-foreground">Pas encore de données sur cette période.</p>
      </div>
    )
  }
  return (
    <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">
      <h3 className="mb-4 text-sm font-bold">Distribution par catégorie</h3>
      <ul className="space-y-3">
        {stats.map((cat) => (
          <li key={cat.name}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="truncate font-semibold">{cat.name}</span>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground font-medium">
                {cat.count} — {cat.percentage}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
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
      <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">
        <h3 className="mb-1 text-sm font-bold">Recettes jamais planifiées</h3>
        <p className="text-sm text-muted-foreground">
          Toutes les recettes du catalogue ont été planifiées sur cette période.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">
      <h3 className="mb-1 text-sm font-bold">Recettes jamais planifiées</h3>
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

// ─── Page principale ──────────────────────────────────────────────────────────

export function StatsPage() {
  const { period, setPeriod, stats, loading, error } = useStats()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Statistiques</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Analyse de vos habitudes culinaires</p>
        </div>

        {/* Sélecteur de période */}
        <div className="flex gap-1 rounded-[var(--radius-xl)] border border-border/50 bg-secondary/50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-semibold transition-all",
                period === p.value
                  ? "bg-card text-foreground shadow-subtle"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Skeleton chargement */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-[var(--radius-2xl)] border border-border/40 bg-muted" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-[var(--radius-2xl)] border border-border/40 bg-muted" />
            ))}
          </div>
        </div>
      )}

      {/* Contenu */}
      {!loading && stats && (
        <div className="space-y-6">
          {/* État vide global */}
          {stats.totalMeals === 0 && (
            <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <Calendar className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-lg font-heading font-bold">Aucun repas planifié sur cette période</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Commencez à remplir votre planning pour voir apparaître des statistiques.
              </p>
            </div>
          )}

          {stats.totalMeals > 0 && (
            <>
              {/* Chiffres clés — dashboard cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="Repas planifiés"
                  value={stats.totalMeals}
                  icon={Calendar}
                  accent="bg-primary/10 text-primary"
                />
                <StatCard
                  label="Moy. / semaine"
                  value={stats.avgMealsPerWeek}
                  sub="repas par semaine"
                  icon={TrendingUp}
                  accent="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                />
                <StatCard
                  label="% restes"
                  value={`${stats.leftoverPercentage}%`}
                  sub="même plat consécutif"
                  icon={RefreshCw}
                  accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                />
                <StatCard
                  label="Streak"
                  value={stats.streak}
                  sub={stats.streak === 1 ? "semaine complète" : "semaines complètes"}
                  icon={Zap}
                  accent="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                />
              </div>

              {/* Répartition déjeuner / dîner */}
              {(stats.lunchCount > 0 || stats.dinnerCount > 0) && (
                <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">
                  <h3 className="mb-4 text-sm font-bold">Répartition déjeuner / dîner</h3>
                  <ProportionBar
                    leftLabel="Déjeuner"
                    rightLabel="Dîner"
                    leftRatio={stats.lunchRatio}
                    leftCount={stats.lunchCount}
                    rightCount={stats.dinnerCount}
                  />
                </div>
              )}

              {/* Top recettes + ingrédients */}
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

              {/* Distribution par catégorie */}
              <CategoryBars stats={stats.categoryStats} />

              {/* Recettes jamais planifiées */}
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
