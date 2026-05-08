import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { Plus, Copy, Check } from "lucide-react"
import type { MealieMealPlan } from "../../../shared/types/mealie.ts"
import { cn } from "../../../lib/utils.ts"
import { RecipeImage } from "../RecipeImage.tsx"
import { getMealServings } from "./planningUtils.ts"

export interface MobileMealSectionProps {
  meals: MealieMealPlan[]
  lastMeals: MealieMealPlan[]
  onAdd: () => void
  onSelectLeftover: (meal: MealieMealPlan) => void
  onMealTouchStart: (meal: MealieMealPlan, e: React.TouchEvent) => void
  servingsEnabled: boolean
  selectionMode?: boolean
  selectedMealIds?: Set<number>
  onToggleSelect?: (id: number) => void
}

export function MobileMealSection({ meals, lastMeals, onAdd, onSelectLeftover, onMealTouchStart, servingsEnabled, selectionMode, selectedMealIds, onToggleSelect }: MobileMealSectionProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const copyBtnRef = useRef<HTMLButtonElement>(null)
  const isEmpty = meals.length === 0

  const DROPDOWN_WIDTH = 200
  const handleCopyClick = () => {
    const rect = copyBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const overflowsRight = rect.left + DROPDOWN_WIDTH > window.innerWidth
    setDropdownPos({
      top: rect.bottom + 4,
      left: overflowsRight ? rect.right - DROPDOWN_WIDTH : rect.left,
    })
    setDropdownOpen(true)
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3">
      {meals.map((meal) => {
        const mealServings = getMealServings(meal)
        const isSelected = selectionMode && (selectedMealIds?.has(meal.id) ?? false)
        return (
          <div
            key={meal.id}
            onTouchStart={(e) => !selectionMode && onMealTouchStart(meal, e)}
            onClick={() => selectionMode && onToggleSelect?.(meal.id)}
            className={cn(
              "relative rounded-[var(--radius-lg)]",
              "bg-card border shadow-subtle overflow-hidden",
              "touch-none select-none",
              selectionMode ? "cursor-pointer" : "",
              isSelected
                ? "border-primary ring-2 ring-primary ring-offset-1"
                : "border-border/40",
            )}
          >
            {selectionMode && (
              <div
                className={cn(
                  "absolute top-1.5 right-1.5 z-10",
                  "h-5 w-5 rounded-[var(--radius-sm)] border-2 flex items-center justify-center",
                  "transition-all",
                  isSelected ? "bg-primary border-primary" : "bg-black/20 border-white/80",
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />}
              </div>
            )}
            {meal.recipe ? (
              <div className="relative w-full aspect-square">
                <RecipeImage
                  recipe={meal.recipe}
                  alt={meal.recipe.name ?? "Repas"}
                  className="w-full h-full object-cover pointer-events-none"
                  fallbackClassName="w-full h-full text-4xl"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                  <span className="block text-[11px] font-semibold text-white leading-tight line-clamp-2">
                    {meal.recipe.name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                <span className="text-[11px] text-muted-foreground font-medium px-2 text-center">
                  {meal.title ?? "Sans titre"}
                </span>
              </div>
            )}
            <div className="border-t border-border/40 bg-secondary/20 px-2 py-1">
              {servingsEnabled && (
                mealServings && mealServings > 0 ? (
                  <span className="text-[10px] font-semibold text-muted-foreground">{mealServings} pers.</span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    Définir les portions dans la recette
                  </span>
                )
              )}
            </div>
          </div>
        )
      })}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Ajouter un repas"
          className={cn(
            "flex flex-1 items-center justify-center rounded-[var(--radius-lg)]",
            "border border-dashed border-border/60 py-3",
            "text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/4",
            "transition-all duration-150",
          )}
        >
          <Plus className="h-4 w-4" />
        </button>

        {isEmpty && (
          <>
            <button
              ref={copyBtnRef}
              type="button"
              onClick={handleCopyClick}
              title="Copier un repas précédent (restes)"
              className={cn(
                "flex items-center justify-center rounded-[var(--radius-lg)]",
                "border border-dashed border-border/60 px-3 py-3",
                "text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/4",
                "transition-all duration-150",
              )}
            >
              <Copy className="h-4 w-4" />
            </button>
            {dropdownOpen && dropdownPos && createPortal(
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div
                  className={cn(
                    "fixed z-50 w-[200px]",
                    "rounded-[var(--radius-lg)] border border-border/60",
                    "bg-card shadow-lg overflow-hidden",
                  )}
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                  {lastMeals.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-muted-foreground">Aucun repas précédent disponible</p>
                  ) : (
                    lastMeals.map((meal) => (
                      <button
                        key={meal.id}
                        type="button"
                        onClick={() => { setDropdownOpen(false); onSelectLeftover(meal) }}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1.5 text-left",
                          "text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                        )}
                      >
                        {meal.recipe && (
                          <RecipeImage
                            recipe={meal.recipe}
                            className="h-8 w-8 shrink-0 rounded-[var(--radius-sm)] object-cover"
                            fallbackClassName="h-8 w-8 shrink-0 rounded-[var(--radius-sm)]"
                          />
                        )}
                        <span className="line-clamp-2 leading-snug">
                          {meal.recipe?.name ?? meal.title ?? "Sans titre"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>,
              document.body,
            )}
          </>
        )}
      </div>
    </div>
  )
}
