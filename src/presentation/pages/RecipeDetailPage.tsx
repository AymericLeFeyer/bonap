import { Link, useParams } from "react-router-dom"
import { useRecipe } from "../hooks/useRecipe.ts"
import { Button } from "../components/ui/button.tsx"

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
  const { recipe, loading, error } = useRecipe(slug)

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/recipes">&larr; Recettes</Link>
      </Button>

      {loading && <RecipeDetailSkeleton />}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
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

            {(recipe.prepTime || recipe.cookTime) && (
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {recipe.prepTime && <span>Préparation : {recipe.prepTime}</span>}
                {recipe.cookTime && <span>Cuisson : {recipe.cookTime}</span>}
              </div>
            )}
          </div>

          {recipe.recipeIngredient && recipe.recipeIngredient.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Ingrédients</h2>
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
              <h2 className="text-lg font-semibold">Instructions</h2>
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
  )
}
