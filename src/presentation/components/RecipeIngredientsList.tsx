import type { MealieIngredient } from "../../shared/types/mealie.ts"

interface RecipeIngredientsListProps {
  ingredients: MealieIngredient[]
  /** Heading size class — defaults to "text-lg" */
  headingSize?: "text-lg" | "text-base"
}

export function RecipeIngredientsList({
  ingredients,
  headingSize = "text-lg",
}: RecipeIngredientsListProps) {
  if (ingredients.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className={`${headingSize} font-semibold`}>Ingrédients</h2>
      <ul className="space-y-1.5">
        {ingredients.map((ing, i) => (
          <li key={i} className="text-sm">
            {ing.quantity != null && (
              <span className="font-medium">{ing.quantity}</span>
            )}{" "}
            {ing.unit?.name && <span>{ing.unit.name}</span>}{" "}
            {ing.food?.name && <span>{ing.food.name}</span>}
            {ing.note && (
              <span className="text-muted-foreground"> ({ing.note})</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
