import type { IShoppingRepository } from "../../../domain/shopping/repositories/IShoppingRepository.ts"

export class AddItemUseCase {
  private repository: IShoppingRepository

  constructor(repository: IShoppingRepository) {
    this.repository = repository
  }

  async execute(listId: string, note: string, quantity?: number, labelId?: string): Promise<void> {
    await this.repository.addItem(listId, {
      shoppingListId: listId,
      note,
      checked: false,
      isFood: false,
      quantity: quantity && quantity > 0 ? quantity : undefined,
      labelId: labelId || undefined,
    })
  }
}
