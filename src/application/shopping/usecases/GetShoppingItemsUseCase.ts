import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem, ShoppingLabel, ShoppingList } from "../../../domain/shopping/entities/ShoppingItem.ts"

export interface ShoppingData {
  list: ShoppingList
  items: ShoppingItem[]
  labels: ShoppingLabel[]
  habituelsListId: string
  habituelsItems: ShoppingItem[]
}

export class GetShoppingItemsUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  async execute(): Promise<ShoppingData> {
    const [defaultList, habituelsList] = await Promise.all([
      this.repository.getOrCreateDefaultList(),
      this.repository.getOrCreateHabituelsList(),
    ])

    const [{ items, labels }, { items: habituelsItems }] = await Promise.all([
      this.repository.getItems(defaultList.id),
      this.repository.getItems(habituelsList.id),
    ])

    return {
      list: defaultList,
      items,
      labels,
      habituelsListId: habituelsList.id,
      habituelsItems,
    }
  }
}
