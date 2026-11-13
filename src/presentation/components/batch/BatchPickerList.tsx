import { Link } from "react-router-dom"
import { CookingPot, Loader2 } from "lucide-react"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import {
  expiryStatus, getBatchInfo, type BatchStockEntry,
} from "../../../shared/utils/batch.ts"
import { formatDate } from "../../../shared/utils/date.ts"
import { useBatchRecipes } from "../../hooks/useBatchRecipes.ts"
import { RecipeImage } from "../RecipeImage.tsx"
import { BatchStockLine } from "./BatchStockLine.tsx"

/**
 * Onglet « Batch » du choix de repas : les plats préparés en stock, du plus
 * urgent au moins urgent. Choisir une ligne planifie ce plat précis.
 */
export function BatchPickerList({
  onSelect,
}: {
  onSelect: (recipe: MealieRecipe, entry: BatchStockEntry) => void
}) {
  const { recipes, loading, error } = useBatchRecipes()
  const today = formatDate(new Date())

  const rows = recipes
    .flatMap((recipe) => {
      const info = getBatchInfo(recipe)
      return info.stock.map((entry) => ({ recipe, info, entry, ...expiryStatus(entry, info, today) }))
    })
    // Les plats qui expirent le plus tôt d'abord ; sans durée connue, à la fin.
    .sort((a, b) => (a.expiry ?? "9999").localeCompare(b.expiry ?? "9999"))

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (error) return <p className="py-8 text-center text-sm text-destructive">{error}</p>
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <CookingPot className="h-8 w-8" />
        <p className="text-sm">Aucun plat batch en stock.</p>
        <p className="max-w-xs text-center text-xs">
          Ajoutez les plats préparés depuis la fiche d'une recette batch ou la page{" "}
          <Link to="/batch" className="font-medium text-primary hover:underline">Batch cooking</Link>.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5 p-1">
      {rows.map(({ recipe, info, entry }) => (
        <li key={`${recipe.id}:${entry.location}:${entry.preparedAt}`}>
          <button
            type="button"
            onClick={() => onSelect(recipe, entry)}
            className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-border/50 p-2 text-left transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RecipeImage
              recipe={recipe}
              alt={recipe.name}
              className="h-12 w-12 shrink-0 rounded-[var(--radius-md)] object-cover"
              fallbackClassName="h-12 w-12 shrink-0 rounded-[var(--radius-md)]"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{recipe.name}</p>
              <BatchStockLine entry={entry} info={info} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}
