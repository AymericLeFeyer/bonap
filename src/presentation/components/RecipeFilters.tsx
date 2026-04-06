import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Search, X, RotateCcw } from "lucide-react"
import { cn } from "../../lib/utils"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie"
import type { Season } from "../../shared/types/mealie"
import { isSeasonTag } from "../../shared/utils/season"
import { isCalorieTag } from "../../shared/utils/calorie"

const TIME_OPTIONS = [
    { label: "< 15 min", value: 15 },
    { label: "< 30 min", value: 30 },
    { label: "< 45 min", value: 45 },
    { label: "< 1h", value: 60 },
    { label: "1h+", value: undefined },
] as const

const CALORIES_OPTIONS = [
    { label: "< 200 kcal", value: 200 },
    { label: "< 400 kcal", value: 400 },
    { label: "< 600 kcal", value: 600 },
    { label: "< 800 kcal", value: 800 },
] as const

type Props = {
    search: string
    setSearch: (v: string) => void

    orderBy: string
    setOrderBy: (v: string) => void

    orderDirection: "asc" | "desc"
    setOrderDirection: (v: "asc" | "desc") => void

    filtersOpen: boolean
    setFiltersOpen: (v: boolean) => void

    hasActiveFilters: boolean
    resetFilters: () => void

    // catégories / tags / saisons
    categories: any[]
    tags: any[]

    selectedCategories: string[]
    toggleCategory: (slug: string) => void

    selectedTags: string[]
    toggleTag: (slug: string) => void

    selectedSeasons: Season[]
    toggleSeason: (season: Season) => void

    maxTotalTime?: number
    handleTimeFilter: (value: number | undefined) => void

    maxCalories?: number
    handleCaloriesFilter: (value: number | undefined) => void

    noIngredients: boolean
    setNoIngredients: (v: boolean | ((v: boolean) => boolean)) => void

    tagSearch: string
    setTagSearch: (v: string) => void
}

export function RecipeFilters({
    search,
    setSearch,
    orderBy,
    setOrderBy,
    orderDirection,
    setOrderDirection,
    filtersOpen,
    setFiltersOpen,
    hasActiveFilters,
    resetFilters,
    categories,
    tags,
    selectedCategories,
    toggleCategory,
    selectedTags,
    toggleTag,
    selectedSeasons,
    toggleSeason,
    maxTotalTime,
    handleTimeFilter,
    maxCalories,
    handleCaloriesFilter,
    noIngredients,
    setNoIngredients,
    tagSearch,
    setTagSearch,
}: Props) {
    return (
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
                        setOrderDirection(orderDirection === "asc" ? "desc" : "asc")
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
                    onClick={() => setFiltersOpen(!filtersOpen)}
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

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

                        {/* CALORIES */}
                        <div className="flex flex-col gap-2">
                            <div className="text-xs text-muted-foreground font-medium">
                                Calories
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 min-w-0">
                                {CALORIES_OPTIONS.map((opt) => {
                                    const active = maxCalories === opt.value

                                    return (
                                        <Badge
                                            key={opt.value}
                                            variant={active ? "default" : "outline"}
                                            className="cursor-pointer whitespace-nowrap shrink-0"
                                            onClick={() => handleCaloriesFilter(opt.value)}
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
                                    .filter(t => !isCalorieTag(t))
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
                                    .filter(t => !isCalorieTag(t))
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
    )
}