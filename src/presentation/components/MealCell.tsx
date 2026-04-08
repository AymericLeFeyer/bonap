import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Plus, Copy, Eye, Trash2 } from "lucide-react"
import type { MealieMealPlan } from "../../shared/types/mealie.ts"
import { cn } from "../../lib/utils.ts"
import { recipeImageUrl } from "../../shared/utils/image.ts"


const DROPDOWN_WIDTH = 200

interface MealCellProps {
  meals: MealieMealPlan[]
  lastMeals: MealieMealPlan[]
  onAdd: () => void
  onDelete: (id: number) => void
  onSelectLeftover: (meal: MealieMealPlan) => void
  colorClass: string
  date: string
  entryType: string
  onDrop: (draggedMeal: MealieMealPlan, targetDate: string, targetType: string) => void
  onView: (slug: string) => void
}

export function MealCell({
  meals, lastMeals, onAdd, onDelete, onSelectLeftover,
  colorClass, date, entryType, onDrop, onView,
}: MealCellProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const copyBtnRef = useRef<HTMLButtonElement>(null)
  const isEmpty = meals.length === 0

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

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
          return (
            <div
              key={meal.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/json", JSON.stringify(meal))
                e.dataTransfer.effectAllowed = "move"
              }}
              className={cn(
                "flex flex-col rounded-[var(--radius-lg)]",
                "bg-card border border-border/40 shadow-subtle",
                "cursor-grab active:cursor-grabbing",
                "hover:border-primary/30 hover:shadow-warm",
                "transition-all duration-150 overflow-hidden",
              )}
            >
              <div className="flex items-center gap-2 p-2">
                {meal.recipe && (
                  <img
                    src={recipeImageUrl(meal.recipe, "min-original")}
                    alt={name}
                    className="h-[72px] w-[72px] shrink-0 rounded-[var(--radius-md)] object-cover"
                  />
                )}
                <span className="line-clamp-4 flex-1 text-[12.5px] font-medium leading-snug">
                  {name}
                </span>
              </div>

              <div className="flex border-t border-border/30">
                {meal.recipe?.slug && (
                  <button
                    type="button"
                    onClick={() => onView(meal.recipe!.slug)}
                    aria-label="Voir la recette"
                    title="Voir la recette"
                    className="flex flex-1 items-center justify-center py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(meal.id)}
                  aria-label="Supprimer du planning"
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
            aria-label="Ajouter un repas"
            title="Ajouter un repas"
            onClick={onAdd}
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
                        "text-sm hover:bg-accent hover:text-accent-foreground",
                        "transition-colors",
                      )}
                    >
                      {meal.recipe && (
                        <img
                          src={recipeImageUrl(meal.recipe, "min-original")}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-[var(--radius-sm)] object-cover"
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