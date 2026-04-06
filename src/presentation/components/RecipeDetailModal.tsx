import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.tsx"
import { useRecipe } from "../hooks/useRecipe.ts"
import { Loader2, UtensilsCrossed, CalendarPlus } from "lucide-react"
import { RecipeIngredientsList } from "./RecipeIngredientsList.tsx"
import { RecipeInstructionsList } from "./RecipeInstructionsList.tsx"
import { PlanningSlotPicker } from "./PlanningSlotPicker.tsx"
import { formatDuration } from "../../shared/utils/duration.ts"
import { recipeImageUrl } from "../../shared/utils/image.ts"
import { Button } from "./ui/button.tsx"
import { CookingMode } from "./CookingMode.tsx"
import { addMealUseCase, deleteMealUseCase } from "../../infrastructure/container.ts"
import type { MealieIngredient, MealieInstruction } from "../../shared/types/mealie.ts"

interface RecipeDetailModalProps {
  slug: string | null
  onOpenChange: (open: boolean) => void
}

interface CookingSnapshot {
  name: string
  ingredients: MealieIngredient[]
  instructions: MealieInstruction[]
}

export function RecipeDetailModal({ slug, onOpenChange }: RecipeDetailModalProps) {
  const { recipe, loading, error } = useRecipe(slug ?? undefined)
  const [cookingSnapshot, setCookingSnapshot] = useState<CookingSnapshot | null>(null)
  const [planningPickerOpen, setPlanningPickerOpen] = useState(false)

  const handleSlotSelect = async (date: string, entryType: string, existingMealId?: number) => {
    if (!recipe) return
    if (existingMealId !== undefined) {
      await deleteMealUseCase.execute(existingMealId)
    }
    await addMealUseCase.execute(date, entryType, recipe.id)
    setPlanningPickerOpen(false)
  }

  const handleStartCooking = () => {
    if (!recipe) return
    setCookingSnapshot({
      name: recipe.name,
      ingredients: recipe.recipeIngredient ?? [],
      instructions: recipe.recipeInstructions ?? [],
    })
    onOpenChange(false)
  }

  return (
    <>
      {cookingSnapshot && (
        <CookingMode
          recipeName={cookingSnapshot.name}
          ingredients={cookingSnapshot.ingredients}
          instructions={cookingSnapshot.instructions}
          onClose={() => setCookingSnapshot(null)}
        />
      )}

      <PlanningSlotPicker
        open={planningPickerOpen}
        onOpenChange={setPlanningPickerOpen}
        recipeName={recipe?.name ?? ""}
        onSelect={handleSlotSelect}
      />

      <Dialog open={!!slug} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="truncate">{recipe?.name ?? " "}</DialogTitle>
              {recipe && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPlanningPickerOpen(true)}
                    className="shrink-0 gap-1.5"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Planifier</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartCooking}
                    className="shrink-0 gap-1.5"
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mode cuisine</span>
                  </Button>
                </div>
              )}
            </div>
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
                src={recipeImageUrl(recipe, "original")}
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

                {(recipe.prepTime || recipe.performTime || recipe.totalTime) && (
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {recipe.prepTime && <span>Préparation : {formatDuration(recipe.prepTime)}</span>}
                    {recipe.performTime && <span>Cuisson : {formatDuration(recipe.performTime)}</span>}
                    {recipe.totalTime && <span>Total : {formatDuration(recipe.totalTime)}</span>}
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
    </>
  )
}
