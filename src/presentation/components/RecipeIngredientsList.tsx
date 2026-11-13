import type { ReactNode } from "react"
import type { MealieIngredient } from "../../shared/types/mealie.ts"
import { formatQuantity } from "../../shared/utils/servings.ts"

interface RecipeIngredientsListProps {
  ingredients: MealieIngredient[]
  /** Heading size class — defaults to "text-lg" */
  headingSize?: "text-lg" | "text-base"
  /** Multiplicateur appliqué aux quantités (portions choisies / portions de base). */
  servingsRatio?: number
  /** Contenu affiché à droite du titre (ex. sélecteur de portions). */
  headerAction?: ReactNode
}

export function RecipeIngredientsList({
  ingredients,
  headingSize = "text-lg",
  servingsRatio = 1,
  headerAction,
}: RecipeIngredientsListProps) {
  if (ingredients.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`font-heading ${headingSize} font-bold tracking-tight`}>Ingrédients</h2>
        {headerAction}
      </div>
      <ul className="space-y-1.5">
        {ingredients.map((ing, i) => (
          <li key={i} className="flex items-baseline gap-1 text-sm">
            {ing.quantity != null && ing.quantity !== 0 && (
              <span className="font-semibold tabular-nums text-foreground">
                {formatQuantity(ing.quantity * servingsRatio)}
              </span>
            )}
            {ing.unit?.name && <span className="text-muted-foreground text-xs">{ing.unit.name}</span>}
            {ing.food?.name && <span className="font-medium">{ing.food.name}</span>}
            {ing.note && (
              <span className="text-muted-foreground text-xs"> — {ing.note}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
