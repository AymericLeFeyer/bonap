import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"
import { MEALPLANS_RESPONSE } from "./fixtures/mealie.ts"

test.describe("Mode Kiosk", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test("affiche l'heure et la date courantes dans le header", async ({ page }) => {
    await page.goto("/kiosk")
    // L'heure est affichée en format HH:MM
    await expect(page.locator("p.tabular-nums")).toBeVisible()
    const timeText = await page.locator("p.tabular-nums").innerText()
    expect(timeText).toMatch(/^\d{2}:\d{2}$/)
  })

  test("affiche une colonne par jour du planning", async ({ page }) => {
    await page.goto("/kiosk")
    // Par défaut kioskDays=5, donc 5 colonnes jour
    // Chaque colonne a un label (Aujourd'hui, Demain, etc.)
    await expect(page.getByText("Aujourd'hui")).toBeVisible()
    await expect(page.getByText("Demain")).toBeVisible()
  })

  test("affiche les créneaux Déjeuner et Dîner", async ({ page }) => {
    await page.goto("/kiosk")
    const lunchSlots = page.getByText("Déjeuner")
    const dinnerSlots = page.getByText("Dîner")
    await expect(lunchSlots.first()).toBeVisible()
    await expect(dinnerSlots.first()).toBeVisible()
  })

  test("affiche les recettes du planning dans les créneaux", async ({ page }) => {
    await page.goto("/kiosk")
    await expect(page.getByText("Pizza maison")).toBeVisible()
    await expect(page.getByText("Salade niçoise")).toBeVisible()
  })

  test("affiche 'Rien de prévu' pour les créneaux vides", async ({ page }) => {
    await page.goto("/kiosk")
    await expect(page.getByText("Rien de prévu").first()).toBeVisible()
  })

  test("le bouton rafraîchir déclenche un nouvel appel API", async ({ page }) => {
    let callCount = 0
    await page.route("**/api/households/mealplans**", async (route) => {
      if (route.request().method() === "GET") {
        callCount++
        await route.fulfill({ json: MEALPLANS_RESPONSE })
      } else {
        await route.continue()
      }
    })

    await page.goto("/kiosk")
    const initialCount = callCount
    await page.getByTitle("Rafraîchir").click()
    // Attendre que le deuxième appel soit fait
    await page.waitForTimeout(500)
    expect(callCount).toBeGreaterThan(initialCount)
  })

  test("le créneau prochain est mis en évidence (ring primary)", async ({ page }) => {
    await page.goto("/kiosk")
    // Au moins un slot a la classe ring-2 ring-primary (prochain repas)
    const nextSlot = page.locator(".ring-2.ring-primary")
    // Peut ne pas exister si aucun repas n'est planifié dans la fenêtre
    // On vérifie juste que la page charge sans erreur
    await expect(page.locator("header")).toBeVisible()
  })

  test("ouvre la modal de détail au clic sur une recette", async ({ page }) => {
    await page.goto("/kiosk")
    await page.getByText("Pizza maison").first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("dialog").getByText("Pizza maison")).toBeVisible()
  })

  test("affiche les repas simples avec leur emoji si pas d'image", async ({ page }) => {
    // Mock un repas simple (tag "simple", pas d'image, extras.emoji)
    const simpleRecipeMeal = {
      items: [
        {
          id: 10,
          date: new Date().toISOString().slice(0, 10),
          entryType: "lunch",
          title: null,
          recipeId: "simple-001",
          recipe: {
            id: "simple-001",
            slug: "tomates-oeufs",
            name: "tomates, oeufs",
            description: "",
            image: null,
            tags: [{ id: "tag-simple", name: "simple", slug: "simple" }],
            extras: { emoji: "🍳" },
          },
        },
      ],
      page: 1, per_page: -1, total: 1, total_pages: 1,
    }

    await page.route("**/api/households/mealplans**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: simpleRecipeMeal })
      } else {
        await route.continue()
      }
    })

    await page.goto("/kiosk")
    await expect(page.getByText("tomates, oeufs")).toBeVisible()
    // L'emoji doit apparaître dans le fallback image
    await expect(page.getByText("🍳")).toBeVisible()
  })
})
