import type {
  NutritionFoodOrigin,
  NutritionFoodStatus,
} from "../../../domain/nutrition/entities/NutritionFood.ts"
import { coverageLevel, type CoverageLevel } from "../../../shared/utils/nutritionCoverage.ts"
import { cn } from "../../../lib/utils.ts"

const BADGE_BASE = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"

const STATUS_STYLES: Record<NutritionFoodStatus, { label: string; className: string }> = {
  validated: {
    label: "Validée",
    className: "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  auto: {
    label: "Automatique",
    className: "border-sky-300/60 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  },
  proposed: {
    label: "Proposée",
    className: "border-violet-300/60 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  },
  "to-review": {
    label: "À vérifier",
    className: "border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  },
  negligible: {
    label: "Négligeable",
    className: "border-border bg-secondary/60 text-muted-foreground",
  },
}

const PROPOSED_LABELS: Record<NutritionFoodOrigin, string> = {
  ai: "Proposée par l'IA",
  legacy: "Reprise de l'ancien calcul",
  user: "Choisie, à valider",
  auto: "Proposée",
}

const COVERAGE_STYLES: Record<CoverageLevel, { label: string; className: string }> = {
  reliable: { label: "Fiable", className: STATUS_STYLES.validated.className },
  partial: { label: "Estimation partielle", className: STATUS_STYLES["to-review"].className },
  unreliable: {
    label: "Non fiable",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
}

export function NutritionStatusBadge({ status, origin }: { status: NutritionFoodStatus; origin?: NutritionFoodOrigin }) {
  const style = STATUS_STYLES[status]
  const label = status === "proposed" && origin ? PROPOSED_LABELS[origin] : style.label
  return <span className={cn(BADGE_BASE, style.className)}>{label}</span>
}

export function NutritionCoverageBadge({ coverage, className }: { coverage: number; className?: string }) {
  const style = COVERAGE_STYLES[coverageLevel(coverage)]
  return (
    <span className={cn(BADGE_BASE, style.className, className)} title="Part du poids de la recette réellement estimée">
      {style.label} · {Math.round(coverage * 100)} %
    </span>
  )
}
