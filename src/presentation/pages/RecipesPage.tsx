import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { useNavigate, Link } from "react-router-dom"
import { CookingMode } from "../components/CookingMode.tsx"
import { useRecipesInfinite } from "../hooks/useRecipesInfinite.ts"
import { useCategories } from "../hooks/useCategories.ts"
import { useTags } from "../hooks/useTags.ts"
import { useRecipe } from "../hooks/useRecipe.ts"
import { useUpdateSeasons } from "../hooks/useUpdateSeasons.ts"
import { useUpdateCategories } from "../hooks/useUpdateCategories.ts"
import { useGridColumns } from "../hooks/useGridColumns.ts"
import { RecipeCard } from "../components/RecipeCard.tsx"
import { Badge } from "../components/ui/badge.tsx"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import {
  Loader2, AlertCircle, UtensilsCrossed, Search, X, RotateCcw,
  Plus, PenLine, ExternalLink, Clock, CalendarPlus, CookingPot,
} from "lucide-react"
import type { MealieRecipe, MealieCategory, Season } from "../../shared/types/mealie.ts"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags, isSeasonTag } from "../../shared/utils/season.ts"
import { getEnv } from "../../shared/utils/env.ts"
import { getRecipesUseCase, getRecipeUseCase, addMealUseCase, deleteMealUseCase } from "../../infrastructure/container.ts"
import { PlanningSlotPicker } from "../components/PlanningSlotPicker.tsx"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip.tsx"
import { RecipeIngredientsList } from "../components/RecipeIngredientsList.tsx"
import { RecipeInstructionsList } from "../components/RecipeInstructionsList.tsx"
import { cn } from "../../lib/utils.ts"
import { recipeImageUrl } from "../../shared/utils/image.ts"
import { formatDuration, formatDurationToNumber } from "../../shared/utils/duration.ts"

const TIME_OPTIONS = [
  { label: "< 15 min", value: 15 },
  { label: "< 30 min", value: 30 },
  { label: "< 45 min", value: 45 },
  { label: "< 1h", value: 60 },
  { label: "1h+", value: undefined },
] as const

