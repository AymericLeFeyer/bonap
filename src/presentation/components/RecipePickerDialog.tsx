import { useEffect, useRef, useState } from "react"
import { Search, Loader2, UtensilsCrossed, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog.tsx"
import { Input } from "./ui/input.tsx"
import { useRecipesInfinite } from "../hooks/useRecipesInfinite.ts"
import type { MealieRecipe } from "../../shared/types/mealie.ts"

// ─── Isolated list ────────────────────────────────────────────────────────────
// Separate component: only re-renders when `search` (debounced) changes,
// not on every keystroke.

function RecipeList({
  search,
  onSelect,
}: {
  search: string
  onSelect: (recipe: MealieRecipe) => void
}) {
  const { recipes, loading, hasMore, loadMore } = useRecipesInfinite({ search })
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadMore()
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  if (recipes.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <UtensilsCrossed className="h-8 w-8" />
        <p className="text-sm">Aucune recette trouvée.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-5 gap-2 p-1">
        {recipes.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => onSelect(recipe)}
            className="group flex flex-col gap-1.5 rounded-lg p-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
              <img
                src={`/api/media/recipes/${recipe.id}/images/min-original.webp`}
                alt={recipe.name}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight">
              {recipe.name}
            </span>
          </button>
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface RecipePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (recipe: MealieRecipe) => void
}

export function RecipePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: RecipePickerDialogProps) {
  const [inputValue, setInputValue] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce: update effective search 300ms after the last keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(inputValue), 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setInputValue("")
      setDebouncedSearch("")
    }
    onOpenChange(value)
  }

  const handleSelect = (recipe: MealieRecipe) => {
    onSelect(recipe)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choisir une recette</DialogTitle>
          <DialogDescription>
            Recherchez et sélectionnez une recette pour ce repas.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une recette..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9 pr-9"
            autoFocus
          />
          {inputValue && (
            <button
              type="button"
              onClick={() => setInputValue("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <RecipeList search={debouncedSearch} onSelect={handleSelect} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
