import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { CookingMode } from "./CookingMode"
import { PlanningSlotPicker } from "./PlanningSlotPicker"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"
import { Badge } from "./ui/badge"
import { X, CalendarPlus, UtensilsCrossed, ExternalLink, CookingPot, Loader2, Clock, Star, Heart } from "lucide-react"

import { useRecipe } from "../hooks/useRecipe"
import { useUpdateSeasons } from "../hooks/useUpdateSeasons"
import { useUpdateCategories } from "../hooks/useUpdateCategories"
import { useUpdateCalorieTag } from "../../presentation/hooks/useUpdateCalorieTag"

import { getRecipeSeasonsFromTags } from "../../shared/utils/season"
import { recipeImageUrl } from "../../shared/utils/image"
import { formatDuration } from "../../shared/utils/duration"
import { useUpdateRating } from "../../presentation/hooks/useUpdateRating"

import { cn } from "../../lib/utils"

import { RecipeIngredientsList } from "./RecipeIngredientsList"
import { RecipeInstructionsList } from "./RecipeInstructionsList"

import type { MealieCategory, MealieRatings, Season } from "../../shared/types/mealie"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie"

import { addMealUseCase, deleteMealUseCase } from "../../infrastructure/container"

import { useGetFavorites } from "../../presentation/hooks/useGetFavorites"
import { useToggleFavorite } from "../../presentation/hooks/useToggleFavorite"




// ─── Drawer recette ────────────────────────────────────────────────────────────


interface RecipeDrawerProps {
    slug: string
    allCategories: MealieCategory[]
    closing: boolean
    onClose: () => void
}


export function RecipeDrawer({ slug, allCategories, closing, onClose }: RecipeDrawerProps) {
    const { recipe, setRecipe, loading } = useRecipe(slug)
    const { updateSeasons, loading: seasonsLoading } = useUpdateSeasons()
    const { updateCategories, loading: categoriesLoading } = useUpdateCategories()
    const { updateCalorieTag } = useUpdateCalorieTag()
    const [cookingMode, setCookingMode] = useState(false)
    const [planningPickerOpen, setPlanningPickerOpen] = useState(false)
    const syncLock = useRef(false)
    const { getFavorites } = useGetFavorites()
    const [ratings, setRatings] = useState<MealieRatings[]>([])

    useEffect(() => {
        if (!recipe) return
        if (syncLock.current) return

        // Get favorites
        void (async () => {
            const data = await getFavorites()
            setRatings(data.ratings)
        })()

        const caloriesString = recipe.nutrition?.calories
        if (!caloriesString) return

        const match = caloriesString.match(/[\d.]+/)
        if (!match) return

        const calories = Number(match[0])
        if (isNaN(calories)) return

        const existingTag = recipe.tags?.find(t =>
            t.slug.startsWith("calorie-")
        )

        const existingCalories = existingTag
            ? Number(existingTag.slug.replace("calorie-", ""))
            : null

        // déjà OK → stop
        if (existingCalories === calories) return

        const run = async () => {
            try {
                syncLock.current = true

                const updated = await updateCalorieTag(recipe.slug, calories)

                if (updated) {
                    setRecipe(updated)
                }

            } finally {
                syncLock.current = false
            }
        }

        run()
    }, [recipe, updateCalorieTag, setRecipe, getFavorites])

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
        const newCats = isActive
            ? current.filter((c) => c.id !== cat.id)
            : [...current, cat]
        const updated = await updateCategories(recipe.slug, newCats)
        if (updated) setRecipe(updated)
    }

    const { updateRating } = useUpdateRating()
    const handleRate = async (value: number) => {
        if (!recipe) return
        const success = await updateRating(recipe.slug, value)
        if (success) {
            setRecipe({
                ...recipe,
                rating: value,
            })
        }
    }

    const { toggleFavorite } = useToggleFavorite()
    const [Favorite, setFavorite] = useState<boolean | null>(null)
    // Vas vori si la recette est dans les favorie
    const isFavorite =
        Favorite !== null
            ? Favorite
            : ratings.some(
                (r) => r.recipeId === recipe?.id && r.isFavorite
            )

    const handleToggleFavorite = async () => {
        if (!recipe) return
        const previous = isFavorite
        const next = !previous
        setFavorite(next)
        const success = await toggleFavorite(recipe.slug, previous)
        if (!success) {
            setFavorite(previous)
        }
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

                                {/* Rating + Favorite */}
                                <div className="flex items-center justify-between">

                                    {/* Rating */}
                                    <div className="flex items-center gap-1.5">
                                        {Array.from({ length: 5 }).map((_, i) => {
                                            const value = i + 1
                                            const current = recipe?.rating ?? 0

                                            return (
                                                <Star
                                                    key={i}
                                                    onClick={() => void handleRate(value)}
                                                    className={cn(
                                                        "h-3.5 w-3.5 cursor-pointer transition",
                                                        loading && "pointer-events-none opacity-50",
                                                        value <= current
                                                            ? "text-yellow-400 fill-yellow-400"
                                                            : "text-muted-foreground/30 hover:text-yellow-300"
                                                    )}
                                                />
                                            )
                                        })}
                                    </div>

                                    {/* Favorite ❤️ */}
                                    <button
                                        onClick={() => void handleToggleFavorite()}
                                        className={cn(
                                            "ml-2 transition-all duration-150 hover:scale-110",
                                            isFavorite ? "text-red-500" : "text-muted-foreground/40 hover:text-red-400"
                                        )}
                                    >
                                        <Heart
                                            className={cn(
                                                "h-5 w-5 transition-all",
                                                isFavorite && "fill-red-500 text-red-500"
                                            )}
                                        />
                                    </button>

                                </div>

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

                                {recipe?.nutrition?.calories && (
                                    <div
                                        className={cn(
                                            "space-y-2.5 rounded-[var(--radius-xl)]",
                                            "border border-border/50 bg-secondary/30 p-3.5",
                                        )}
                                    >
                                        <p className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
                                            Nutrition
                                        </p>

                                        <div className="flex flex-wrap gap-1.5">
                                            <Badge variant="outline">
                                                {recipe.nutrition.calories} kcal
                                            </Badge>

                                            {recipe.nutrition.proteinContent && (
                                                <Badge variant="outline">
                                                    {recipe.nutrition.proteinContent}g protéines
                                                </Badge>
                                            )}

                                            {recipe.nutrition.carbohydrateContent && (
                                                <Badge variant="outline">
                                                    {recipe.nutrition.carbohydrateContent}g glucides
                                                </Badge>
                                            )}

                                            {recipe.nutrition.fatContent && (
                                                <Badge variant="outline">
                                                    {recipe.nutrition.fatContent}g lipides
                                                </Badge>
                                            )}

                                            {recipe.nutrition.fiberContent && (
                                                <Badge variant="outline">
                                                    {recipe.nutrition.fiberContent}g fibres
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

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