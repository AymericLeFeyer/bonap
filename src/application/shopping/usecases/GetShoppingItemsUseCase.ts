import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem, ShoppingLabel, ShoppingList } from "../../../domain/shopping/entities/ShoppingItem.ts"

export class GetShoppingItemsUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  async execute(): Promise<{ list: ShoppingList; items: ShoppingItem[]; labels: ShoppingLabel[] }> {
    const list = await this.repository.getOrCreateDefaultList()
    const { items, labels } = await this.repository.getItems(list.id)
    return { list, items, labels }
  }
}
