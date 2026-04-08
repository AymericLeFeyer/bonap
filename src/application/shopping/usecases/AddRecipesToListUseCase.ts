import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import { recipeSlugStore } from "../../../infrastructure/shopping/RecipeSlugStore.ts"

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
   */
  async execute(listId: string, entries: MealieRecipe[]): Promise<void> {
    // Save name → slug for later use in recipe detail modal
    for (const recipe of entries) {
      recipeSlugStore.set(recipe.name, recipe.slug)
    }

    const items = entries
      .flatMap((recipe) => {
        const ingredients = recipe.recipeIngredient ?? []

        return ingredients.map((ing) => {
          return {
            quantity: ing.quantity,
            shoppingListId: listId,
            isFood: Boolean(ing.food?.id),
            unitId: ing.unit?.id,
            recipeReferences: [
              {
                recipeId: recipe.id,
                recipeQuantity: 1,
                recipeScale: 1,
                recipeNote: recipe.name,
              },
            ]
          }
        })
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    await this.repository.addItems(listId, items)
  }
}