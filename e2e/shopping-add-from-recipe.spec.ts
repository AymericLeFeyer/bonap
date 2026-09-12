import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"
import { MEALPLANS_RESPONSE } from "./fixtures/mealie.ts"

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

  test("recipeIncrementQuantity porte le ratio des portions planifiées sur la base de la recette", async ({ page }) => {
    // Pizza de 4 portions planifiée pour 6 (préfixe [s:6] dans la note du repas) → ratio 1.5.
    // La salade, sans portions définies, reste à 1.
    const [pizzaMeal, saladeMeal] = MEALPLANS_RESPONSE.items
    await page.route("**/api/households/mealplans**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: {
            ...MEALPLANS_RESPONSE,
            items: [
              { ...pizzaMeal, text: "[s:6]", recipe: { ...pizzaMeal.recipe, recipeServings: 4 } },
              saladeMeal,
            ],
          },
        })
      } else {
        await route.continue()
      }
    })

    let payload: Array<{ recipeId: string; recipeIncrementQuantity: number }> = []
    await page.route("**/api/households/shopping/lists/*/recipe", async (route) => {
      payload = (route.request().postDataJSON() as typeof payload) ?? []
      await route.fulfill({ json: [] })
    })

    await page.goto("/planning")
    await page.getByRole("button", { name: "Ajouter au panier", exact: true }).click()

    await expect.poll(() => payload.length).toBeGreaterThan(0)
    expect(payload).toEqual(
      expect.arrayContaining([
        { recipeId: "abc123", recipeIncrementQuantity: 1.5 },
        { recipeId: "def456", recipeIncrementQuantity: 1 },
      ]),
    )
  })
})
