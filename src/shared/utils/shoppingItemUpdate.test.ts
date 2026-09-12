import { describe, it, expect } from "vitest"
import type { ShoppingItem } from "../../domain/shopping/entities/ShoppingItem.ts"
import { toItemUpdate } from "./shoppingItemUpdate.ts"

const item: ShoppingItem = {
  id: "item-1",
  shoppingListId: "list-1",
  checked: false,
  position: 3,
  isFood: true,
  note: "",
  quantity: 2,
  unit: { id: "unit-g", name: "g" },
  foodName: "farine",
  foodId: "food-42",
  label: { id: "label-1", name: "Épicerie" },
  display: "2 g farine",
  source: "mealie",
}

describe("toItemUpdate", () => {
  it("conserve foodId et unitId — sans eux le PUT Mealie détache l'aliment", () => {
    const update = toItemUpdate(item, "list-1")
    expect(update.foodId).toBe("food-42")
    expect(update.unitId).toBe("unit-g")
  })

  it("reprend les champs de l'article quand aucun patch n'est fourni", () => {
    expect(toItemUpdate(item, "list-1")).toEqual({
      id: "item-1",
      shoppingListId: "list-1",
      checked: false,
      position: 3,
      isFood: true,
      note: "",
      quantity: 2,
      foodId: "food-42",
      unitId: "unit-g",
      labelId: "label-1",
      display: "2 g farine",
    })
  })

  it("applique le patch sans perdre l'aliment", () => {
    const update = toItemUpdate(item, "list-1", { labelId: "label-9" })
    expect(update.labelId).toBe("label-9")
    expect(update.foodId).toBe("food-42")
    expect(update.checked).toBe(false)
  })

  it("retire l'étiquette quand labelId est explicitement undefined", () => {
    expect(toItemUpdate(item, "list-1", { labelId: undefined }).labelId).toBeUndefined()
  })

  it("gère un article libre sans aliment ni unité", () => {
    const free: ShoppingItem = {
      id: "item-2",
      shoppingListId: "list-1",
      checked: false,
      position: 0,
      isFood: false,
      note: "papier toilette",
      source: "mealie",
    }
    const update = toItemUpdate(free, "list-1", { checked: true })
    expect(update.foodId).toBeUndefined()
    expect(update.unitId).toBeUndefined()
    expect(update.checked).toBe(true)
    expect(update.note).toBe("papier toilette")
  })
})
