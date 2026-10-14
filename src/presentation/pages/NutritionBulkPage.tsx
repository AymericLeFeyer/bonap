import { useMemo } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Loader2, Play, Square } from "lucide-react"
import type {
  BulkPhase,
  BulkProgress,
  BulkRecipeResult,
  BulkReport,
} from "../../application/nutrition/usecases/CompleteAllRecipesNutritionUseCase.ts"
import { coverageLevel, type CoverageLevel } from "../../shared/utils/nutritionCoverage.ts"
import { Button } from "../components/ui/button.tsx"
import { NutritionCoverageBadge } from "../components/nutrition/NutritionBadges.tsx"
import { NutritionFoodEditor } from "../components/nutrition/NutritionFoodEditor.tsx"
import { useCompleteAllRecipesNutrition } from "../hooks/useCompleteAllRecipesNutrition.ts"
import { useNutritionFoods } from "../hooks/useNutritionFoods.ts"

const PHASE_LABELS: Record<BulkPhase, string> = {
  loading: "Chargement des recettes",
  classifying: "Classification des ingrédients distincts",
  saving: "Calcul et enregistrement",
}

const LEVEL_LABELS: Record<CoverageLevel, string> = {
  reliable: "Fiables",
  partial: "Partielles",
  unreliable: "Non fiables",
}

function ProgressBar({ progress }: { progress: BulkProgress }) {
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{PHASE_LABELS[progress.phase]}</span>
        <span>{progress.done} / {progress.total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function countByLevel(recipes: BulkRecipeResult[]): Record<CoverageLevel, number> {
  const counts: Record<CoverageLevel, number> = { reliable: 0, partial: 0, unreliable: 0 }
  for (const recipe of recipes) {
    if (recipe.coverage !== null) counts[coverageLevel(recipe.coverage)] += 1
  }
  return counts
}

function ReportSummary({ report }: { report: BulkReport }) {
  const counts = useMemo(() => countByLevel(report.recipes), [report])
  const computed = report.recipes.filter((recipe) => recipe.coverage !== null).length
  const failed = report.recipes.filter((recipe) => recipe.error)

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card px-4 py-4">
      <p className="text-sm font-semibold">
        Bilan{report.cancelled ? " (traitement annulé, les recettes déjà enregistrées le restent)" : ""}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg bg-secondary/40 px-3 py-2">
          <p className="text-lg font-semibold">{computed}</p>
          <p className="text-xs text-muted-foreground">Recettes calculées</p>
        </div>
        {(Object.keys(LEVEL_LABELS) as CoverageLevel[]).map((level) => (
          <div key={level} className="rounded-lg bg-secondary/40 px-3 py-2">
            <p className="text-lg font-semibold">{counts[level]}</p>
            <p className="text-xs text-muted-foreground">{LEVEL_LABELS[level]}</p>
          </div>
        ))}
      </div>
      {failed.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">{failed.length} recette{failed.length > 1 ? "s" : ""} non enregistrée{failed.length > 1 ? "s" : ""}</summary>
          <ul className="mt-2 space-y-1">
            {failed.map((recipe) => (
              <li key={recipe.slug}>
                <Link to={`/recipes/${recipe.slug}/nutrition`} className="underline">{recipe.name}</Link>
                <span className="text-muted-foreground"> — {recipe.error}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {computed > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Détail par recette</summary>
          <ul className="mt-2 space-y-1">
            {report.recipes.filter((recipe) => recipe.coverage !== null).map((recipe) => (
              <li key={recipe.slug} className="flex flex-wrap items-center gap-2">
                <Link to={`/recipes/${recipe.slug}/nutrition`} className="underline">{recipe.name}</Link>
                <NutritionCoverageBadge coverage={recipe.coverage ?? 0} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export function NutritionBulkPage() {
  const bulk = useCompleteAllRecipesNutrition()
  const { foods, savingKey, error: foodsError, reload: reloadFoods, updateFood } = useNutritionFoods()

  const handleStart = async () => {
    await bulk.start()
    await reloadFoods()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Nutrition</p>
          <h1 className="text-2xl font-semibold">Compléter toutes les recettes avec CIQUAL</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Paramètres
          </Link>
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 bg-card px-4 py-4 text-sm">
        <p>
          Chaque ingrédient distinct n'est classé qu'une fois, puis la nutrition de chaque recette est
          recalculée par portion et enregistrée dans Mealie avec sa couverture.
        </p>
        <p className="text-xs text-muted-foreground">
          {bulk.aiEnabled
            ? "IA activée : les ingrédients ambigus sont soumis par lots de 10 à votre fournisseur IA."
            : <>IA désactivée : davantage d'ingrédients resteront « à vérifier ». <Link to="/settings" className="underline">Paramètres</Link></>}
        </p>
        <div className="flex gap-2">
          {bulk.running ? (
            <Button type="button" variant="outline" onClick={bulk.cancel} className="gap-1.5">
              <Square className="h-4 w-4" />
              Annuler
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleStart()} className="gap-1.5">
              <Play className="h-4 w-4" />
              {bulk.report ? "Relancer" : "Lancer"}
            </Button>
          )}
          {bulk.running && <Loader2 className="h-4 w-4 self-center animate-spin text-muted-foreground" />}
        </div>
        {bulk.progress && bulk.running && <ProgressBar progress={bulk.progress} />}
      </div>

      {(bulk.error || foodsError) && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{bulk.error || foodsError}</p>
      )}

      {bulk.report && <ReportSummary report={bulk.report} />}

      {bulk.report && bulk.report.toReview.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Ingrédients à vérifier ({bulk.report.toReview.length})</p>
            <p className="text-xs text-muted-foreground">
              Corrigez-les ici puis relancez le traitement pour mettre à jour les recettes concernées.
            </p>
          </div>
          {bulk.report.toReview.map((item) => (
            <NutritionFoodEditor
              key={item.key}
              foodKey={item.key}
              label={item.label}
              entry={foods[item.key] ?? null}
              reason={item.reason}
              detail={
                <p className="text-xs text-muted-foreground">
                  {item.recipes.length} recette{item.recipes.length > 1 ? "s" : ""} : {item.recipes.slice(0, 3).join(", ")}
                  {item.recipes.length > 3 ? "…" : ""}
                </p>
              }
              saving={savingKey === item.key}
              onEdit={(edit) => void updateFood(item.key, edit)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
