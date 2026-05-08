import { useCallback, useEffect, useRef, useState } from "react"
import type { ShoppingItem, ShoppingLabel, ShoppingList } from "../../domain/shopping/entities/ShoppingItem.ts"
import type { ClearMode } from "../../application/shopping/usecases/ClearListUseCase.ts"
import {
  getShoppingItemsUseCase,
  addItemUseCase,
  getRecipesByIdsUseCase,
  toggleItemUseCase,
  deleteItemUseCase,
  clearListUseCase,
  shoppingRepository,
  getFoodsUseCase,
  createFoodUseCase,
} from "../../infrastructure/container.ts"
import { extractFoodKey } from "../../shared/utils/food.ts"
import { foodLabelStore } from "../../infrastructure/shopping/FoodLabelStore.ts"

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

  const findExisting = useCallback((currentItems: ShoppingItem[], key: string) => {
    return currentItems.find((i) => {
      const iKey = extractFoodKey(i.foodName ?? i.note ?? "")
      return iKey && iKey === key
    })
  }, [])

  const addItem = useCallback(async (note: string, _quantity?: number, labelId?: string) => {
    if (!list) return
    const key = extractFoodKey(note)
    const savedLabelId = key ? foodLabelStore.lookup(key) : undefined
    const effectiveLabelId = labelId ?? savedLabelId
    const existing = key ? findExisting(items, key) : undefined
    if (existing) {
      await shoppingRepository.updateItem(list.id, {
        id: existing.id,
        shoppingListId: list.id,
        checked: existing.checked,
        position: existing.position,
        isFood: existing.isFood,
        note: existing.note,
        quantity: (existing.quantity ?? 1) + 1,
        labelId: existing.label?.id,
        display: existing.display,
      })
    } else {
      await addItemUseCase.execute(list.id, note, 1, effectiveLabelId)
    }
    const result = await getShoppingItemsUseCase.execute()
    setList(result.list)
    setItems(result.items)
    setLabels(result.labels)
  }, [list, items, findExisting])

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

  const updateItemNote = useCallback(async (item: ShoppingItem, newNote: string) => {
    if (!list) return
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, note: newNote } : i)))
    try {
      await shoppingRepository.updateItem(list.id, {
        id: item.id,
        shoppingListId: list.id,
        checked: item.checked,
        position: item.position,
        isFood: item.isFood,
        note: newNote,
        quantity: item.quantity,
        labelId: item.label?.id,
        display: item.display,
      })
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, note: item.note } : i)))
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour")
    }
  }, [list])

  const updateItemLabel = useCallback(async (item: ShoppingItem, labelId: string | undefined) => {
    if (!list) return
    const newLabel = labelId ? labels.find((l) => l.id === labelId) : undefined
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, label: newLabel } : i)))
    // Save to reference: extract food key from note (strip recipe suffix like " — Recette X")
    const rawName = item.foodName ?? (item.note?.split(" — ")[0] ?? "")
    const foodKey = extractFoodKey(rawName)
    if (foodKey) {
      if (labelId) foodLabelStore.set(foodKey, labelId)
      else foodLabelStore.remove(foodKey)
    }
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
      const recipes = await getRecipesByIdsUseCase.execute(recipeIds)
      // Build a mutable snapshot of current items to track in-flight additions
      let currentItems = [...items]
      for (const recipe of recipes) {
        const ingredients = recipe.recipeIngredient ?? []
        for (const ing of ingredients) {
          // Prefer the already-parsed food name, otherwise extract from note
          const cleanNote = ing.food?.name?.trim()
            ?? (ing.note ? extractFoodKey(ing.note) || ing.note.trim() : "")
          if (!cleanNote) continue
          const key = extractFoodKey(cleanNote) || cleanNote.toLowerCase()
          const existing = findExisting(currentItems, key)
          if (existing) {
            const updated = await shoppingRepository.updateItem(list.id, {
              id: existing.id,
              shoppingListId: list.id,
              checked: existing.checked,
              position: existing.position,
              isFood: existing.isFood,
              note: existing.note,
              quantity: (existing.quantity ?? 1) + 1,
              labelId: existing.label?.id,
              display: existing.display,
            })
            currentItems = currentItems.map((i) => (i.id === existing.id ? updated : i))
          } else {
            await shoppingRepository.addItem(list.id, {
              shoppingListId: list.id,
              note: cleanNote,
              isFood: false,
              quantity: 1,
            })
            currentItems = [...currentItems, {
              id: `tmp-${Date.now()}-${Math.random()}`,
              shoppingListId: list.id,
              checked: false,
              position: 0,
              isFood: false,
              note: cleanNote,
              quantity: 1,
              source: "mealie" as const,
            }]
          }
        }
      }
      const result = await getShoppingItemsUseCase.execute()
      setList(result.list)
      setItems(result.items)
      setLabels(result.labels)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout des recettes")
    } finally {
      setAddingRecipes(false)
    }
  }, [list, items, findExisting])

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
    const tempId = `tmp-${Date.now()}`
    const tempItem: ShoppingItem = {
      id: tempId,
      shoppingListId: habituelsListId,
      checked: false,
      position: 0,
      isFood: true,
      note,
      foodName: note,
      source: "mealie",
    }
    setHabituelsItems((prev) => [...prev, tempItem])
    try {
      const foods = await getFoodsUseCase.execute()
      const normalizedNote = note.trim().toLowerCase()
      const existing = foods.find((f) => f.name.toLowerCase() === normalizedNote)
      const food = existing ?? await createFoodUseCase.execute(note.trim())
      await shoppingRepository.addItem(habituelsListId, {
        shoppingListId: habituelsListId,
        note,
        isFood: true,
        foodId: food.id,
        labelId,
      })
      const result = await getShoppingItemsUseCase.execute()
      setHabituelsListId(result.habituelsListId)
      setHabituelsItems(result.habituelsItems)
    } catch (err) {
      setHabituelsItems((prev) => prev.filter((i) => i.id !== tempId))
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout")
    }
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
    const key = extractFoodKey(item.foodName ?? item.note ?? "")
    const existing = key ? findExisting(items, key) : undefined
    const cleanNote = item.foodName ?? item.note ?? ""
    const tempId = `tmp-${Date.now()}`

    // Optimistic update
    if (existing) {
      setItems((prev) => prev.map((i) => i.id === existing.id ? { ...i, quantity: (i.quantity ?? 1) + 1 } : i))
    } else {
      setItems((prev) => [...prev, {
        id: tempId,
        shoppingListId: list.id,
        checked: false,
        position: 0,
        isFood: item.isFood,
        note: cleanNote,
        quantity: 1,
        label: item.label,
        source: "mealie" as const,
      }])
    }

    try {
      if (existing) {
        await shoppingRepository.updateItem(list.id, {
          id: existing.id,
          shoppingListId: list.id,
          checked: existing.checked,
          position: existing.position,
          isFood: existing.isFood,
          note: existing.note,
          quantity: (existing.quantity ?? 1) + 1,
          labelId: existing.label?.id,
          display: existing.display,
        })
      } else {
        await shoppingRepository.addItem(list.id, {
          shoppingListId: list.id,
          note: cleanNote,
          isFood: item.isFood,
          quantity: 1,
          labelId: item.label?.id,
        })
      }
      const result = await getShoppingItemsUseCase.execute()
      setList(result.list)
      setItems(result.items)
      setLabels(result.labels)
    } catch (err) {
      // Rollback
      if (existing) {
        setItems((prev) => prev.map((i) => i.id === existing.id ? existing : i))
      } else {
        setItems((prev) => prev.filter((i) => i.id !== tempId))
      }
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout")
    }
  }, [list, items, findExisting])

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
    updateItemNote,
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
