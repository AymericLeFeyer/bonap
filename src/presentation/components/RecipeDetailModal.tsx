import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.tsx"
import { useRecipe } from "../hooks/useRecipe.ts"
import { Loader2 } from "lucide-react"

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

              {recipe.recipeIngredient && recipe.recipeIngredient.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-base font-semibold">Ingrédients</h2>
                  <ul className="space-y-1.5">
                    {recipe.recipeIngredient.map((ing, i) => (
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
              )}

              {recipe.recipeInstructions && recipe.recipeInstructions.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-base font-semibold">Instructions</h2>
                  <ol className="space-y-4">
                    {recipe.recipeInstructions.map((step, i) => (
                      <li key={step.id} className="space-y-1">
                        <p className="text-sm font-medium">
                          Étape {i + 1}
                          {step.title && ` — ${step.title}`}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.text}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
