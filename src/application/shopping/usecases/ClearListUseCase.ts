import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"
import type { ShoppingItem } from "../../../domain/shopping/entities/ShoppingItem.ts"

export type ClearMode = "checked" | "all"

export class ClearListUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  async execute(listId: string, items: ShoppingItem[], mode: ClearMode): Promise<void> {
    if (mode === "checked") {
      await this.repository.deleteCheckedItems(listId, items)
    } else {
      await this.repository.deleteAllItems(listId, items)
    }
  }
}
