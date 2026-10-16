import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"
import { MEALPLANS_RESPONSE, RECIPE_PIZZA } from "./fixtures/mealie.ts"

// Entrée / plat / dessert : le type d'un repas est porté par sa note ("[c:dessert]").
const pizza = MEALPLANS_RESPONSE.items[0]
const MEALPLANS_WITH_DESSERT = {
  ...MEALPLANS_RESPONSE,
  items: [
    ...MEALPLANS_RESPONSE.items,
    {
      ...pizza,
      id: 3,
      text: "[c:dessert]",
      recipeId: "tarte1",
      recipe: { id: "tarte1", slug: "tarte-fraises", name: "Tarte aux fraises", description: "" },
    },
  ],
}

test.describe("Planning — entrée / plat / dessert", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test("affiche le dessert sous le plat du même créneau, avec son étiquette", async ({ page }) => {
    await page.route("**/api/households/mealplans**", async (route) => {
      if (route.request().method() === "GET") await route.fulfill({ json: MEALPLANS_WITH_DESSERT })
      else await route.continue()
    })

    await page.goto("/planning")
    const table = page.locator("table")
    const dessertCard = table.locator("[data-course='dessert']")
    await expect(dessertCard).toContainText("Tarte aux fraises", { timeout: 8000 })
    await expect(dessertCard).toContainText("Dessert")

    // Même cellule que la pizza, et placée après elle.
    const cell = table.locator("td:has([data-course='dessert'])")
    const names = await cell.locator("[data-course]").allTextContents()
    expect(names[0]).toContain("Pizza maison")
    expect(names[1]).toContain("Tarte aux fraises")
  })

  test("ajouter un dessert pré-filtre le sélecteur et enregistre le type", async ({ page }) => {
    let postedText: unknown
    await page.route("**/api/households/mealplans", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as Record<string, unknown>
        postedText = body.text
        await route.fulfill({
          json: { id: 99, date: body.date, entryType: body.entryType, text: body.text, recipeId: "abc123", recipe: RECIPE_PIZZA },
        })
      } else if (route.request().method() === "GET") {
        await route.fulfill({ json: MEALPLANS_RESPONSE })
      } else {
        await route.continue()
      }
    })

    await page.goto("/planning")
    await expect(page.locator("table").getByText("Pizza maison")).toBeVisible({ timeout: 8000 })

    await page.locator("table").getByRole("button", { name: "Ajouter un dessert" }).first().click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("heading", { name: "Choisir un dessert" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Desserts" })).toHaveAttribute("aria-pressed", "true")
    // Aucune recette des fixtures n'est un dessert.
    await expect(dialog.getByText("Aucun dessert trouvé.")).toBeVisible()

    await dialog.getByRole("button", { name: "Toutes" }).click()
    await dialog.getByText("Pizza maison").click()

    await expect.poll(() => postedText).toBe("[c:dessert]")
    await expect(page.locator("table [data-course='dessert']")).toContainText("Pizza maison")
  })

  test("le + principal ajoute un plat, sans marqueur de type", async ({ page }) => {
    let posted: Record<string, unknown> | undefined
    await page.route("**/api/households/mealplans", async (route) => {
      if (route.request().method() === "POST") {
        posted = route.request().postDataJSON() as Record<string, unknown>
        await route.fulfill({ json: { id: 99, date: posted.date, entryType: posted.entryType, recipeId: "abc123", recipe: RECIPE_PIZZA } })
      } else if (route.request().method() === "GET") {
        await route.fulfill({ json: MEALPLANS_RESPONSE })
      } else {
        await route.continue()
      }
    })

    await page.goto("/planning")
    await expect(page.locator("table").getByText("Pizza maison")).toBeVisible({ timeout: 8000 })

    await page.getByRole("button", { name: "Ajouter un repas" }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("button", { name: "Plats" })).toHaveAttribute("aria-pressed", "true")
    await dialog.getByText("Pizza maison").click()

    await expect.poll(() => posted).toBeDefined()
    expect(String(posted?.text ?? "")).not.toContain("[c:")
  })
})
