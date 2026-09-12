import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"

test.describe("Shopping — ajouter les ingrédients d'une recette planifiée au panier", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test("cliquer 'Ajouter au panier' envoie les recettes planifiées à l'endpoint d'expansion de Mealie", async ({ page }) => {
    let addRecipeCalled = false
    let payload: Array<{ recipeId: string; recipeIncrementQuantity: number }> = []

    await page.route("**/api/households/shopping/lists/*/recipe", async (route) => {
      if (route.request().method() === "POST") {
        addRecipeCalled = true
        payload = (route.request().postDataJSON() as typeof payload) ?? []
        await route.fulfill({ json: [] })
      } else {
        await route.continue()
      }
    })

    await page.goto("/planning")

    const addToCartButton = page.getByRole("button", { name: "Ajouter au panier", exact: true })
    await expect(addToCartButton).toBeVisible()
    await addToCartButton.click()

    await expect.poll(() => addRecipeCalled).toBe(true)

    expect(payload.length).toBeGreaterThan(0)

    for (const entry of payload) {
      expect(entry.recipeId).toBeTruthy()
      expect(entry.recipeIncrementQuantity).toBeGreaterThan(0)
    }

    // Les recettes planifiées dans les fixtures doivent être transmises par id.
    expect(payload.map((e) => e.recipeId)).toContain("abc123")

    await expect(page.getByText("Ajouté !", { exact: true })).toBeVisible({ timeout: 5000 })
  })
})
