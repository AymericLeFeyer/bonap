import { Link } from "react-router-dom"
import type { NutritionEstimate } from "../../../domain/nutrition/entities/NutritionFood.ts"
import { NutritionCoverageBadge } from "./NutritionBadges.tsx"
import { LINE_REASON_LABELS } from "./nutritionLabels.ts"

/** Détail d'un calcul : ingrédients pris en compte, exclus, et lien vers les correspondances. */
export function NutritionEstimateDetail({ estimate, slug }: { estimate: NutritionEstimate; slug: string }) {
  const included = estimate.lines.filter((line) => line.included)
  const excluded = estimate.lines.filter((line) => !line.included && !line.negligible)

  return (
    <div className="space-y-2 rounded-[var(--radius-lg)] border border-border/50 bg-background/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-foreground">Détail de l'estimation</p>
          <NutritionCoverageBadge coverage={estimate.coverage} />
        </div>
        <Link to={`/recipes/${slug}/nutrition`} className="text-[11px] font-medium underline">
          Corriger les correspondances
        </Link>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Ingrédients pris en compte ({included.length})</p>
        {included.map((line, index) => (
          <div key={`${line.key}-${index}`} className="rounded-md border border-border/50 bg-secondary/20 px-2 py-1.5 text-xs">
            <span className="font-medium text-foreground">{line.ingredient}</span>
            <span className="text-muted-foreground">{" → "}{line.ciqualName} ({line.grams} g){line.source === "off" ? " · Open Food Facts" : ""}</span>
          </div>
        ))}
      </div>

      {excluded.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Ingrédients non pris en compte ({excluded.length})</p>
          {excluded.map((line, index) => (
            <div key={`${line.key}-${index}`} className="rounded-md border border-dashed border-border/60 bg-secondary/10 px-2 py-1.5 text-xs">
              <span className="font-medium text-foreground">{line.ingredient}</span>
              {line.reason && <span className="text-muted-foreground"> — {LINE_REASON_LABELS[line.reason]}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
