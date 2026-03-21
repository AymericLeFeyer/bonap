import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"

export class AddRecipesToListUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  /**
   * Adds the ingredients of multiple recipes to the list.
   * Calls are sequential to avoid overloading Mealie.
   */
  async execute(listId: string, recipeIds: string[]): Promise<void> {
    for (const recipeId of recipeIds) {
      await this.repository.addRecipeToList(listId, recipeId)
    }
  }
}