export function RecipesPage() {
  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [maxTotalTime, setMaxTotalTime] = useState<number | undefined>(undefined)
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

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCategories.length > 0 ||
    selectedTags.length > 0 ||
    maxTotalTime !== undefined ||
    selectedSeasons.length > 0 ||
    noIngredients

  const resetFilters = () => {
    setSearch("")
    setSelectedCategories([])
    setSelectedTags([])
    setMaxTotalTime(undefined)
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

      return true
    })
  }, [
    recipes,
    noIngredients,
    noIngredientRecipes,
    selectedSeasons,
    selectedTags,
    maxTotalTime,
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
        <div className="space-y-2.5">

          {/* Recherche + tri + bouton filtres */}
          <div className="flex items-center gap-2">

            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                placeholder="Rechercher une recette..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* ===================== */}
            {/* ORDER BY SELECT */}
            {/* ===================== */}
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="
      h-9 px-3 rounded-[var(--radius-lg)]
      border border-border bg-background
      text-xs text-foreground
      outline-none
      hover:bg-secondary
      transition-colors
    "
            >
              <option value="createdAt">Création</option>
              <option value="updatedAt">Modification</option>
              <option value="name">Nom</option>
              <option value="rating">Note</option>
              <option value="totalTime">Temps total</option>
              <option value="prepTime">Préparation</option>
              <option value="performTime">Cuisson</option>
            </select>

            {/* ===================== */}
            {/* ORDER DIRECTION */}
            {/* ===================== */}
            <button
              type="button"
              onClick={() =>
                setOrderDirection((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="
      h-9 w-9 flex items-center justify-center
      rounded-[var(--radius-lg)]
      border border-border bg-background
      hover:bg-secondary
      transition-colors
    "
              title={orderDirection === "asc" ? "Ascendant" : "Descendant"}
            >
              {orderDirection === "asc" ? (
                <span className="text-xs">↑</span>
              ) : (
                <span className="text-xs">↓</span>
              )}
            </button>

            {/* Toggle filtres */}
            <Button
              size="sm"
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="gap-1.5"
            >
              Filtres
            </Button>

            {/* reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className={cn(
                  "shrink-0 flex items-center gap-1",
                  "text-xs text-muted-foreground hover:text-foreground",
                  "transition-colors"
                )}
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>


          {/* FILTRES COLLAPSIBLES */}
          {filtersOpen && (
            <div className="flex flex-col gap-4">

              {/* ===================== */}
              {/* 1. CONTEXTE */}
              {/* ===================== */}
              <div className="grid grid-cols-2 gap-4">

                {/* ================= */}
                {/* SAISON */}
                {/* ================= */}
                <div className="flex flex-col gap-2">

                  <div className="text-xs text-muted-foreground font-medium">
                    Saison
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 min-w-0">

                    {SEASONS.map((season: Season) => {
                      const active = selectedSeasons.includes(season)
                      return (
                        <Badge
                          key={season}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer whitespace-nowrap shrink-0"
                          onClick={() => toggleSeason(season)}
                        >
                          {SEASON_LABELS[season]}
                        </Badge>
                      )
                    })}

                  </div>
                </div>

                {/* ================= */}
                {/* TEMPS */}
                {/* ================= */}
                <div className="flex flex-col gap-2">

                  <div className="text-xs text-muted-foreground font-medium">
                    Temps de préparation
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 min-w-0">

                    {TIME_OPTIONS
                      .filter(opt => opt.value !== undefined)
                      .map(opt => {
                        const active = maxTotalTime === opt.value
                        return (
                          <Badge
                            key={opt.label}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer whitespace-nowrap shrink-0"
                            onClick={() => handleTimeFilter(opt.value)}
                          >
                            {opt.label}
                          </Badge>
                        )
                      })}

                  </div>
                </div>

              </div>

              {/* ===================== */}
              {/* 2. OPTIONS RAPIDES */}
              {/* ===================== */}
              <div className="flex flex-col gap-1">

                <div className="text-xs text-muted-foreground font-medium">
                  Options rapides
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 min-w-0">

                  <Badge
                    variant={noIngredients ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap shrink-0"
                    onClick={() => setNoIngredients(v => !v)}
                  >
                    Sans ingrédients
                  </Badge>

                </div>
              </div>

              {/* ===================== */}
              {/* 3. CATÉGORIES */}
              {/* ===================== */}
              <div className="flex flex-col gap-1">

                <div className="text-xs text-muted-foreground font-medium">
                  Catégories
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-2 py-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-max">

                    {categories.length > 0 &&
                      categories.map(cat => {
                        const active = selectedCategories.includes(cat.slug)
                        return (
                          <Badge
                            key={cat.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer whitespace-nowrap shrink-0"
                            onClick={() => toggleCategory(cat.slug)}
                          >
                            {cat.name}
                          </Badge>
                        )
                      })
                    }

                  </div>
                </div>
              </div>

              {/* ===================== */}
              {/* 4. TAGS + SEARCH */}
              {/* ===================== */}
              <div className="flex flex-col gap-2">

                <div className="text-xs text-muted-foreground font-medium">
                  Tags
                </div>

                {/* INPUT + TAGS SUR LA MÊME LIGNE */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-2 py-1 min-w-0">

                  {/* INPUT */}
                  <input
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Rechercher..."
                    className="
        h-7 px-3 rounded-full
        border border-border
        bg-background
        text-xs text-foreground
        outline-none
        focus:ring-1 focus:ring-primary
        min-w-[140px]
        shrink-0
      "
                  />

                  {/* TAGS */}
                  <div className="flex items-center gap-2 min-w-max">

                    {tags
                      .filter(t => !isSeasonTag(t))
                      .filter(t =>
                        t.name.toLowerCase().includes(tagSearch.toLowerCase())
                      )
                      .map(tag => {
                        const active = selectedTags.includes(tag.slug)
                        return (
                          <Badge
                            key={tag.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer whitespace-nowrap shrink-0"
                            onClick={() => toggleTag(tag.slug)}
                          >
                            {tag.name}
                          </Badge>
                        )
                      })}

                    {tags
                      .filter(t => !isSeasonTag(t))
                      .filter(t =>
                        t.name.toLowerCase().includes(tagSearch.toLowerCase())
                      ).length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          Aucun tag trouvé
                        </span>
                      )}
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
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
      {console.log(recipes)}
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

// ─── Drawer recette ────────────────────────────────────────────────────────────


interface RecipeDrawerProps {
  slug: string
  allCategories: MealieCategory[]
  closing: boolean
  onClose: () => void
}

function RecipeDrawer({ slug, allCategories, closing, onClose }: RecipeDrawerProps) {
  const { recipe, setRecipe, loading } = useRecipe(slug)
  const { updateSeasons, loading: seasonsLoading } = useUpdateSeasons()
  const { updateCategories, loading: categoriesLoading } = useUpdateCategories()
  const [cookingMode, setCookingMode] = useState(false)
  const [planningPickerOpen, setPlanningPickerOpen] = useState(false)

  const handleSlotSelect = async (date: string, entryType: string, existingMealId?: number) => {
    if (!recipe) return
    if (existingMealId !== undefined) {
      await deleteMealUseCase.execute(existingMealId)
    }
    await addMealUseCase.execute(date, entryType, recipe.id)
    setPlanningPickerOpen(false)
  }

  const handleToggleSeason = async (season: Season) => {
    if (!recipe) return
    const current = getRecipeSeasonsFromTags(recipe.tags)
    const newSeasons = current.includes(season)
      ? current.filter((s) => s !== season)
      : [...current, season]
    const updated = await updateSeasons(recipe.slug, newSeasons)
    if (updated) setRecipe(updated)
  }

  const handleToggleCategory = async (cat: MealieCategory) => {
    if (!recipe) return
    const current = recipe.recipeCategory ?? []
    const isActive = current.some((c) => c.id === cat.id)
    const newCats = isActive ? current.filter((c) => c.id !== cat.id) : [...current, cat]
    const updated = await updateCategories(recipe.slug, newCats)
    if (updated) setRecipe(updated)
  }

  return (
    <>
      {cookingMode && recipe && (
        <CookingMode
          recipeName={recipe.name}
          ingredients={recipe.recipeIngredient ?? []}
          instructions={recipe.recipeInstructions ?? []}
          onClose={() => setCookingMode(false)}
        />
      )}
      <PlanningSlotPicker
        open={planningPickerOpen}
        onOpenChange={setPlanningPickerOpen}
        recipeName={recipe?.name ?? ""}
        onSelect={handleSlotSelect}
      />
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50",
          "flex w-full max-w-md flex-col",
          "bg-card border-l border-border/40",
          "shadow-warm-lg",
          closing ? "animate-slide-out-right" : "animate-slide-in-right",
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-5 py-3.5">
          <span className="font-heading text-base font-bold tracking-tight">Recette</span>
          <div className="flex items-center gap-1.5">
            {recipe && (
              <>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setPlanningPickerOpen(true)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-[var(--radius-md)]",
                          "border border-border px-2.5 py-1.5",
                          "text-xs font-semibold text-muted-foreground",
                          "hover:text-foreground hover:border-border/80 hover:bg-secondary",
                          "transition-all duration-150",
                        )}
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        <span className="sm:hidden">Planifier</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="hidden sm:block">Planifier</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setCookingMode(true)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-[var(--radius-md)]",
                          "border border-border px-2.5 py-1.5",
                          "text-xs font-semibold text-muted-foreground",
                          "hover:text-foreground hover:border-border/80 hover:bg-secondary",
                          "transition-all duration-150",
                        )}
                      >
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                        <span className="sm:hidden">Mode cuisine</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="hidden sm:block">Mode cuisine</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to={`/recipes/${recipe.slug}`}
                        className={cn(
                          "flex items-center gap-1.5 rounded-[var(--radius-md)]",
                          "border border-border px-2.5 py-1.5",
                          "text-xs font-semibold text-muted-foreground",
                          "hover:text-foreground hover:border-border/80 hover:bg-secondary",
                          "transition-all duration-150",
                        )}
                      >
                        <CookingPot className="h-3.5 w-3.5" />
                        <span className="sm:hidden">Page complète</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent className="hidden sm:block">Page complète</TooltipContent>
                  </Tooltip>

                  {recipe.orgURL && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={recipe.orgURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-1.5 rounded-[var(--radius-md)]",
                            "border border-border px-2.5 py-1.5",
                            "text-xs font-semibold text-muted-foreground",
                            "hover:text-foreground hover:border-border/80 hover:bg-secondary",
                            "transition-all duration-150",
                          )}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="sm:hidden">Recette originale</span>
                        </a>
                      </TooltipTrigger>

                      <TooltipContent className="hidden sm:block">
                        Recette originale
                      </TooltipContent>
                    </Tooltip>
                  )}

                </TooltipProvider>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)]",
                "text-muted-foreground hover:text-foreground hover:bg-secondary",
                "transition-colors",
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
            </div>
          )}

          {recipe && (
            <article className="space-y-5 pb-24">
              {/* Image */}
              <div className="relative">
                <img
                  src={recipeImageUrl(recipe, "original")}
                  alt={recipe.name}
                  className="aspect-video w-full object-cover"
                />
                {/* Dégradé bas pour transition vers le contenu */}
                <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-card to-transparent" />
              </div>

              <div className="space-y-4 px-5">
                {/* Nom */}
                <h1 className="font-heading text-xl font-bold leading-snug tracking-tight">{recipe.name}</h1>

                {/* Temps */}
                {(recipe.prepTime || recipe.performTime || recipe.totalTime) && (
                  <div className="flex flex-wrap gap-3">
                    {recipe.prepTime && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-primary/60" />
                        <span className="font-medium">Prép.</span> {formatDuration(recipe.prepTime)}
                      </span>
                    )}
                    {recipe.performTime && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-primary/60" />
                        <span className="font-medium">Cuisson</span> {formatDuration(recipe.performTime)}
                      </span>
                    )}
                    {recipe.totalTime && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-primary/60" />
                        <span className="font-medium">Total</span> {formatDuration(recipe.totalTime)}
                      </span>
                    )}
                  </div>
                )}

                {/* Toggle catégories */}
                {allCategories.length > 0 && (
                  <div className={cn(
                    "space-y-2.5 rounded-[var(--radius-xl)]",
                    "border border-border/50 bg-secondary/30 p-3.5",
                  )}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
                      Catégories
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allCategories.map((cat) => {
                        const active = (recipe.recipeCategory ?? []).some((c) => c.id === cat.id)
                        return (
                          <Badge
                            key={cat.id}
                            variant={active ? "default" : "outline"}
                            className="cursor-pointer select-none"
                            onClick={() => void handleToggleCategory(cat)}
                          >
                            {categoriesLoading ? "…" : cat.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Toggle saisons */}
                <div className={cn(
                  "space-y-2.5 rounded-[var(--radius-xl)]",
                  "border border-border/50 bg-secondary/30 p-3.5",
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
                    Saisons
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SEASONS.filter((s) => s !== "sans").map((season: Season) => {
                      const active = getRecipeSeasonsFromTags(recipe.tags).includes(season)
                      return (
                        <Badge
                          key={season}
                          variant={active ? "default" : "outline"}
                          className="cursor-pointer select-none"
                          onClick={() => void handleToggleSeason(season)}
                        >
                          {seasonsLoading ? "…" : SEASON_LABELS[season]}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Séparateur éditorial */}
              {((recipe.recipeIngredient ?? []).length > 0 || (recipe.recipeInstructions ?? []).length > 0) && (
                <div className="px-5">
                  <div className="divider-editorial" />
                </div>
              )}

              {/* Ingrédients */}
              {(recipe.recipeIngredient ?? []).length > 0 && (
                <div className="px-5">
                  <RecipeIngredientsList ingredients={recipe.recipeIngredient ?? []} headingSize="text-base" />
                </div>
              )}

              {/* Instructions */}
              {(recipe.recipeInstructions ?? []).length > 0 && (
                <div className="px-5">
                  <RecipeInstructionsList instructions={recipe.recipeInstructions ?? []} headingSize="text-base" />
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </>
  )
}
