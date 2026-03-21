import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem, ShoppingList } from "../../../domain/shopping/entities/ShoppingItem.ts"

export class GetShoppingItemsUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  async execute(): Promise<{ list: ShoppingList; items: ShoppingItem[] }> {
    const list = await this.repository.getOrCreateDefaultList()
    const items = await this.repository.getItems(list.id)
    return { list, items }
  }
}
