import { Card, CardContent, CardHeader } from "./ui/card.tsx"
import type { MealieRecipe } from "../../shared/types/mealie.ts"

interface RecipeCardProps {
  recipe: MealieRecipe
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const imageUrl = `/api/media/recipes/${recipe.id}/images/min-original.webp`

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={recipe.name}
          className="h-full w-full object-cover"
        />
      </div>

      <CardHeader className="p-4 pb-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {recipe.name}
        </h3>
      </CardHeader>

      {recipe.recipeCategory && recipe.recipeCategory.length > 0 && (
        <CardContent className="px-4 pb-4 pt-0">
          <div className="flex flex-wrap gap-1">
            {recipe.recipeCategory.map((cat) => (
              <span
                key={cat.id}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {cat.name}
              </span>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
