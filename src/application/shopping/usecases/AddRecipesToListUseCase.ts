import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"

export class AddRecipesToListUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  /**
   * Ajoute les ingrédients de plusieurs recettes à la liste.
   * Les appels sont séquentiels pour éviter de surcharger Mealie.
   */
  async execute(listId: string, recipeIds: string[]): Promise<void> {
    for (const recipeId of recipeIds) {
      await this.repository.addRecipeToList(listId, recipeId)
    }
  }
}
