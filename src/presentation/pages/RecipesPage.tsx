import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useRecipesInfinite } from "../hooks/useRecipesInfinite.ts"
import { useCategories } from "../hooks/useCategories.ts"
import { useTags } from "../hooks/useTags.ts"
import { getCaloriesFromTags } from "../../shared/utils/calorie.ts"
import { useGridColumns } from "../hooks/useGridColumns.ts"
import { RecipeCard } from "../components/RecipeCard.tsx"
import { Button } from "../components/ui/button.tsx"
import {Loader2, AlertCircle, UtensilsCrossed, Plus, PenLine, } from "lucide-react"
import type { MealieRecipe, Season } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags } from "../../shared/utils/season.ts"
import { getEnv } from "../../shared/utils/env.ts"
import { getRecipesUseCase, getRecipeUseCase } from "../../infrastructure/container.ts"
import { cn } from "../../lib/utils.ts"
import { formatDurationToNumber } from "../../shared/utils/duration.ts"
import { RecipeDrawer } from "../components/RecipeDrawer.tsx"
import { RecipeFilters } from "../components/RecipeFilters.tsx"


export function RecipesPage() {
  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [maxTotalTime, setMaxTotalTime] = useState<number | undefined>(undefined)
  const [maxCalories, setMaxCalories] = useState<number | undefined>(undefined)
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([])
  const [noIngredients, setNoIngredients] = useState(false)
  const [noIngredientRecipes, setNoIngredientRecipes] = useState<MealieRecipe[] | null>(null)
  const [noIngredientsLoading, setNoIngredientsLoading] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const { columns, setColumns, min: minColumns, max: maxColumns } = useGridColumns()
  const navigate = useNavigate()

  useEffect(() => {
    if (selectedSlug) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [selectedSlug])

  const closeDrawer = () => {
    setDrawerClosing(true)
    setTimeout(() => {
      setSelectedSlug(null)
      setDrawerClosing(false)
    }, 240)
  }

  const selectSlug = (slug: string) => {
    if (slug === selectedSlug) {
      closeDrawer()
    } else {
      setSelectedSlug(slug)
      setDrawerClosing(false)
    }
  }

  const sentinelRef = useRef<HTMLDivElement>(null)

  const { categories } = useCategories()
  const { tags } = useTags()
  const [orderBy, setOrderBy] = useState("createdAt")
  const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("desc")

  const { recipes, loading, error, hasMore, loadMore } = useRecipesInfinite({
    search,
    categories: selectedCategories,
    tags: selectedTags,
    orderBy,
    orderDirection,
  })

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  const toggleSeason = (season: Season) => {
    setSelectedSeasons((prev) =>
      prev.includes(season) ? prev.filter((s) => s !== season) : [...prev, season],
    )
  }

  const handleTimeFilter = (value: number | undefined) => {
    setMaxTotalTime((prev) => (prev === value ? undefined : value))
  }

  const handleCaloriesFilter = (value: number | undefined) => {
    setMaxCalories((prev) => (prev === value ? undefined : value))
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCategories.length > 0 ||
    selectedTags.length > 0 ||
    maxTotalTime !== undefined ||
    maxCalories !== undefined ||
    selectedSeasons.length > 0 ||
    noIngredients

  const resetFilters = () => {
    setSearch("")
    setSelectedCategories([])
    setSelectedTags([])
    setMaxTotalTime(undefined)
    setMaxCalories(undefined)
    setSelectedSeasons([])
    setNoIngredients(false)
    setNoIngredientRecipes(null)
  }

  const loadRecipesWithoutIngredients = useCallback(async () => {
    setNoIngredientsLoading(true)
    setNoIngredientRecipes(null)
    try {
      const first = await getRecipesUseCase.execute(1, 100)
      const allItems = [...first.items]
      for (let page = 2; page <= first.totalPages; page++) {
        const data = await getRecipesUseCase.execute(page, 100)
        allItems.push(...data.items)
      }
      const details = await Promise.all(allItems.map((r) => getRecipeUseCase.execute(r.slug)))
      setNoIngredientRecipes(details.filter((r) => !r.recipeIngredient?.length))
    } catch {
      setNoIngredientRecipes([])
    } finally {
      setNoIngredientsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (noIngredients) {
      void loadRecipesWithoutIngredients()
    } else {
      setNoIngredientRecipes(null)
    }
  }, [noIngredients, loadRecipesWithoutIngredients])

  const filteredRecipes = useMemo(() => {
    const base = noIngredients
      ? (noIngredientRecipes ?? [])
      : recipes

    return base.filter((recipe) => {
      // =====================
      // SAISONS
      // =====================
      if (selectedSeasons.length > 0) {
        const recipeSeasons = getRecipeSeasonsFromTags(recipe.tags)

        const hasNoSeason = recipeSeasons.length === 0

        const matchSeason = selectedSeasons.some((s) => {
          if (s === "sans") return hasNoSeason
          return recipeSeasons.includes(s)
        })

        if (!matchSeason) return false
      }

      // =====================
      // TAGS
      // =====================
      if (selectedTags.length > 0) {
        const recipeTagSlugs = recipe.tags?.map(t => t.slug) ?? []

        const hasTag = selectedTags.some(tag =>
          recipeTagSlugs.includes(tag)
        )

        if (!hasTag) return false
      }

      // =====================
      // TEMPS TOTAL
      // =====================
      if (maxTotalTime !== undefined) {
        const totalMinutes = formatDurationToNumber(recipe.totalTime)

        if (!totalMinutes || totalMinutes > maxTotalTime) {
          return false
        }
      }

      // =====================
      // CALORIES
      // =====================
      if (maxCalories !== undefined) {
        const calories = getCaloriesFromTags(recipe.tags)

        if (!calories || calories > maxCalories) {
          return false
        }
      }

      return true
    })
  }, [
    recipes,
    noIngredients,
    noIngredientRecipes,
    selectedSeasons,
    selectedTags,
    maxTotalTime,
    maxCalories,
  ])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [tagSearch, setTagSearch] = useState("")

  return (
    <div className="space-y-5">
      {/* ── En-tête sticky ── */}
      <div
        className={cn(
          "sticky top-0 z-10 -mx-4 -mt-5 md:-mx-7 md:-mt-7",
          "bg-background/95 backdrop-blur-md",
          "px-4 pt-5 md:px-7 md:pt-6 pb-4",
          "border-b border-border/40",
        )}
      >
        {/* Ligne titre */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-heading text-2xl font-bold">Mes recettes</h1>
            {filteredRecipes.length > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5",
                  "text-[11px] font-bold text-muted-foreground",
                  "bg-secondary",
                )}
              >
                {filteredRecipes.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Slider colonnes */}
            <div
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius-lg)]",
                "border border-border bg-card px-2.5 py-1.5",
                "shadow-subtle",
              )}
            >
              <input
                type="range"
                min={minColumns}
                max={maxColumns}
                step={1}
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                aria-label="Nombre de colonnes"
                className="w-20 accent-primary cursor-pointer"
              />
              <span className="text-xs font-semibold tabular-nums text-muted-foreground select-none w-3">
                {columns}
              </span>
            </div>

            {/* Importer depuis Mealie */}
            <a
              href={`${getEnv("VITE_MEALIE_URL").replace(/\/+$/, "")}/g/home/r/create/url`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[var(--radius-lg)]",
                "border border-border bg-card px-3 py-1.5",
                "text-sm font-semibold text-muted-foreground",
                "shadow-subtle",
                "hover:bg-secondary hover:text-foreground hover:border-border",
                "transition-all duration-150",
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importer</span>
            </a>

            {/* Nouvelle recette */}
            <Button
              size="sm"
              onClick={() => navigate("/recipes/new")}
              className="gap-1.5"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouvelle recette</span>
            </Button>
          </div>
        </div>

        {/* Barre de filtres */}

        <RecipeFilters
          search={search}
          setSearch={setSearch}

          orderBy={orderBy}
          setOrderBy={setOrderBy}

          orderDirection={orderDirection}
          setOrderDirection={setOrderDirection}

          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}

          hasActiveFilters={hasActiveFilters}
          resetFilters={resetFilters}

          categories={categories}
          tags={tags}

          selectedCategories={selectedCategories}
          toggleCategory={toggleCategory}

          selectedTags={selectedTags}
          toggleTag={toggleTag}

          selectedSeasons={selectedSeasons}
          toggleSeason={toggleSeason}

          maxTotalTime={maxTotalTime}
          handleTimeFilter={handleTimeFilter}

          maxCalories={maxCalories}
          handleCaloriesFilter={handleCaloriesFilter}

          noIngredients={noIngredients}
          setNoIngredients={setNoIngredients}

          tagSearch={tagSearch}
          setTagSearch={setTagSearch}
        />
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/8 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* État vide */}
      {!loading && !error && filteredRecipes.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
          <div className={cn(
            "flex h-16 w-16 items-center justify-center rounded-[var(--radius-2xl)]",
            "bg-secondary",
          )}>
            <UtensilsCrossed className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-semibold">Aucune recette trouvée</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-1 text-sm text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      )}

      {/* Grille */}
      {filteredRecipes.length > 0 && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selected={recipe.slug === selectedSlug}
              onSelect={selectSlug}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />

      {(loading || noIngredientsLoading) && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/50" />
        </div>
      )}

      {/* Drawer latéral */}
      {selectedSlug !== null && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-40 min-h-screen",
              "bg-foreground/15 backdrop-blur-[2px]",
              drawerClosing ? "animate-fade-out" : "animate-fade-in",
            )}
            onClick={closeDrawer}
          />
          <RecipeDrawer
            slug={selectedSlug}
            allCategories={categories}
            closing={drawerClosing}
            onClose={closeDrawer}
          />
        </>
      )}

    </div>
  )
}

