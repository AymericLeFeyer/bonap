import { useState } from "react"
import { Link } from "react-router-dom"
import { CookingPot, Loader2, Minus, Plus, Sparkles, Trash2 } from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { useBatchRecipes } from "../hooks/useBatchRecipes.ts"
import { useUpcomingBatchMeals } from "../hooks/useUpcomingBatchMeals.ts"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"
import type { MealieRecipe } from "../../shared/types/mealie.ts"
import {
  BATCH_LOCATIONS, BATCH_LOCATION_LABELS, addToStock, expiryStatus, getBatchInfo,
  normalizeStock, stockCount, takeFromStock,
  type BatchInfo, type BatchLocation, type BatchStockEntry,
} from "../../shared/utils/batch.ts"
import { formatDate, formatDayFr } from "../../shared/utils/date.ts"
import { RecipeImage } from "../components/RecipeImage.tsx"
import { BatchStockLine } from "../components/batch/BatchStockLine.tsx"
import { BatchAddStockForm } from "../components/batch/BatchAddStockForm.tsx"
import { BatchLocationIcon } from "../components/batch/BatchLocationIcon.tsx"
import { BatchAiDialog } from "../components/batch/BatchAiDialog.tsx"
import { MealBatchBadge } from "../components/planning/MealBatchBadge.tsx"
import { cn } from "../../lib/utils.ts"

const ENTRY_LABELS: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
}

type UpdateBatch = (slug: string, update: (current: BatchInfo) => BatchInfo) => Promise<unknown>

const sectionClass = "space-y-3 rounded-[var(--radius-2xl)] border border-border/50 bg-card p-4"

