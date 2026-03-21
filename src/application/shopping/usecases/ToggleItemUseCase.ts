import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem } from "../../../domain/shopping/entities/ShoppingItem.ts"

export class ToggleItemUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  async execute(listId: string, item: ShoppingItem): Promise<ShoppingItem> {
    return this.repository.updateItem(listId, {
      id: item.id,
      shoppingListId: listId,
      checked: !item.checked,
      position: item.position,
      isFood: item.isFood,
      note: item.note,
      quantity: item.quantity,
      labelId: item.label?.id,
      display: item.display,
    })
  }
}
