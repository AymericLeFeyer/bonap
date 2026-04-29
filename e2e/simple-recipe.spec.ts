import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"
import { RECIPE_PIZZA, TAGS_RESPONSE } from "./fixtures/mealie.ts"

const SIMPLE_RECIPE_CREATED = {
  id: "simple-001",
  slug: "tomates-farine",
  name: "tomates, farine",
  description: "",
  recipeIngredient: [
    { referenceId: "ri-s1", quantity: 1, unit: null, food: { id: "f4", name: "tomates" }, note: "", display: "1 tomates" },
    { referenceId: "ri-s2", quantity: 1, unit: null, food: { id: "f1", name: "farine" }, note: "", display: "1 farine" },
  ],
  recipeInstructions: [],
  tags: [{ id: "tag-simple", name: "simple", slug: "simple" }],
  recipeCategory: [],
  extras: { emoji: "🍅" },
  image: null,
}

test.describe("Repas simple", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)

    // Mock création repas simple (POST /api/recipes → slug, puis GET slug, puis PATCH)
    await page.route("**/api/recipes", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify("tomates-farine") })
      } else {
        await route.continue()
      }
    })
    await page.route("**/api/recipes/tomates-farine", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: SIMPLE_RECIPE_CREATED })
      } else if (route.request().method() === "PATCH") {
        await route.fulfill({ json: SIMPLE_RECIPE_CREATED })
      } else {
        await route.continue()
      }
    })
    // Tags : inclut le tag "simple"
    await page.route("**/api/organizers/tags**", async (route) => {
      await route.fulfill({
        json: {
          ...TAGS_RESPONSE,
          items: [...TAGS_RESPONSE.items, { id: "tag-simple", name: "simple", slug: "simple" }],
        },
      })
    })
  })

  test("ouvre le dialog repas simple depuis le planning", async ({ page }) => {
    await page.goto("/planning")
    await page.getByRole("button", { name: /ajouter/i }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("tab", { name: /repas simple/i }).click()
    await expect(page.getByText(/ingrédients/i)).toBeVisible()
  })

  test("affiche les champs dans le bon ordre : ingrédients → nom → emoji", async ({ page }) => {
    await page.goto("/planning")
    await page.getByRole("button", { name: /ajouter/i }).first().click()
    await page.getByRole("tab", { name: /repas simple/i }).click()

    const labels = page.locator("label")
    const texts = await labels.allInnerTexts()
    const ingredientsIdx = texts.findIndex((t) => /ingrédients/i.test(t))
    const nomIdx = texts.findIndex((t) => /nom du repas/i.test(t))
    const emojiIdx = texts.findIndex((t) => /emoji/i.test(t))

    expect(ingredientsIdx).toBeLessThan(nomIdx)
    expect(nomIdx).toBeLessThan(emojiIdx)
  })

  test("pas de champ quantité ni unité dans le formulaire repas simple", async ({ page }) => {
    await page.goto("/planning")
    await page.getByRole("button", { name: /ajouter/i }).first().click()
    await page.getByRole("tab", { name: /repas simple/i }).click()

    await expect(page.getByPlaceholder(/qté/i)).not.toBeVisible()
    await expect(page.getByPlaceholder(/unité/i)).not.toBeVisible()
  })

  test("le nom se génère automatiquement depuis les ingrédients", async ({ page }) => {
    await page.goto("/planning")
    await page.getByRole("button", { name: /ajouter/i }).first().click()
    await page.getByRole("tab", { name: /repas simple/i }).click()

    const input = page.getByPlaceholder(/aliment/i).first()
    await input.fill("tomates")
    await expect(page.getByPlaceholder(/généré automatiquement/i)).toHaveValue(/tomates/i)
  })

  test("affiche une grille d'emojis prédéfinis", async ({ page }) => {
    await page.goto("/planning")
    await page.getByRole("button", { name: /ajouter/i }).first().click()
    await page.getByRole("tab", { name: /repas simple/i }).click()

    // Au moins 5 boutons emoji visibles dans la section emoji
    const emojiSection = page.locator("label", { hasText: /emoji/i }).locator("..")
    const emojiButtons = emojiSection.locator("button")
    await expect(emojiButtons).toHaveCount(await emojiButtons.count())
    expect(await emojiButtons.count()).toBeGreaterThanOrEqual(5)
  })

  test("bouton Créer désactivé si aucun ingrédient renseigné", async ({ page }) => {
    await page.goto("/planning")
    await page.getByRole("button", { name: /ajouter/i }).first().click()
    await page.getByRole("tab", { name: /repas simple/i }).click()

    await expect(page.getByRole("button", { name: /créer et ajouter/i })).toBeDisabled()
  })

  test("crée un repas simple et l'ajoute au planning", async ({ page }) => {
    let mealplanPostCalled = false
    await page.route("**/api/households/mealplans**", async (route) => {
      if (route.request().method() === "POST") {
        mealplanPostCalled = true
        await route.fulfill({ json: { id: 99, date: "2026-04-29", entryType: "dinner", recipeId: "simple-001", recipe: SIMPLE_RECIPE_CREATED } })
      } else {
        await route.continue()
      }
    })

    await page.goto("/planning")
    await page.getByRole("button", { name: /ajouter/i }).first().click()
    await page.getByRole("tab", { name: /repas simple/i }).click()

    const input = page.getByPlaceholder(/aliment/i).first()
    await input.fill("tomates")

    await page.getByRole("button", { name: /créer et ajouter/i }).click()
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 })
    expect(mealplanPostCalled).toBe(true)
  })
})
