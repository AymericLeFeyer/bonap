import type { ShoppingItem } from "../../../domain/shopping/entities/ShoppingItem.ts"

export function itemSortKey(item: ShoppingItem): string {
  const note = item.note?.split(" — ")[0] ?? ""
  return (item.foodName ?? note).toLowerCase()
}
