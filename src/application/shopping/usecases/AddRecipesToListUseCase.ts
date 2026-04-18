import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { MealieIngredient } from "../../../shared/types/mealie.ts"
import { foodLabelStore } from "../../../infrastructure/shopping/FoodLabelStore.ts"
import { recipeSlugStore } from "../../../infrastructure/shopping/RecipeSlugStore.ts"
import { extractFoodKey } from "../../../shared/utils/food.ts"

interface RecipeEntry {
  recipeName: string
  recipeSlug: string
  ingredients: MealieIngredient[]
  date?: string
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
   */
  async execute(listId: string, entries: RecipeEntry[]): Promise<void> {
    // Save name → slug for later use in the recipe detail modal
    for (const { recipeName, recipeSlug } of entries) {
      recipeSlugStore.set(recipeName, recipeSlug)
    }

    const items = entries.flatMap(({ recipeName, ingredients, date }) => {
      const dayLabel = date
        ? new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long" })
        : undefined
      const recipeSuffix = dayLabel ? `${recipeName} (${dayLabel})` : recipeName
      return ingredients
        .map((ing) => ing.food?.name ?? ing.note ?? ing.originalText)
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
