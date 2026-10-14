import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react"
import type { NutritionEstimate, NutritionEstimateLine } from "../../domain/nutrition/entities/NutritionFood.ts"
import { Button } from "../components/ui/button.tsx"
import { NutritionCoverageBadge } from "../components/nutrition/NutritionBadges.tsx"
import { NutritionFoodEditor } from "../components/nutrition/NutritionFoodEditor.tsx"
import { useRecipe } from "../hooks/useRecipe.ts"
import { useNutritionFoods, type FoodEdit } from "../hooks/useNutritionFoods.ts"
import { useRecipeNutritionMapping } from "../hooks/useRecipeNutritionMapping.ts"

interface IngredientGroup {
  key: string
  labels: string[]
  grams: number | null
  line: NutritionEstimateLine
}

function groupLinesByFood(lines: NutritionEstimateLine[]): IngredientGroup[] {
  const groups = new Map<string, IngredientGroup>()
  for (const line of lines) {
    const group = groups.get(line.key)
    if (!group) {
      groups.set(line.key, { key: line.key, labels: [line.ingredient], grams: line.grams, line })
      continue
    }
    if (!group.labels.includes(line.ingredient)) group.labels.push(line.ingredient)
    group.grams = group.grams !== null && line.grams !== null ? group.grams + line.grams : group.grams ?? line.grams
    if (!group.line.reason && line.reason) group.line = line
  }
  return [...groups.values()]
}

function EstimateSummary({ estimate }: { estimate: NutritionEstimate }) {
  const { nutrition } = estimate
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">Aperçu par portion</p>
        <NutritionCoverageBadge coverage={estimate.coverage} />
      </div>
      <p className="text-xs text-muted-foreground">
        {estimate.estimatedGrams} g estimés sur {estimate.totalGrams} g · {estimate.servings} portion{estimate.servings > 1 ? "s" : ""} · {estimate.source}
      </p>
      <p className="text-sm">
        {[nutrition.calories, nutrition.proteinContent && `${nutrition.proteinContent} protéines`, nutrition.carbohydrateContent && `${nutrition.carbohydrateContent} glucides`, nutrition.fatContent && `${nutrition.fatContent} lipides`]
          .filter(Boolean)
          .join(" · ") || "Aucune valeur estimée"}
      </p>
    </div>
  )
}

export function NutritionMappingPage() {
  const { slug } = useParams<{ slug: string }>()
  const { recipe, setRecipe, loading, error } = useRecipe(slug)
  const { foods, savingKey, error: foodsError, reload: reloadFoods, updateFood } = useNutritionFoods()
  const mapping = useRecipeNutritionMapping(recipe, setRecipe)
  const groups = useMemo(() => groupLinesByFood(mapping.preview?.lines ?? []), [mapping.preview])
  const busy = mapping.completing || mapping.saving

  const handleComplete = async () => {
    if (await mapping.complete()) await reloadFoods()
  }

  const handleEdit = async (key: string, edit: FoodEdit) => {
    if (await updateFood(key, edit)) await mapping.refreshPreview()
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

  const displayedError = mapping.error || foodsError

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Nutrition</p>
          <h1 className="text-2xl font-semibold">Correspondances CIQUAL</h1>
          <p className="text-sm text-muted-foreground">{recipe.name}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/recipes/${recipe.slug}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Retour recette
            </Link>
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => void handleComplete()} disabled={busy} className="gap-1.5">
            {mapping.completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Compléter avec CIQUAL
          </Button>
          <Button type="button" size="sm" onClick={() => void mapping.save()} disabled={busy || groups.length === 0} className="gap-1.5">
            {mapping.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Recalculer et enregistrer
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {mapping.aiEnabled
          ? "L'IA choisit l'aliment CIQUAL des ingrédients ambigus et estime le poids des pièces. Elle ne fournit jamais de nutriments."
          : <>Sans IA, les ingrédients ambigus restent « à vérifier ». <Link to="/settings" className="underline">Configurer l'IA</Link></>}
        {" "}Chaque correction s'applique à toutes les recettes.
      </p>

      {displayedError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{displayedError}</p>
      )}

      {mapping.message && (
        <p className="rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          {mapping.message}
        </p>
      )}

      {mapping.preview && <EstimateSummary estimate={mapping.preview} />}

      {mapping.previewing && !mapping.preview && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calcul de l'aperçu...
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <NutritionFoodEditor
            key={group.key}
            foodKey={group.key}
            label={group.labels.join(" · ")}
            entry={foods[group.key] ?? null}
            reason={group.line.reason}
            grams={group.grams}
            saving={savingKey === group.key}
            onEdit={(edit) => void handleEdit(group.key, edit)}
          />
        ))}
      </div>
    </div>
  )
}
