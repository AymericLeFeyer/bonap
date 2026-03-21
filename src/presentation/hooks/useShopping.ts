import { useCallback, useEffect, useRef, useState } from "react"
import type { ShoppingItem, ShoppingList, CustomItem } from "../../domain/shopping/entities/ShoppingItem.ts"
import { GetShoppingItemsUseCase } from "../../application/shopping/usecases/GetShoppingItemsUseCase.ts"
import { AddItemUseCase } from "../../application/shopping/usecases/AddItemUseCase.ts"
import { AddRecipesToListUseCase } from "../../application/shopping/usecases/AddRecipesToListUseCase.ts"
import { ToggleItemUseCase } from "../../application/shopping/usecases/ToggleItemUseCase.ts"
import { ClearListUseCase } from "../../application/shopping/usecases/ClearListUseCase.ts"
import type { ClearMode } from "../../application/shopping/usecases/ClearListUseCase.ts"
import { ShoppingRepository } from "../../infrastructure/mealie/repositories/ShoppingRepository.ts"
import { CustomItemRepository } from "../../infrastructure/shopping/CustomItemRepository.ts"

const shoppingRepository = new ShoppingRepository()
const customItemRepository = new CustomItemRepository()

const getItemsUseCase = new GetShoppingItemsUseCase(shoppingRepository)
const addItemUseCase = new AddItemUseCase(shoppingRepository)
const addRecipesUseCase = new AddRecipesToListUseCase(shoppingRepository)
const toggleItemUseCase = new ToggleItemUseCase(shoppingRepository)
const clearListUseCase = new ClearListUseCase(shoppingRepository)

export function useShopping() {
  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addingRecipes, setAddingRecipes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref pour éviter les double-fetch en mode strict
  const initialized = useRef(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getItemsUseCase.execute()
      setList(result.list)
      setItems(result.items)
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

  const addItem = useCallback(async (note: string) => {
    if (!list) return
    const newItem = await addItemUseCase.execute(list.id, note)
    setItems((prev) => [...prev, newItem])
  }, [list])

  const addRecipes = useCallback(async (recipeIds: string[]) => {
    if (!list) return
    setAddingRecipes(true)
    setError(null)
    try {
      await addRecipesUseCase.execute(list.id, recipeIds)
      // Recharger les items après l'ajout (Mealie fait la déduplication)
      const result = await getItemsUseCase.execute()
      setList(result.list)
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout des recettes")
    } finally {
      setAddingRecipes(false)
    }
  }, [list])

  const toggleItem = useCallback(async (item: ShoppingItem) => {
    if (!list) return
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)),
    )
    try {
      const updated = await toggleItemUseCase.execute(list.id, item)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } catch (err) {
      // Rollback
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
      await shoppingRepository.deleteItem(list.id, itemId)
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

  // Articles habituels (localStorage)
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
    customItems,
    loading,
    addingRecipes,
    error,
    addItem,
    addRecipes,
    toggleItem,
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
