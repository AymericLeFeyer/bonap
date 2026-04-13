import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, Loader2, Search } from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { useRecipe } from "../hooks/useRecipe.ts"
import { useUpdateNutrition } from "../hooks/useUpdateNutrition.ts"
import {
  estimateRecipeNutrition,
  searchCiqualFoods,
  type CiqualFoodOption,
  type NutritionEstimateResult,
} from "../../infrastructure/nutrition/estimateRecipeNutrition.ts"
import type { RecipeFormIngredient } from "../../shared/types/mealie.ts"

type IngredientRow = {
  id: string
  key: string
  display: string
  payload: RecipeFormIngredient
}

function quantityToString(quantity?: number): string {
  if (quantity == null) return ""
  return String(quantity)
}

export function NutritionMappingPage() {
  const { slug } = useParams<{ slug: string }>()
  const { recipe, setRecipe, loading, error } = useRecipe(slug)
  const { updateNutrition, loading: savingNutrition, error: savingError } = useUpdateNutrition()

  const [selectedCiqual, setSelectedCiqual] = useState<Record<string, string>>({})
  const [searchText, setSearchText] = useState<Record<string, string>>({})
  const [optionsByRow, setOptionsByRow] = useState<Record<string, CiqualFoodOption[]>>({})
  const [loadingSearchByRow, setLoadingSearchByRow] = useState<Record<string, boolean>>({})
  const [estimate, setEstimate] = useState<NutritionEstimateResult | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const ingredientRows = useMemo<IngredientRow[]>(() => {
    if (!recipe?.recipeIngredient?.length) return []

    return recipe.recipeIngredient
      .map((ing, index) => {
        const food = (ing.food?.name || "").trim()
        const note = (ing.note || "").trim()
        const key = food || note
        if (!key) return null

        const qty = quantityToString(ing.quantity)
        const unit = (ing.unit?.name || "").trim()
        const display = [qty, unit, key].filter(Boolean).join(" ").trim()

        return {
          id: `${ing.referenceId || index}-${key}`,
          key,
          display,
          payload: {
            quantity: qty,
            unit,
            food,
            note,
          },
        }
      })
      .filter((row): row is IngredientRow => row !== null)
  }, [recipe])

  const runCiqualSearch = async (row: IngredientRow) => {
    const query = (searchText[row.id] || selectedCiqual[row.key] || row.key).trim()
    if (!query) return

    setLoadingSearchByRow((prev) => ({ ...prev, [row.id]: true }))
    setLocalError(null)

    try {
      const items = await searchCiqualFoods(query, 12)
      setOptionsByRow((prev) => ({ ...prev, [row.id]: items }))
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Impossible de rechercher dans CIQUAL")
    } finally {
      setLoadingSearchByRow((prev) => ({ ...prev, [row.id]: false }))
    }
  }

  const estimateAndSave = async () => {
    if (!recipe || !slug || ingredientRows.length === 0) return

    setEstimating(true)
    setLocalError(null)
    setMessage(null)

    try {
      const hints: Record<string, string> = {}
      for (const row of ingredientRows) {
        const selected = selectedCiqual[row.key]?.trim()
        if (selected) hints[row.key] = selected
      }

      const result = await estimateRecipeNutrition(
        ingredientRows.map((row) => row.payload),
        hints,
      )
      setEstimate(result)

      const updated = await updateNutrition(
        slug,
        result.nutrition,
        result.source,
        result.ciqualMappings,
      )
      if (updated) {
        setRecipe(updated)
        setMessage("Nutrition mise à jour avec succès.")
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Erreur pendant le recalcul nutrition")
    } finally {
      setEstimating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de la recette...
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{error || "Recette introuvable"}</p>
        <Link to="/recipes" className="text-sm underline">Retour aux recettes</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Nutrition</p>
          <h1 className="text-2xl font-semibold">Compléter les correspondances CIQUAL</h1>
          <p className="text-sm text-muted-foreground">{recipe.name}</p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/recipes/${recipe.slug}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Retour recette
            </Link>
          </Button>
          <Button
            type="button"
            onClick={() => void estimateAndSave()}
            disabled={estimating || savingNutrition || ingredientRows.length === 0}
            className="gap-1.5"
          >
            {estimating || savingNutrition ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Recalculer et enregistrer
          </Button>
        </div>
      </div>

      {(localError || savingError) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {localError || savingError}
        </p>
      )}

      {message && (
        <p className="rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <div className="space-y-3">
        {ingredientRows.map((row) => (
          <div key={row.id} className="space-y-2 rounded-xl border border-border/60 bg-card px-3 py-3">
            <p className="text-sm font-medium">{row.display}</p>

            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                value={searchText[row.id] ?? selectedCiqual[row.key] ?? row.key}
                onChange={(e) => setSearchText((prev) => ({ ...prev, [row.id]: e.target.value }))}
                placeholder="Rechercher un aliment CIQUAL"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void runCiqualSearch(row)}
                disabled={!!loadingSearchByRow[row.id]}
              >
                {loadingSearchByRow[row.id] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Rechercher
              </Button>
            </div>

            {selectedCiqual[row.key] && (
              <p className="text-xs text-muted-foreground">Sélection actuelle: {selectedCiqual[row.key]}</p>
            )}

            {optionsByRow[row.id]?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {optionsByRow[row.id].map((option) => (
                  <button
                    key={`${row.id}-${option.code}`}
                    type="button"
                    onClick={() => {
                      setSelectedCiqual((prev) => ({ ...prev, [row.key]: option.name }))
                      setSearchText((prev) => ({ ...prev, [row.id]: option.name }))
                    }}
                    className="rounded-full border border-border bg-background px-2 py-1 text-xs hover:bg-secondary"
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {estimate && (
        <div className="space-y-2 rounded-xl border border-border/60 bg-card px-3 py-3">
          <p className="text-sm font-semibold">Dernière estimation</p>
          <p className="text-xs text-muted-foreground">
            {estimate.source} · {estimate.matchedCount} pris en compte · {estimate.unmatchedCount} non pris en compte
          </p>
          <div className="flex flex-wrap gap-1.5">
            {estimate.matches.slice(0, 12).map((item, idx) => (
              <span key={`${item.ingredient}-${idx}`} className="rounded-full border border-emerald-300/40 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                {item.ingredient}{" -> "}{item.ciqualFood}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
