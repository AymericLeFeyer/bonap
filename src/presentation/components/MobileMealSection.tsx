import { Plus, Eye, Trash2 } from "lucide-react"
import type { MealieMealPlan } from "../../shared/types/mealie.ts"
import { cn } from "../../lib/utils.ts"
import { recipeImageUrl } from "../../shared/utils/image.ts"


interface MobileMealSectionProps {
  meals: MealieMealPlan[]
  onAdd: () => void
  onMealTouchStart: (meal: MealieMealPlan, e: React.TouchEvent) => void
  onView: (slug: string) => void
  onDelete: (id: number) => void
}


export function MobileMealSection({
  meals,
  onAdd,
  onMealTouchStart,
  onView,
  onDelete,
}: MobileMealSectionProps) {
  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      {meals.map((meal) => {
        return (
          <div
            key={meal.id}
            onTouchStart={(e) => onMealTouchStart(meal, e)}
            className={cn(
              "rounded-[var(--radius-lg)]",
              "bg-card border border-border/40 shadow-subtle overflow-hidden",
              "touch-none select-none",
            )}
          >
            {meal.recipe ? (
              <img
                src={recipeImageUrl(meal.recipe, "min-original")}
                alt={meal.recipe.name ?? "Repas"}
                draggable={false}
                className="w-full aspect-square object-cover pointer-events-none"
              />
            ) : (
              <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                <span className="text-[11px] text-muted-foreground font-medium px-2 text-center">
                  {meal.title ?? "Sans titre"}
                </span>
              </div>
            )}

            <div className="flex border-t border-border/30">
              {meal.recipe?.slug && (
                <button
                  type="button"
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={() => onView(meal.recipe!.slug)}
                  aria-label="Voir la recette"
                  title="Voir la recette"
                  className="flex flex-1 items-center justify-center py-2"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => onDelete(meal.id)}
                aria-label="Supprimer du planning"
                title="Supprimer du planning"
                className="flex flex-1 items-center justify-center py-2 border-l border-border/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Ajouter un repas"
        title="Ajouter un repas"
        className={cn(
          "flex w-full items-center justify-center rounded-[var(--radius-lg)]",
          "border border-dashed border-border/60 py-3",
          "text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/4",
          "transition-all duration-150",
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}