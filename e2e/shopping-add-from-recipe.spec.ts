import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"

test.describe("Shopping — ajouter les ingrédients d'une recette planifiée au panier", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test("cliquer 'Ajouter au panier' déclenche POST /shopping/items/create-bulk avec les ingrédients des recettes planifiées", async ({ page }) => {
    let createBulkCalled = false
    let createBulkPayload: Array<{ isFood: boolean; note: string; shoppingListId: string }> = []

    await page.route("**/api/households/shopping/items/create-bulk", async (route) => {
      if (route.request().method() === "POST") {
        createBulkCalled = true
        const body = (route.request().postDataJSON() as unknown[]) ?? []
        createBulkPayload = body as Array<{ isFood: boolean; note: string; shoppingListId: string }>
        await route.fulfill({
          json: body.map((_, i) => ({
            id: `item-new-${i}`,
            shoppingListId: "list-bonap",
            checked: false,
            position: 10 + i,
            isFood: false,
            note: "Nouvel article",
            quantity: 1,
          })),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/planning")

    const addToCartButton = page.getByRole("button", { name: "Ajouter au panier", exact: true })
    await expect(addToCartButton).toBeVisible()
    await addToCartButton.click()

    await expect.poll(() => createBulkCalled).toBe(true)

    expect(createBulkPayload.length).toBeGreaterThan(0)

    for (const item of createBulkPayload) {
      expect(item.isFood).toBe(false)
      expect(item.note).toContain(" — ")
      expect(item.shoppingListId).toBe("list-bonap")
    }

    const notes = createBulkPayload.map((i) => i.note).join("\n")
    expect(notes).toContain("farine")
    expect(notes).toContain("mozzarella")
    expect(notes).toContain("Pizza maison")

    await expect(page.getByText("Ajouté !", { exact: true })).toBeVisible({ timeout: 5000 })
  })
})