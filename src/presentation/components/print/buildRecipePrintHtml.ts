import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import { formatDuration } from "../../../shared/utils/duration.ts"
import { formatQuantity } from "../../../shared/utils/servings.ts"
import { formatUnit } from "../../../shared/utils/shoppingQuantity.ts"
import { escapeHtml } from "./printHtml.ts"

export interface RecipePrintOptions {
  /** Portions de base de la recette (Mealie). */
  baseServings?: number
  /** Portions choisies par l'utilisateur ; les quantités sont mises à l'échelle. */
  targetServings?: number
  /** URL de l'image à imprimer, omise si absente. */
  imageUrl?: string
}

/** Texte d'étape (markdown léger) → HTML sûr : échappement + retours à la ligne. */
function stepToHtml(text: string): string {
  return escapeHtml(text.replace(/\*\*(.+?)\*\*/g, "$1").trim()).replace(/\n/g, "<br>")
}

export function buildRecipePrintHtml(recipe: MealieRecipe, options: RecipePrintOptions = {}): string {
  const { baseServings, imageUrl } = options
  const targetServings = options.targetServings ?? baseServings
  const ratio =
    baseServings && baseServings > 0 && targetServings && targetServings > 0
      ? targetServings / baseServings
      : 1

  const meta = [
    recipe.prepTime && `Préparation : ${formatDuration(recipe.prepTime)}`,
    recipe.performTime && `Cuisson : ${formatDuration(recipe.performTime)}`,
    recipe.totalTime && `Total : ${formatDuration(recipe.totalTime)}`,
    targetServings && `${targetServings} portion${targetServings > 1 ? "s" : ""}`,
  ].filter(Boolean) as string[]

  const ingredients = (recipe.recipeIngredient ?? [])
    .map((ing) => {
      const scaled = ing.quantity ? ing.quantity * ratio : null
      const parts = [
        scaled != null ? `<strong>${escapeHtml(formatQuantity(scaled))}</strong>` : "",
        ing.unit ? escapeHtml(formatUnit(scaled ?? 1, ing.unit)) : "",
        ing.food?.name ? escapeHtml(ing.food.name) : "",
        ing.note ? `<span class="note">${ing.food?.name ? "— " : ""}${escapeHtml(ing.note)}</span>` : "",
      ].filter(Boolean)
      return parts.length > 0 ? `<li>${parts.join(" ")}</li>` : ""
    })
    .join("")

  const steps = (recipe.recipeInstructions ?? [])
    .filter((step) => step.text?.trim())
    .map(
      (step) =>
        `<li>${step.title ? `<p class="step-title">${escapeHtml(step.title)}</p>` : ""}${stepToHtml(step.text)}</li>`,
    )
    .join("")

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
  <title>${escapeHtml(recipe.name)}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 11pt; color: #111; margin: 0; line-height: 1.45; }
    @page { margin: 1.2cm 1.5cm; }
    h1 { font-size: 20pt; margin: 0 0 4px; }
    h2 { font-size: 13pt; margin: 1.2rem 0 0.5rem; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
    .meta { font-size: 9.5pt; color: #555; margin: 0 0 0.75rem; }
    .description { color: #333; margin: 0 0 0.75rem; }
    .header { display: flex; gap: 1rem; align-items: flex-start; }
    .header img { width: 5cm; height: 3.5cm; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    ul.ingredients { columns: 2; column-gap: 1.5rem; padding-left: 1.1rem; margin: 0; }
    ul.ingredients li { break-inside: avoid; margin-bottom: 2px; }
    .note { color: #666; font-size: 9.5pt; }
    ol.steps { padding-left: 1.3rem; margin: 0; }
    ol.steps li { margin-bottom: 0.6rem; break-inside: avoid; }
    .step-title { font-weight: bold; margin: 0 0 2px; }
  </style>
  </head><body>
  <div class="header">
    <div style="flex:1">
      <h1>${escapeHtml(recipe.name)}</h1>
      ${meta.length > 0 ? `<p class="meta">${meta.map(escapeHtml).join(" · ")}</p>` : ""}
      ${recipe.description ? `<p class="description">${escapeHtml(recipe.description)}</p>` : ""}
    </div>
    ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="">` : ""}
  </div>
  ${ingredients ? `<h2>Ingrédients</h2><ul class="ingredients">${ingredients}</ul>` : ""}
  ${steps ? `<h2>Préparation</h2><ol class="steps">${steps}</ol>` : ""}
  </body></html>`
}
