import type { CustomItem } from "../entities/ShoppingItem.ts"

export interface ICustomItemRepository {
  getAll(): CustomItem[]
  add(note: string): CustomItem
  toggle(id: string): CustomItem | null
  remove(id: string): void
  removeChecked(): void
  removeAll(): void
  update(id: string, note: string): CustomItem | null
}
