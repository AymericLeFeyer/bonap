import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"

test.describe("Suggestions — ajouter une suggestion IA au planning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await page.evaluate(() => {
      localStorage.setItem(
        "bonap_llm_config",
        JSON.stringify({
          provider: "anthropic",
          apiKey: "fake-key-e2e",
          model: "claude-sonnet-4-6",
        }),
      )
    })
    await mockAllApiRoutes(page)
  })

  test("sélectionner un critère, générer, ajouter la suggestion à un créneau Déj. déclenche POST /mealplans avec recipeId et entryType", async ({ page }) => {
    let llmCalled = false
    let addMealCalled = false
    let addMealPayload: { date?: string; entryType?: string; recipeId?: string } = {}

    // Mock LLM Anthropic — renvoie une suggestion valide (pizza-maison existe dans RECIPES_LIST_RESPONSE).
    await page.route("**/api.anthropic.com/v1/messages", async (route) => {
      if (route.request().method() === "POST") {
        llmCalled = true
        await route.fulfill({
          json: {
            content: [
              {
                type: "text",
                text: '[{"slug":"pizza-maison","name":"Pizza maison","reason":"Rapide et réconfortant"}]',
              },
            ],
          },
        })
      } else {
        await route.continue()
      }
    })

    // Override POST mealplans pour capturer le payload (le mock par défaut fulfills déjà sans captures).
    await page.route("**/api/households/mealplans**", async (route) => {
      if (route.request().method() === "POST") {
        addMealCalled = true
        addMealPayload = (route.request().postDataJSON() as typeof addMealPayload) ?? {}
        await route.fulfill({
          json: {
            id: 99,
            date: addMealPayload.date ?? "",
            entryType: addMealPayload.entryType ?? "lunch",
            recipeId: addMealPayload.recipeId ?? "abc123",
            recipe: {
              id: "abc123",
              slug: "pizza-maison",
              name: "Pizza maison",
              description: "Une pizza classique",
            },
          },
        })
      } else {
        await route.continue()
      }
    })

    await page.goto("/suggestions")

    // Sélectionner un critère — le chip est un <div> avec onClick, on clique sur son texte.
    await page.getByText("Rapide (≤ 30 min)", { exact: true }).click()

    // Générer les suggestions.
    await page.getByRole("button", { name: "Suggérer 5 repas", exact: true }).click()

    // Attendre que l'IA mockée soit appelée et que la suggestion s'affiche.
    await expect.poll(() => llmCalled).toBe(true)
    await expect(page.getByText("Pizza maison", { exact: true })).toBeVisible({ timeout: 5000 })

    // Cliquer "Ajouter" sur la suggestion → ouvre PlanningSlotPicker.
    await page.getByRole("button", { name: "Ajouter", exact: true }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    // Sélectionner le premier créneau Déj. vide (aujourd'hui lunch).
    await page.getByRole("button", { name: "Déj.", exact: true }).first().click()

    // Vérifier que POST /mealplans a été déclenché avec les bons payload.
    await expect.poll(() => addMealCalled).toBe(true)
    expect(addMealPayload.recipeId).toBe("abc123")
    expect(addMealPayload.entryType).toBe("lunch")
    expect(addMealPayload.date).toBeTruthy()

    // Le bouton passe en "Ajouté" → feedback utilisateur.
    await expect(page.getByRole("button", { name: "Ajouté", exact: true })).toBeVisible({ timeout: 5000 })
  })
})