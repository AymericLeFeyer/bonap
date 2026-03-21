import { useCallback, useEffect, useRef, useState } from "react"
import type { ShoppingItem, ShoppingLabel, ShoppingList, CustomItem } from "../../domain/shopping/entities/ShoppingItem.ts"
import type { ClearMode } from "../../application/shopping/usecases/ClearListUseCase.ts"
import {
  getShoppingItemsUseCase,
  addItemUseCase,
  addRecipesToListUseCase,
  toggleItemUseCase,
  deleteItemUseCase,
  clearListUseCase,
  customItemRepository,
  shoppingRepository,
} from "../../infrastructure/container.ts"

export function useShopping() {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [labels, setLabels] = useState<ShoppingLabel[]>([])
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addingRecipes, setAddingRecipes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref to prevent double-fetch in strict mode
  const initialized = useRef(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getShoppingItemsUseCase.execute()
      setList(result.list)
      setItems(result.items)
      setLabels(result.labels)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    setCustomItems(customItemRepository.getAll())
    void loadItems()
  }, [loadItems])

  const addItem = useCallback(async (note: string, quantity?: number, labelId?: string) => {
    if (!list) return
    await addItemUseCase.execute(list.id, note, quantity, labelId)
    const result = await getShoppingItemsUseCase.execute()
    setList(result.list)
    setItems(result.items)
    setLabels(result.labels)
  }, [list])

  const updateItemQuantity = useCallback(async (item: ShoppingItem, quantity: number) => {
    if (!list) return
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity } : i)))
    try {
      await shoppingRepository.updateItem(list.id, {
        id: item.id,
        shoppingListId: list.id,
        checked: item.checked,
        position: item.position,
        isFood: item.isFood,
        note: item.note,
        quantity,
        labelId: item.label?.id,
        display: item.display,
      })
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: item.quantity } : i)))
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour")
    }
  }, [list])

  const updateItemLabel = useCallback(async (item: ShoppingItem, labelId: string | undefined) => {
    if (!list) return
    const newLabel = labelId ? labels.find((l) => l.id === labelId) : undefined
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, label: newLabel } : i)))
    try {
      await shoppingRepository.updateItem(list.id, {
        id: item.id,
        shoppingListId: list.id,
        checked: item.checked,
        position: item.position,
        isFood: item.isFood,
        note: item.note,
        quantity: item.quantity,
        labelId: labelId || undefined,
        display: item.display,
      })
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, label: item.label } : i)))
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour")
    }
  }, [list, labels])

  const addRecipes = useCallback(async (recipeIds: string[]) => {
    if (!list) return
    setAddingRecipes(true)
    setError(null)
    try {
      await addRecipesToListUseCase.execute(list.id, recipeIds)
      // Reload items after adding (Mealie handles deduplication)
      const result = await getShoppingItemsUseCase.execute()
      setList(result.list)
      setItems(result.items)
      setLabels(result.labels)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout des recettes")
    } finally {
      setAddingRecipes(false)
    }
  }, [list])

  const toggleItem = useCallback(async (item: ShoppingItem) => {
    if (!list) return
    // Optimistic update: flip checked state immediately
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
    )
    try {
      await toggleItemUseCase.execute(list.id, item)
    } catch (err) {
      // Rollback on error
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i)),
      )
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour")
    }
  }, [list])

  const deleteItem = useCallback(async (itemId: string) => {
    if (!list) return
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    try {
      await deleteItemUseCase.execute(list.id, itemId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression")
      void loadItems()
    }
  }, [list, loadItems])

  const clearList = useCallback(async (mode: ClearMode) => {
    if (!list) return
    const snapshot = items
    if (mode === "checked") {
      setItems((prev) => prev.filter((i) => !i.checked))
    } else {
      setItems([])
    }
    try {
      await clearListUseCase.execute(list.id, snapshot, mode)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du vidage")
      void loadItems()
    }
  }, [list, items, loadItems])

  // Usual items (localStorage)
  const addCustomItem = useCallback((note: string) => {
    const item = customItemRepository.add(note)
    setCustomItems(customItemRepository.getAll())
    return item
  }, [])

  const toggleCustomItem = useCallback((id: string) => {
    customItemRepository.toggle(id)
    setCustomItems(customItemRepository.getAll())
  }, [])

  const deleteCustomItem = useCallback((id: string) => {
    customItemRepository.remove(id)
    setCustomItems(customItemRepository.getAll())
  }, [])

  const clearCustomItems = useCallback((mode: ClearMode) => {
    if (mode === "checked") {
      customItemRepository.removeChecked()
    } else {
      customItemRepository.removeAll()
    }
    setCustomItems(customItemRepository.getAll())
  }, [])

  const updateCustomItem = useCallback((id: string, note: string) => {
    customItemRepository.update(id, note)
    setCustomItems(customItemRepository.getAll())
  }, [])

  return {
    list,
    items,
    labels,
    customItems,
    loading,
    addingRecipes,
    error,
    addItem,
    addRecipes,
    toggleItem,
    updateItemQuantity,
    updateItemLabel,
    deleteItem,
    clearList,
    addCustomItem,
    toggleCustomItem,
    deleteCustomItem,
    clearCustomItems,
    updateCustomItem,
    reload: loadItems,
  }
}
