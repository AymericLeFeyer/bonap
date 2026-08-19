import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"
import { RECIPE_PIZZA } from "./fixtures/mealie.ts"

/**
 * Tests E2E sur le système de portions (issues #14 et #39).
 *
 * Couvre :
 * - L'affichage cohérent des portions selon les 3 champs Mealie
 *   (recipeServings prioritaire, recipeYieldQuantity, recipeYield texte fallback)
 * - Le sélecteur +/- (InlineEditServings) sur la fiche recette
 * - Le multiplicateur visuel quand on s'écarte de la base
 */
test.describe("Portions / yield", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test.describe("Lecture des portions (fix #14)", () => {
    test("affiche le nombre saisi quand recipeServings est défini", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({
          json: { ...RECIPE_PIZZA, recipeServings: 4, recipeYield: "personnes" },
        })
      })
      await page.goto("/recipes/pizza-maison")
      const input = page.getByLabel("Nombre de portions")
      await expect(input).toHaveValue("4")
    })

    test("retombe sur recipeYieldQuantity si recipeServings est 0", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({
          json: {
            ...RECIPE_PIZZA,
            recipeServings: 0,
            recipeYieldQuantity: 6,
            recipeYield: "personnes",
          },
        })
      })
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByLabel("Nombre de portions")).toHaveValue("6")
    })

    test("parse recipeYield texte (legacy) quand les champs numériques sont absents", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({
          json: { ...RECIPE_PIZZA, recipeServings: 0, recipeYield: "8 personnes" },
        })
      })
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByLabel("Nombre de portions")).toHaveValue("8")
    })
  })

  test.describe("Sélecteur +/-", () => {
    test("le bouton + augmente le compteur de 1", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({ json: { ...RECIPE_PIZZA, recipeServings: 4 } })
      })
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByLabel("Nombre de portions")).toHaveValue("4")
      await page.getByLabel("Augmenter le nombre de portions").click()
      await expect(page.getByLabel("Nombre de portions")).toHaveValue("5")
    })

    test("le bouton - diminue le compteur de 1", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({ json: { ...RECIPE_PIZZA, recipeServings: 4 } })
      })
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByLabel("Nombre de portions")).toHaveValue("4")
      await page.getByLabel("Diminuer le nombre de portions").click()
      await expect(page.getByLabel("Nombre de portions")).toHaveValue("3")
    })

    test("le bouton - est désactivé à 1 portion", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({ json: { ...RECIPE_PIZZA, recipeServings: 1 } })
      })
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByLabel("Nombre de portions")).toHaveValue("1")
      await expect(page.getByLabel("Diminuer le nombre de portions")).toBeDisabled()
    })

    test("affiche le multiplicateur '2×' quand on double", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({ json: { ...RECIPE_PIZZA, recipeServings: 4 } })
      })
      await page.goto("/recipes/pizza-maison")

      // Cliquer + 4 fois pour passer de 4 à 8 (×2)
      const plus = page.getByLabel("Augmenter le nombre de portions")
      await plus.click()
      await plus.click()
      await plus.click()
      await plus.click()

      await expect(page.getByLabel("Nombre de portions")).toHaveValue("8")
      await expect(page.getByText("2×")).toBeVisible()
    })

    test("aucun multiplicateur affiché à la valeur de base", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({ json: { ...RECIPE_PIZZA, recipeServings: 4 } })
      })
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByLabel("Nombre de portions")).toHaveValue("4")
      // À la valeur de base, le multiplicateur ne doit pas apparaître
      await expect(page.getByText(/×/)).toHaveCount(0)
    })
  })

  test.describe("Recette sans portions définies", () => {
    test("affiche un input vide quand aucun champ portions n'est défini", async ({ page }) => {
      await page.route("**/api/recipes/pizza-maison", async (route) => {
        await route.fulfill({
          json: { ...RECIPE_PIZZA, recipeServings: 0, recipeYieldQuantity: 0, recipeYield: "" },
        })
      })
      await page.goto("/recipes/pizza-maison")
      const input = page.getByLabel("Nombre de portions")
      await expect(input).toBeVisible()
      await expect(input).toHaveValue("")
    })
  })
})
