import type { ICustomItemRepository } from "../../domain/shopping/repositories/ICustomItemRepository.ts"
import type { CustomItem } from "../../domain/shopping/entities/ShoppingItem.ts"

const STORAGE_KEY = "bonap_custom_items"

function loadItems(): CustomItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CustomItem[]
  } catch {
    return []
  }
}

function saveItems(items: CustomItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export class CustomItemRepository implements ICustomItemRepository {
  getAll(): CustomItem[] {
    return loadItems()
  }

  add(note: string): CustomItem {
    const items = loadItems()
    const item: CustomItem = { id: generateId(), note: note.trim(), checked: false }
    const updated = [...items, item]
    saveItems(updated)
    return item
  }

  toggle(id: string): CustomItem | null {
    const items = loadItems()
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return null
    items[idx] = { ...items[idx], checked: !items[idx].checked }
    saveItems(items)
    return items[idx]
  }

  remove(id: string): void {
    const items = loadItems().filter((i) => i.id !== id)
    saveItems(items)
  }

  removeChecked(): void {
    const items = loadItems().filter((i) => !i.checked)
    saveItems(items)
  }

  removeAll(): void {
    saveItems([])
  }

  update(id: string, note: string): CustomItem | null {
    const items = loadItems()
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) return null
    items[idx] = { ...items[idx], note: note.trim() }
    saveItems(items)
    return items[idx]
  }
}
