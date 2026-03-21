import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useRecipesInfinite } from "../hooks/useRecipesInfinite.ts"
import { useCategories } from "../hooks/useCategories.ts"
import { useTags } from "../hooks/useTags.ts"
import { RecipeCard } from "../components/RecipeCard.tsx"
import { ImportRecipeDialog } from "../components/ImportRecipeDialog.tsx"
import { RecipeFormDialog } from "../components/RecipeFormDialog.tsx"
import { Badge } from "../components/ui/badge.tsx"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { Loader2, AlertCircle, UtensilsCrossed, Search, X, RotateCcw, Plus, PenLine } from "lucide-react"
import type { MealieRecipe } from "../../shared/types/mealie.ts"

const TIME_OPTIONS = [
  { label: "< 30 min", value: 30 },
  { label: "< 1h", value: 60 },
  { label: "1h+", value: undefined },
] as const

export function RecipesPage() {
  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [maxTotalTime, setMaxTotalTime] = useState<number | undefined>(undefined)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [newRecipeDialogOpen, setNewRecipeDialogOpen] = useState(false)
  const navigate = useNavigate()

  const sentinelRef = useRef<HTMLDivElement>(null)

  const { categories } = useCategories()
  const { tags } = useTags()

  const { recipes, loading, error, hasMore, loadMore } = useRecipesInfinite({
    search,
    categories: selectedCategories,
    tags: selectedTags,
    maxTotalTime,
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

  const handleTimeFilter = (value: number | undefined) => {
    setMaxTotalTime((prev) => (prev === value ? undefined : value))
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCategories.length > 0 ||
    selectedTags.length > 0 ||
    maxTotalTime !== undefined

  const resetFilters = () => {
    setSearch("")
    setSelectedCategories([])
    setSelectedTags([])
    setMaxTotalTime(undefined)
  }

  return (
    <div className="space-y-6">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 -mx-4 -mt-4 md:-mx-6 md:-mt-6 bg-background px-4 pt-4 md:px-6 md:pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Mes recettes</h1>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Réinitialiser
              </button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Importer</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setNewRecipeDialogOpen(true)}
              className="gap-1.5"
            >
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Nouvelle recette</span>
            </Button>
          </div>
        </div>

        {/* Barre de filtres */}
        <div className="space-y-3">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtre temps */}
          <div className="flex flex-wrap gap-1.5">
            {TIME_OPTIONS.filter((opt) => opt.value !== undefined).map((opt) => {
              const active = maxTotalTime === opt.value
              return (
                <Badge
                  key={opt.label}
                  variant={active ? "default" : "outline"}
                  className="cursor-pointer select-none transition-colors"
                  onClick={() => handleTimeFilter(opt.value)}
                >
                  {opt.label}
                </Badge>
              )
            })}
          </div>

          {/* Filtres catégories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const active = selectedCategories.includes(cat.slug)
                return (
                  <Badge
                    key={cat.id}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer select-none transition-colors"
                    onClick={() => toggleCategory(cat.slug)}
                  >
                    {cat.name}
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Filtres tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const active = selectedTags.includes(tag.slug)
                return (
                  <Badge
                    key={tag.id}
                    variant={active ? "secondary" : "outline"}
                    className="cursor-pointer select-none transition-colors"
                    onClick={() => toggleTag(tag.slug)}
                  >
                    {tag.name}
                  </Badge>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex flex-col items-center gap-2 py-24 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Etat vide */}
      {!loading && !error && recipes.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-24 text-muted-foreground">
          <UtensilsCrossed className="h-8 w-8" />
          <p className="text-sm">Aucune recette trouvée</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-1 text-sm underline underline-offset-2"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      )}

      {/* Grille */}
      {recipes.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      <ImportRecipeDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      <RecipeFormDialog
        open={newRecipeDialogOpen}
        onOpenChange={setNewRecipeDialogOpen}
        onSuccess={(recipe: MealieRecipe) => navigate(`/recipes/${recipe.slug}`)}
      />
    </div>
  )
}
