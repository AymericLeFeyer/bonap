import type {
  IShoppingRepository,
  ShoppingRecipeEntry,
} from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import { recipeSlugStore } from "../../../infrastructure/shopping/RecipeSlugStore.ts"

interface RecipeEntry {
  recipeId: string
  recipeName: string
  recipeSlug: string
  /** Ratio portions souhaitées / portions de la recette. 1 si non renseigné. */
  servingsRatio?: number
}

export class AddRecipesToListUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  /**
   * Adds whole recipes to the list through Mealie's own endpoint, which expands
   * each recipe into its ingredients.
   *
   * Mealie applies `recipeIncrementQuantity` to every quantity, merges items
   * sharing a food and a unit (200 g + 300 g becomes 500 g), inherits each
   * item's label from its food, and records which recipes an item came from.
   * Building the items by hand here would lose all four, which is what the
   * previous note-based implementation did.
   *
   * Recipes appearing several times (the same dish on two days) are merged into
   * a single entry with the ratios summed, so Mealie receives one line per
   * recipe and the quantities still add up.
   */
  async execute(listId: string, entries: RecipeEntry[]): Promise<void> {
    if (entries.length === 0) return

    // Mémorise nom → slug pour la modale de détail de la liste de courses.
    for (const { recipeName, recipeSlug } of entries) {
      recipeSlugStore.set(recipeName, recipeSlug)
    }

    const byRecipe = new Map<string, ShoppingRecipeEntry>()
    for (const entry of entries) {
      if (!entry.recipeId) continue
      const ratio = entry.servingsRatio && entry.servingsRatio > 0 ? entry.servingsRatio : 1
      const existing = byRecipe.get(entry.recipeId)
      if (existing) existing.quantity += ratio
      else byRecipe.set(entry.recipeId, { recipeId: entry.recipeId, quantity: ratio })
    }

    await this.repository.addRecipes(listId, [...byRecipe.values()])
  }
}
