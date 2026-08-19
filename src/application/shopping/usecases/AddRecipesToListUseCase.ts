import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { MealieIngredient } from "../../../shared/types/mealie.ts"
import { foodLabelStore } from "../../../infrastructure/shopping/FoodLabelStore.ts"
import { recipeSlugStore } from "../../../infrastructure/shopping/RecipeSlugStore.ts"
import { extractFoodKey } from "../../../shared/utils/food.ts"
import { formatQuantity } from "../../../shared/utils/servings.ts"

interface RecipeEntry {
  recipeName: string
  recipeSlug: string
  ingredients: MealieIngredient[]
  date?: string
  /**
   * Scaling factor for this entry: targetServings / baseServings.
   * Defaults to 1 (no scaling). Quantities below are multiplied only when the
   * ingredient has both a numeric quantity AND a unit, to avoid displays like
   * "3 1 cup flour" (Mealie FAQ pitfall).
   */
  servingsRatio?: number
}

/** Build the human-readable display for a (potentially scaled) ingredient line. */
function formatIngredientLine(ing: MealieIngredient, ratio: number): string | undefined {
  const food = ing.food?.name?.trim()
  const unit = ing.unit?.name?.trim()
  const baseQty = ing.quantity

  // Scale when we have a numeric quantity AND at least one of unit/food, so we
  // can form a coherent line. Without either we'd produce a bare "2" so we
  // fallback to the raw display text instead.
  const canScale = typeof baseQty === "number" && baseQty > 0 && Boolean(unit || food)
  if (canScale) {
    const scaled = formatQuantity(baseQty * ratio)
    const parts = [scaled, unit, food].filter(Boolean) as string[]
    if (parts.length > 1) return parts.join(" ")
  }

  // Fallback chain: structured food name > free-text note > original parsed text.
  return food || ing.note?.trim() || ing.originalText?.trim() || undefined
}

export class AddRecipesToListUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  /**
   * Adds the ingredients of multiple recipes to the list as plain note items.
   * Each ingredient appears once per recipe with the recipe name appended,
   * so duplicates across meals are kept separate (no quantity merging).
   * Applies saved label from the food reference if available.
   * Quantities are scaled by `servingsRatio` when both quantity and unit are
   * present; unstructured ingredients fall back to the raw display text.
   */
  async execute(listId: string, entries: RecipeEntry[]): Promise<void> {
    // Save name → slug for later use in the recipe detail modal
    for (const { recipeName, recipeSlug } of entries) {
      recipeSlugStore.set(recipeName, recipeSlug)
    }

    const items = entries.flatMap(({ recipeName, ingredients, date, servingsRatio }) => {
      const ratio = servingsRatio && servingsRatio > 0 ? servingsRatio : 1
      const dayLabel = date
        ? new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long" })
        : undefined
      const recipeSuffix = dayLabel ? `${recipeName} (${dayLabel})` : recipeName
      return ingredients
        .map((ing) => formatIngredientLine(ing, ratio))
        .filter((display): display is string => Boolean(display?.trim()))
        .map((display) => {
          const foodKey = extractFoodKey(display)
          const labelId = foodKey ? foodLabelStore.lookup(foodKey) : undefined
          return {
            shoppingListId: listId,
            isFood: false,
            note: `${display} — ${recipeSuffix}`,
            labelId,
          }
        })
    })
    await this.repository.addItems(listId, items)
  }
}
