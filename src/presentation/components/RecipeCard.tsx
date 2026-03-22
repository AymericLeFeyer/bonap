import { Link } from "react-router-dom"
import { Card } from "./ui/card.tsx"
import { SeasonBadge } from "./SeasonBadge.tsx"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags } from "../../shared/utils/season.ts"

interface RecipeCardProps {
  recipe: MealieRecipe
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const imageUrl = `/api/media/recipes/${recipe.id}/images/min-original.webp`
  const seasons = getRecipeSeasonsFromTags(recipe.tags)
  const hasMeta = seasons.length > 0 || (recipe.recipeCategory && recipe.recipeCategory.length > 0)

  return (
    <Link to={`/recipes/${recipe.slug}`} className="group block">
      <Card className="overflow-hidden border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 bg-card">
        {/* Image */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={recipe.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground group-hover:text-primary transition-colors duration-150">
            {recipe.name}
          </h3>

          {hasMeta && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {seasons.map((season) => (
                <SeasonBadge key={season} season={season} size="sm" />
              ))}
              {recipe.recipeCategory?.map((cat) => (
                <span
                  key={cat.id}
                  className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
