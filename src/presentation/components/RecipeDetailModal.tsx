import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.tsx"
import { useRecipe } from "../hooks/useRecipe.ts"
import { Loader2 } from "lucide-react"
import { RecipeIngredientsList } from "./RecipeIngredientsList.tsx"
import { RecipeInstructionsList } from "./RecipeInstructionsList.tsx"

interface RecipeDetailModalProps {
  slug: string | null
  onOpenChange: (open: boolean) => void
}

export function RecipeDetailModal({ slug, onOpenChange }: RecipeDetailModalProps) {
  const { recipe, loading, error } = useRecipe(slug ?? undefined)

  return (
    <Dialog open={!!slug} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recipe?.name ?? " "}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {recipe && (
            <article className="space-y-6 p-1">
              <img
                src={`/api/media/recipes/${recipe.id}/images/original.webp`}
                alt={recipe.name}
                className="aspect-video w-full rounded-lg object-cover"
              />

              <div className="space-y-3">
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

                {(recipe.prepTime || recipe.cookTime) && (
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {recipe.prepTime && <span>Préparation : {recipe.prepTime}</span>}
                    {recipe.cookTime && <span>Cuisson : {recipe.cookTime}</span>}
                  </div>
                )}
              </div>

              <RecipeIngredientsList
                ingredients={recipe.recipeIngredient ?? []}
                headingSize="text-base"
              />

              <RecipeInstructionsList
                instructions={recipe.recipeInstructions ?? []}
                headingSize="text-base"
              />
            </article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
