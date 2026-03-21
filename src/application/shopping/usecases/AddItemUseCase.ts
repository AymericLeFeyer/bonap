import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem } from "../../../domain/shopping/entities/ShoppingItem.ts"

export class AddItemUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  async execute(listId: string, note: string): Promise<ShoppingItem> {
    return this.repository.addItem(listId, {
      shoppingListId: listId,
      note,
      checked: false,
      isFood: false,
    })
  }
}
