import { test, expect, type Page } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"
import { MEALPLANS_RESPONSE } from "./fixtures/mealie.ts"

// Batch cooking : tag "batch" + durées et stock dans les extras de la recette.
const BATCH_TAG = { id: "t-batch", name: "batch", slug: "batch" }

function lasagnes(stock: unknown[]) {
  return {
    id: "las1",
    slug: "lasagnes",
    name: "Lasagnes",
    description: "",
    tags: [BATCH_TAG],
    recipeServings: 4,
    extras: {
      batchFridgeDays: "3",
      batchFreezerDays: "90",
      batchStock: JSON.stringify(stock),
    },
  }
}

/** Mocke la recette batch ; renvoie les corps PATCH reçus. */
async function mockBatchRecipe(page: Page) {
  let recipe = lasagnes([{ location: "freezer", count: 3, preparedAt: "2026-11-02" }])
  const patches: Record<string, unknown>[] = []

  await page.route("**/api/recipes?**", async (route) => {
    if (route.request().url().includes("tags=batch")) {
      await route.fulfill({ json: { page: 1, per_page: 100, total: 1, total_pages: 1, items: [recipe] } })
    } else {
      await route.fallback()
    }
  })
  await page.route("**/api/recipes/lasagnes", async (route) => {
    const method = route.request().method()
    if (method === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>
      patches.push(body)
      recipe = { ...recipe, ...(body as object) }
    }
    await route.fulfill({ json: recipe })
  })
  return patches
}

test.describe("Batch cooking", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test("planifier un plat du congélateur le retire du stock et note sa provenance", async ({ page }) => {
    const patches = await mockBatchRecipe(page)
    let postedText: unknown
    await page.route("**/api/households/mealplans", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as Record<string, unknown>
        postedText = body.text
        await route.fulfill({
          json: { id: 99, date: body.date, entryType: body.entryType, text: body.text, recipeId: "las1", recipe: lasagnes([]) },
        })
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
    await dialog.getByRole("button", { name: "Batch" }).click()
    await expect(dialog.getByText("Lasagnes")).toBeVisible()
    await expect(dialog.getByText("congélateur", { exact: false })).toBeVisible()
    await dialog.getByRole("button", { name: /Lasagnes/ }).click()

    await expect.poll(() => String(postedText ?? "")).toContain("[b:freezer:2026-11-02]")
    await expect.poll(() => patches.length).toBe(1)
    const extras = patches[0].extras as Record<string, string>
    expect(JSON.parse(extras.batchStock)).toEqual([{ location: "freezer", count: 2, preparedAt: "2026-11-02" }])

    await expect(page.locator("table").getByText(/Congélateur · 2 nov/)).toBeVisible()
  })

  test("la page Batch cooking liste le stock par rangement", async ({ page }) => {
    await mockBatchRecipe(page)
    await page.goto("/batch")
    await expect(page.getByRole("heading", { name: "Batch cooking" })).toBeVisible()
    const freezer = page.locator("section").filter({ has: page.getByRole("heading", { name: /Congélateur/ }) })
    await expect(freezer).toContainText("Lasagnes", { timeout: 8000 })
    await expect(freezer).toContainText("3 plats")
    await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: /Frigo/ }) }))
      .toContainText("Rien au frigo")
  })
})
