import { useState } from "react"
import { Link } from "react-router-dom"
import { SeasonBadge } from "./SeasonBadge.tsx"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags } from "../../shared/utils/season.ts"
import { cn } from "../../lib/utils.ts"
import { recipeImageUrl } from "../../shared/utils/image.ts"
import { getRecipeEmoji } from "../../shared/utils/recipeEmoji.ts"

interface RecipeCardProps {
  recipe: MealieRecipe
  onSelect?: (slug: string) => void
  selected?: boolean
}

export function RecipeCard({ recipe, onSelect, selected }: RecipeCardProps) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = recipeImageUrl(recipe, "min-original")
  const emoji = getRecipeEmoji(recipe)
  const seasons = getRecipeSeasonsFromTags(recipe.tags)
  const categories = recipe.recipeCategory ?? []

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group block"
      onClick={onSelect ? (e) => { e.preventDefault(); onSelect(recipe.slug) } : undefined}
    >
      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-xl)] border bg-card",
          "transition-all duration-200",
          selected
            ? "border-primary ring-2 ring-primary/25 shadow-warm-md"
            : "border-border/50 shadow-subtle hover:shadow-warm-md hover:-translate-y-0.5 hover:border-primary/20",
        )}
      >
        {/* Image carrée */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {!imgError ? (
            <img
              src={imageUrl}
              alt={recipe.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {emoji && <span className="text-4xl">{emoji}</span>}
            </div>
          )}

          {/* Dégradé bas — toujours visible, plus sophistiqué */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

          {/* Badges saison — top left */}
          {seasons.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {seasons.map((season) => (
                <SeasonBadge key={season} season={season} size="sm" />
              ))}
            </div>
          )}

          {/* Badges catégories — bottom left, sur le dégradé */}
          {categories.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1">
              {categories.slice(0, 2).map((cat) => (
                <span
                  key={cat.id}
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    "text-[9.5px] font-semibold text-white/90 uppercase tracking-[0.04em]",
                    "bg-black/35 backdrop-blur-sm",
                  )}
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Nom */}
        <div className="px-3 pb-3 pt-2.5">
          <h3
            className={cn(
              "line-clamp-2 text-[12.5px] font-semibold leading-snug",
              "text-card-foreground transition-colors duration-150",
              "group-hover:text-primary",
            )}
          >
            {recipe.name}
          </h3>
        </div>
      </div>
    </Link>
  )
}
