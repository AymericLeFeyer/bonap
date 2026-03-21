import { useCallback, useEffect, useRef, useState } from "react"
import type { ShoppingItem, ShoppingLabel, ShoppingList } from "../../domain/shopping/entities/ShoppingItem.ts"
import type { ClearMode } from "../../application/shopping/usecases/ClearListUseCase.ts"
import {
  getShoppingItemsUseCase,
  addItemUseCase,
  addRecipesToListUseCase,
  toggleItemUseCase,
  deleteItemUseCase,
  clearListUseCase,
  shoppingRepository,
} from "../../infrastructure/container.ts"

export function useShopping() {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [labels, setLabels] = useState<ShoppingLabel[]>([])
  const [habituelsListId, setHabituelsListId] = useState<string | null>(null)
  const [habituelsItems, setHabituelsItems] = useState<ShoppingItem[]>([])
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
      setHabituelsListId(result.habituelsListId)
      setHabituelsItems(result.habituelsItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
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

  // ── Habituels (Mealie "Habituels" list) ─────────────────────────────────────

  const addHabituel = useCallback(async (note: string, labelId?: string) => {
    if (!habituelsListId) return
    await shoppingRepository.addItem(habituelsListId, {
      shoppingListId: habituelsListId,
      note,
      isFood: false,
      labelId,
    })
    const result = await getShoppingItemsUseCase.execute()
    setHabituelsListId(result.habituelsListId)
    setHabituelsItems(result.habituelsItems)
  }, [habituelsListId])

  const deleteHabituel = useCallback(async (itemId: string) => {
    if (!habituelsListId) return
    setHabituelsItems((prev) => prev.filter((i) => i.id !== itemId))
    try {
      await shoppingRepository.deleteItem(habituelsListId, itemId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression")
      void loadItems()
    }
  }, [habituelsListId, loadItems])

  const updateHabituelLabel = useCallback(async (item: ShoppingItem, labelId: string | undefined) => {
    if (!habituelsListId) return
    const newLabel = labelId ? labels.find((l) => l.id === labelId) : undefined
    setHabituelsItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, label: newLabel } : i)))
    try {
      await shoppingRepository.updateItem(habituelsListId, {
        id: item.id,
        shoppingListId: habituelsListId,
        checked: item.checked,
        position: item.position,
        isFood: item.isFood,
        note: item.note,
        quantity: item.quantity,
        labelId: labelId || undefined,
        display: item.display,
      })
    } catch (err) {
      setHabituelsItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, label: item.label } : i)))
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour")
    }
  }, [habituelsListId, labels])

  const updateHabituelNote = useCallback(async (item: ShoppingItem, note: string) => {
    if (!habituelsListId) return
    setHabituelsItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, note } : i)))
    try {
      await shoppingRepository.updateItem(habituelsListId, {
        id: item.id,
        shoppingListId: habituelsListId,
        checked: item.checked,
        position: item.position,
        isFood: item.isFood,
        note,
        quantity: item.quantity,
        labelId: item.label?.id,
        display: item.display,
      })
    } catch (err) {
      setHabituelsItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, note: item.note } : i)))
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour")
    }
  }, [habituelsListId])

  const addHabituelToCart = useCallback(async (item: ShoppingItem) => {
    if (!list) return
    await shoppingRepository.addItem(list.id, {
      shoppingListId: list.id,
      note: item.note,
      isFood: item.isFood,
      quantity: item.quantity ?? 1,
      labelId: item.label?.id,
    })
    const result = await getShoppingItemsUseCase.execute()
    setList(result.list)
    setItems(result.items)
    setLabels(result.labels)
  }, [list])

  const deleteAllHabituels = useCallback(async () => {
    if (!habituelsListId) return
    const snapshot = habituelsItems
    setHabituelsItems([])
    try {
      await shoppingRepository.deleteAllItems(habituelsListId, snapshot)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du vidage")
      void loadItems()
    }
  }, [habituelsListId, habituelsItems, loadItems])

  return {
    list,
    items,
    labels,
    habituelsListId,
    habituelsItems,
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
    addHabituel,
    deleteHabituel,
    updateHabituelLabel,
    updateHabituelNote,
    addHabituelToCart,
    deleteAllHabituels,
    reload: loadItems,
  }
}
