import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import {
  Plus, Minus, Copy, Eye, Trash2, Check,
  MessageSquarePlus, MessageSquare,
} from "lucide-react"
import type { MealieMealPlan } from "../../../shared/types/mealie.ts"
import { cn } from "../../../lib/utils.ts"
import { RecipeImage } from "../RecipeImage.tsx"
import { parseServings } from "../../../shared/utils/servings.ts"
import { getMealServings, getMealVisibleNote } from "./planningUtils.ts"

export interface MealCellProps {
  meals: MealieMealPlan[]
  lastMeals: MealieMealPlan[]
  onAdd: () => void
  onDelete: (id: number) => void
  onSelectLeftover: (meal: MealieMealPlan) => void
  onNote: (meal: MealieMealPlan) => void
  colorClass: string
  date: string
  entryType: string
  onDrop: (draggedMeal: MealieMealPlan, targetDate: string, targetType: string) => void
  onView: (meal: MealieMealPlan) => void
  onServingsChange: (meal: MealieMealPlan, servings: number) => void
  servingsEnabled: boolean
  selectionMode?: boolean
  selectedMealIds?: Set<number>
  onToggleSelect?: (id: number) => void
}

export function MealCell({
  meals, lastMeals, onAdd, onDelete, onSelectLeftover, onNote,
  colorClass, date, entryType, onDrop, onView, onServingsChange, servingsEnabled,
  selectionMode, selectedMealIds, onToggleSelect,
}: MealCellProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const copyBtnRef = useRef<HTMLButtonElement>(null)
  const isEmpty = meals.length === 0

  const DROPDOWN_WIDTH = 200
  const handleCopyClick = () => {
    if (lastMeals.length === 0) return
    const rect = copyBtnRef.current?.getBoundingClientRect()
    if (!rect) return
    const overflowsRight = rect.left + DROPDOWN_WIDTH > window.innerWidth
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: overflowsRight
        ? rect.right + window.scrollX - DROPDOWN_WIDTH
        : rect.left + window.scrollX,
    })
    setDropdownOpen(true)
  }

  useEffect(() => {
    if (!dropdownOpen) return
    const close = () => setDropdownOpen(false)
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", close)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", close)
    }
  }, [dropdownOpen])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const raw = e.dataTransfer.getData("application/json")
    if (!raw) return
    try {
      const meal = JSON.parse(raw) as MealieMealPlan
      onDrop(meal, date, entryType)
    } catch {
      // Invalid drag data — ignore
    }
  }

  return (
    <td
      className={cn(
        "border border-border/50 p-2 align-top min-w-[130px]",
        colorClass,
        isDragOver && "ring-2 ring-inset ring-primary/40 bg-primary/6",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-2">
        {meals.map((meal) => {
          const name = meal.recipe?.name ?? meal.title ?? "Sans titre"
          const mealServings = getMealServings(meal)
          const baseServings = parseServings(meal.recipe?.recipeYield)
          const isSelected = selectionMode && (selectedMealIds?.has(meal.id) ?? false)
          return (
            <div
              key={meal.id}
              draggable={!selectionMode}
              onDragStart={(e) => {
                if (selectionMode) return
                e.dataTransfer.setData("application/json", JSON.stringify(meal))
                e.dataTransfer.effectAllowed = "move"
              }}
              onClick={() => selectionMode && onToggleSelect?.(meal.id)}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-lg)]",
                "bg-card border shadow-subtle",
                "transition-all duration-150 overflow-hidden",
                selectionMode
                  ? "cursor-pointer"
                  : "cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-warm",
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
                    "transition-all pointer-events-none",
                    isSelected ? "bg-primary border-primary" : "bg-black/20 border-white/80",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />}
                </div>
              )}
              <div className="flex items-center gap-2 p-2">
                {meal.recipe && (
                  <RecipeImage
                    recipe={meal.recipe}
                    alt={name}
                    className="h-[72px] w-[72px] shrink-0 rounded-[var(--radius-md)] object-cover"
                    fallbackClassName="h-[72px] w-[72px] shrink-0 rounded-[var(--radius-md)]"
                  />
                )}
                <span className="line-clamp-4 flex-1 text-[12.5px] font-medium leading-snug">{name}</span>
              </div>

              {getMealVisibleNote(meal) && (
                <div className="px-2 pb-1.5">
                  <p className="text-[11px] text-muted-foreground italic leading-snug line-clamp-2">
                    {getMealVisibleNote(meal)}
                  </p>
                </div>
              )}
              {servingsEnabled && (
                <div className="px-2 pb-1.5">
                  <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border/40 bg-secondary/30 px-2 py-1">
                    {mealServings && mealServings > 0 ? (
                      <>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {mealServings} pers.
                          {baseServings && baseServings > 0 && baseServings !== mealServings ? ` (base ${baseServings})` : ""}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onServingsChange(meal, Math.max(1, mealServings - 1))}
                            className="rounded border border-border/60 p-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary"
                            title="Diminuer les portions"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onServingsChange(meal, mealServings + 1)}
                            className="rounded border border-border/60 p-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary"
                            title="Augmenter les portions"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        Définir les portions dans la recette
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex border-t border-border/30">
                {meal.recipe?.slug && (
                  <button
                    type="button"
                    onClick={() => onView(meal)}
                    title="Voir la recette"
                    className="flex flex-1 items-center justify-center py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNote(meal)}
                  title={getMealVisibleNote(meal) ? "Modifier la note" : "Ajouter une note"}
                  className={cn(
                    "flex flex-1 items-center justify-center py-1.5 transition-colors border-l border-border/30",
                    getMealVisibleNote(meal)
                      ? "text-primary/70 hover:bg-primary/8 hover:text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {getMealVisibleNote(meal)
                    ? <MessageSquare className="h-3.5 w-3.5" />
                    : <MessageSquarePlus className="h-3.5 w-3.5" />
                  }
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(meal.id)}
                  title="Supprimer du planning"
                  className="flex flex-1 items-center justify-center py-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive border-l border-border/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        <div className="flex gap-1">
          <button
            type="button"
            onClick={onAdd}
            aria-label="Ajouter un repas"
            className={cn(
              "flex flex-1 items-center justify-center rounded-[var(--radius-md)]",
              "border border-dashed border-border/50 py-2",
              "text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/4",
              "transition-all duration-150",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {isEmpty && (
            <>
              <button
                ref={copyBtnRef}
                type="button"
                onClick={handleCopyClick}
                disabled={lastMeals.length === 0}
                title={
                  lastMeals.length > 0
                    ? "Copier un repas précédent (restes)"
                    : "Aucun repas précédent disponible"
                }
                className={cn(
                  "flex items-center justify-center rounded-[var(--radius-md)]",
                  "border border-dashed border-border/50 px-2 py-2",
                  "text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/4",
                  "disabled:cursor-not-allowed disabled:opacity-30",
                  "transition-all duration-150",
                )}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {dropdownOpen && dropdownPos && createPortal(
                <div
                  className={cn(
                    "fixed z-50 w-[200px]",
                    "rounded-[var(--radius-lg)] border border-border/60",
                    "bg-card shadow-lg overflow-hidden",
                  )}
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {lastMeals.map((meal) => (
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
                  ))}
                </div>,
                document.body,
              )}
            </>
          )}
        </div>
      </div>
    </td>
  )
}
