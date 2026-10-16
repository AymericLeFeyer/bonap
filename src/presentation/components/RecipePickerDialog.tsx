import { useEffect, useRef, useState } from "react"
import { Search, Loader2, UtensilsCrossed, X, ChefHat } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog.tsx"
import { Input } from "./ui/input.tsx"
import { useRecipesInfinite } from "../hooks/useRecipesInfinite.ts"
import type { Course, MealieRecipe } from "../../shared/types/mealie.ts"
import { COURSES, COURSE_LABELS } from "../../shared/types/mealie.ts"
import { recipeHasCourse } from "../../shared/utils/course.ts"
import { recipeImageUrl } from "../../shared/utils/image.ts"
import { getRecipeEmoji } from "../../shared/utils/recipeEmoji.ts"
import { SimpleRecipePicker } from "./SimpleRecipePicker.tsx"
import { cn } from "../../lib/utils.ts"

// ─── Isolated list ────────────────────────────────────────────────────────────

const COURSE_FILTER_LABELS: Record<Course, string> = {
  entree: "Entrées",
  plat: "Plats",
  dessert: "Desserts",
}

const EMPTY_COURSE_MESSAGES: Record<Course, string> = {
  entree: "Aucune entrée trouvée.",
  plat: "Aucun plat trouvé.",
  dessert: "Aucun dessert trouvé.",
}

function RecipeList({
  search,
  course,
  onSelect,
}: {
  search: string
  course: Course | null
  onSelect: (recipe: MealieRecipe) => void
}) {
  const { recipes: allRecipes, loading, hasMore, loadMore } = useRecipesInfinite({ search })
  // Filtrage côté client (comme les saisons) : la sentinelle continue de charger
  // les pages suivantes tant que la liste filtrée ne remplit pas l'écran.
  const recipes = course ? allRecipes.filter((r) => recipeHasCourse(r, course)) : allRecipes
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

  if (recipes.length === 0 && !loading && !hasMore) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <UtensilsCrossed className="h-8 w-8" />
        <p className="text-sm">{course ? EMPTY_COURSE_MESSAGES[course] : "Aucune recette trouvée."}</p>
        {course && course !== "plat" && (
          <p className="max-w-xs text-center text-xs">
            Indiquez le type « {COURSE_LABELS[course]} » sur la fiche d'une recette pour la retrouver ici.
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-5 gap-2 p-1">
        {recipes.map((recipe) => {
          const emoji = getRecipeEmoji(recipe)
          return (
            <button
              key={recipe.id}
              type="button"
              onClick={() => onSelect(recipe)}
              className="group flex flex-col gap-1.5 rounded-[var(--radius-lg)] p-1.5 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RecipeThumbnail recipe={recipe} emoji={emoji} />
              <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight">
                {recipe.name}
              </span>
            </button>
          )
        })}
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

function RecipeThumbnail({ recipe, emoji }: { recipe: MealieRecipe; emoji: string | null }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] bg-muted">
      {!imgError ? (
        <img
          src={recipeImageUrl(recipe, "min-original")}
          alt={recipe.name}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl">
          {emoji}
        </div>
      )}
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

type Tab = "recipes" | "simple"

interface RecipePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (recipe: MealieRecipe) => void
  /** Type du créneau : pré-filtre la liste (l'utilisateur peut afficher toutes les recettes). */
  course?: Course
}

export function RecipePickerDialog({
  open,
  onOpenChange,
  onSelect,
  course,
}: RecipePickerDialogProps) {
  const [tab, setTab] = useState<Tab>("recipes")
  // Choix manuel du filtre, valable tant que le créneau visé ne change pas.
  const [courseOverride, setCourseOverride] = useState<{ for?: Course; value: Course | null } | null>(null)
  const courseFilter = courseOverride && courseOverride.for === course
    ? courseOverride.value
    : course ?? null
  const [inputValue, setInputValue] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dialogContentEl, setDialogContentEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(inputValue), 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setInputValue("")
      setDebouncedSearch("")
      setTab("recipes")
      setCourseOverride(null)
    }
    onOpenChange(value)
  }

  const handleSelect = (recipe: MealieRecipe) => {
    onSelect(recipe)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={setDialogContentEl}
        className="flex max-h-[85vh] flex-col sm:max-w-3xl"
        onPointerDownOutside={(e) => {
          // Autocomplete dropdowns are portalled outside the dialog DOM.
          // Prevent Radix from closing the dialog when the user clicks a suggestion.
          const target = e.target as Element
          if (target.closest('[role="listbox"]') || target.closest('[role="option"]')) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as Element
          if (target.closest('[role="listbox"]') || target.closest('[role="option"]')) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {course === "entree" ? "Choisir une entrée" : course === "dessert" ? "Choisir un dessert" : "Choisir un repas"}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez une recette existante ou créez un repas simple à la volée.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          <TabButton active={tab === "recipes"} onClick={() => setTab("recipes")}>
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Recettes
          </TabButton>
          <TabButton active={tab === "simple"} onClick={() => setTab("simple")}>
            <ChefHat className="h-3.5 w-3.5" />
            Repas simple
          </TabButton>
        </div>

        {tab === "recipes" ? (
          <>
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

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Type de recette">
              {([null, ...COURSES] as const).map((c) => (
                <button
                  key={c ?? "all"}
                  type="button"
                  aria-pressed={courseFilter === c}
                  onClick={() => setCourseOverride({ for: course, value: c })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    courseFilter === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {c ? COURSE_FILTER_LABELS[c] : "Toutes"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              <RecipeList search={debouncedSearch} course={courseFilter} onSelect={handleSelect} />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-1">
            <SimpleRecipePicker onCreated={handleSelect} dropdownContainer={dialogContentEl} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