function StockSection({
  location,
  recipes,
  updateBatch,
}: {
  location: BatchLocation
  recipes: MealieRecipe[]
  updateBatch: UpdateBatch
}) {
  const today = formatDate(new Date())
  const rows = recipes
    .flatMap((recipe) => {
      const info = getBatchInfo(recipe)
      return info.stock
        .filter((e) => e.location === location)
        .map((entry) => ({ recipe, info, entry, expiry: expiryStatus(entry, info, today).expiry }))
    })
    .sort((a, b) => (a.expiry ?? "9999").localeCompare(b.expiry ?? "9999"))
  const total = rows.reduce((sum, r) => sum + r.entry.count, 0)

  const remove = (recipe: MealieRecipe, entry: BatchStockEntry) =>
    updateBatch(recipe.slug, (current) => ({
      ...current,
      stock: normalizeStock(current.stock.filter((e) => !(e.location === entry.location && e.preparedAt === entry.preparedAt))),
    }))

  return (
    <section className={sectionClass}>
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
        <BatchLocationIcon location={location} className="h-4 w-4" />
        {BATCH_LOCATION_LABELS[location]}
        <span className="text-sm font-normal text-muted-foreground">
          · {total} {total > 1 ? "plats" : "plat"}
        </span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Rien {location === "freezer" ? "au congélateur" : "au frigo"}.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {rows.map(({ recipe, info, entry }) => (
            <li key={`${recipe.id}:${entry.preparedAt}`} className="flex items-center gap-3 py-2">
              <RecipeImage
                recipe={recipe}
                alt={recipe.name}
                className="h-10 w-10 shrink-0 rounded-[var(--radius-md)] object-cover"
                fallbackClassName="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
              />
              <div className="min-w-0 flex-1">
                <Link to={`/recipes/${recipe.slug}`} className="block truncate text-sm font-semibold hover:underline">
                  {recipe.name}
                </Link>
                <BatchStockLine
                  entry={entry}
                  info={info}
                  actions={(
                    <>
                      <button
                        type="button"
                        onClick={() => void updateBatch(recipe.slug, (current) => ({
                          ...current,
                          stock: takeFromStock(current.stock, entry.location, entry.preparedAt).stock,
                        }))}
                        title="Un plat consommé"
                        className="rounded border border-border/60 p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateBatch(recipe.slug, (current) => ({
                          ...current,
                          stock: addToStock(current.stock, { ...entry, count: 1 }),
                        }))}
                        title="Un plat de plus"
                        className="rounded border border-border/60 p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(recipe, entry)}
                        title="Retirer du stock"
                        className="rounded border border-border/60 p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function BatchRecipeRow({ recipe, updateBatch }: { recipe: MealieRecipe; updateBatch: UpdateBatch }) {
  const [adding, setAdding] = useState(false)
  const info = getBatchInfo(recipe)
  const freezer = stockCount(info.stock, "freezer")
  const fridge = stockCount(info.stock, "fridge")
  const durations = [
    info.fridgeDays ? `frigo ${info.fridgeDays} j` : null,
    info.freezerDays ? `congélateur ${info.freezerDays} j` : null,
  ].filter(Boolean).join(" · ")

  return (
    <li className="space-y-2 py-2">
      <div className="flex items-center gap-3">
        <RecipeImage
          recipe={recipe}
          alt={recipe.name}
          className="h-10 w-10 shrink-0 rounded-[var(--radius-md)] object-cover"
          fallbackClassName="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
        />
        <div className="min-w-0 flex-1">
          <Link to={`/recipes/${recipe.slug}`} className="block truncate text-sm font-semibold hover:underline">
            {recipe.name}
          </Link>
          <p className={cn("text-xs", durations ? "text-muted-foreground" : "italic text-amber-700 dark:text-amber-400")}>
            {durations || "Durées de conservation à renseigner sur la fiche"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
          {freezer > 0 && <span className="flex items-center gap-0.5"><BatchLocationIcon location="freezer" className="h-3 w-3" />{freezer}</span>}
          {fridge > 0 && <span className="flex items-center gap-0.5"><BatchLocationIcon location="fridge" className="h-3 w-3" />{fridge}</span>}
          <Button variant={adding ? "secondary" : "outline"} size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Stock
          </Button>
        </div>
      </div>
      {adding && (
        <div className="pl-[52px]">
          <BatchAddStockForm
            onAdd={async (entry) => {
              await updateBatch(recipe.slug, (current) => ({ ...current, stock: addToStock(current.stock, entry) }))
              setAdding(false)
            }}
          />
        </div>
      )}
    </li>
  )
}

export function BatchPage() {
  const { recipes, loading, error, updateBatch } = useBatchRecipes()
  const { meals: upcoming, loading: upcomingLoading } = useUpcomingBatchMeals()
  const [aiOpen, setAiOpen] = useState(false)
  const aiAvailable = llmConfigService.isConfigured()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Batch cooking</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Les plats préparés à l'avance, au congélateur et au frigo. Ils se planifient depuis
            l'onglet « Batch » à l'ajout d'un repas.
          </p>
        </div>
        {aiAvailable && (
          <Button variant="outline" size="sm" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Détecter avec l'IA
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-[var(--radius-2xl)] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <CookingPot className="mx-auto mb-2 h-6 w-6" />
          Aucune recette batch pour l'instant. Marquez-en depuis la fiche d'une recette
          {aiAvailable ? ", ou laissez l'IA repérer celles qui s'y prêtent." : "."}
        </div>
      ) : (
        <>
          {(upcomingLoading || upcoming.length > 0) && (
            <section className={sectionClass}>
              <h2 className="font-heading text-lg font-semibold">Prévus au planning</h2>
              {upcomingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <ul className="divide-y divide-border/50">
                  {upcoming.map((meal) => (
                    <li key={meal.id} className="flex items-center gap-3 py-2">
                      <div className="w-28 shrink-0 text-xs">
                        <p className="font-semibold capitalize">{formatDayFr(meal.date)}</p>
                        <p className="text-muted-foreground">{ENTRY_LABELS[meal.entryType] ?? meal.entryType}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{meal.recipe?.name ?? meal.title ?? "Sans titre"}</p>
                        <MealBatchBadge meal={meal} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {BATCH_LOCATIONS.map((location) => (
              <StockSection key={location} location={location} recipes={recipes} updateBatch={updateBatch} />
            ))}
          </div>

          <section className={sectionClass}>
            <h2 className="font-heading text-lg font-semibold">
              Recettes batch <span className="text-sm font-normal text-muted-foreground">· {recipes.length}</span>
            </h2>
            <ul className="divide-y divide-border/50">
              {recipes.map((recipe) => (
                <BatchRecipeRow key={recipe.id} recipe={recipe} updateBatch={updateBatch} />
              ))}
            </ul>
          </section>
        </>
      )}

      <BatchAiDialog open={aiOpen} onOpenChange={setAiOpen} applyBatch={updateBatch} />
    </div>
  )
}
