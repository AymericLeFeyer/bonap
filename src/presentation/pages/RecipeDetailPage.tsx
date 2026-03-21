import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useRecipe } from "../hooks/useRecipe.ts"
import { useUpdateSeasons } from "../hooks/useUpdateSeasons.ts"
import { Button } from "../components/ui/button.tsx"
import { Badge } from "../components/ui/badge.tsx"
import { RecipeFormDialog } from "../components/RecipeFormDialog.tsx"
import { SeasonBadge } from "../components/SeasonBadge.tsx"
import { RecipeIngredientsList } from "../components/RecipeIngredientsList.tsx"
import { RecipeInstructionsList } from "../components/RecipeInstructionsList.tsx"
import { Pencil } from "lucide-react"
import type { MealieRecipe, Season } from "../../shared/types/mealie.ts"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags } from "../../shared/utils/season.ts"

function RecipeDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="aspect-video w-full rounded-lg bg-muted" />
      <div className="space-y-3">
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
        </div>
        <div className="flex gap-4">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-5 w-32 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-4/6 rounded bg-muted" />
      </div>
    </div>
  )
}

export function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { recipe, loading, error, setRecipe } = useRecipe(slug)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const { updateSeasons, loading: seasonsLoading } = useUpdateSeasons()

  const handleEditSuccess = (updated: MealieRecipe) => {
    setRecipe(updated)
  }

  const handleToggleSeason = async (season: Season) => {
    if (!recipe) return
    const currentSeasons = getRecipeSeasonsFromTags(recipe.tags)
    const newSeasons = currentSeasons.includes(season)
      ? currentSeasons.filter((s) => s !== season)
      : [...currentSeasons, season]
    const updated = await updateSeasons(recipe.slug, newSeasons)
    if (updated) setRecipe(updated)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/recipes">&larr; Recettes</Link>
        </Button>
        {recipe && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        )}
      </div>

      {loading && <RecipeDetailSkeleton />}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {recipe && (
        <RecipeFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          recipe={recipe}
          onSuccess={handleEditSuccess}
        />
      )}

      {recipe && (
        <article className="space-y-6">
          <img
            src={`/api/media/recipes/${recipe.id}/images/original.webp`}
            alt={recipe.name}
            className="aspect-video w-full rounded-lg object-cover"
          />

          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{recipe.name}</h1>

            {recipe.recipeCategory && recipe.recipeCategory.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.recipeCategory.map((cat) => (
                  <span
                    key={cat.id}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}

            {/* Seasons — display + quick edit */}
            <div className="space-y-1.5">
              {getRecipeSeasonsFromTags(recipe.tags).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {getRecipeSeasonsFromTags(recipe.tags).map((season) => (
                    <SeasonBadge key={season} season={season} size="md" />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {SEASONS.map((season: Season) => {
                  const active = getRecipeSeasonsFromTags(recipe.tags).includes(season)
                  return (
                    <Badge
                      key={season}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer select-none transition-colors text-xs"
                      onClick={() => void handleToggleSeason(season)}
                    >
                      {seasonsLoading ? "…" : SEASON_LABELS[season]}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {(recipe.prepTime || recipe.cookTime) && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {recipe.prepTime && <span>Préparation : {recipe.prepTime}</span>}
                {recipe.cookTime && <span>Cuisson : {recipe.cookTime}</span>}
              </div>
            )}
          </div>

          <RecipeIngredientsList
            ingredients={recipe.recipeIngredient ?? []}
          />

          <RecipeInstructionsList
            instructions={recipe.recipeInstructions ?? []}
          />
        </article>
      )}
    </div>
  )
}
