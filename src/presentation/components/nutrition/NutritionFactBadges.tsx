import { NUTRITION_FACTS, type DisplayedNutrition } from "../../../shared/utils/nutritionDisplay.ts"
import { Badge } from "../ui/badge.tsx"
import { NutritionCoverageBadge } from "./NutritionBadges.tsx"

export function NutritionFactBadges({ nutrition, coverage = null }: { nutrition: DisplayedNutrition; coverage?: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {NUTRITION_FACTS.filter(({ field }) => nutrition[field] !== undefined).map(({ field, suffix }) => (
        <Badge key={field} variant="outline">
          {nutrition[field]}{suffix}
        </Badge>
      ))}
      {coverage !== null && <NutritionCoverageBadge coverage={coverage} />}
    </div>
  )
}
