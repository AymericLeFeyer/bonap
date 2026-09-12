import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { toItemUpdate } from "../../../shared/utils/shoppingItemUpdate.ts"

export class ToggleItemUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  async execute(listId: string, item: ShoppingItem): Promise<ShoppingItem> {
    return this.repository.updateItem(listId, toItemUpdate(item, listId, { checked: !item.checked }))
  }
}
