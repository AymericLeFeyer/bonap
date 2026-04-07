import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"
import {
  RECIPES_LIST_RESPONSE,
  RECIPE_PIZZA,
} from "./fixtures/mealie.ts"

test.describe("Recettes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test.describe("Liste des recettes", () => {
    test("affiche les recettes retournées par l'API", async ({ page }) => {
      await page.goto("/recipes")

      await expect(page.getByText("Pizza maison")).toBeVisible()
      await expect(page.getByText("Salade niçoise")).toBeVisible()
    })

    test("affiche le compteur de recettes", async ({ page }) => {
      await page.goto("/recipes")
      await expect(page.getByText("Pizza maison")).toBeVisible()
      await expect(page.getByText("2")).toBeVisible()
    })

    test("affiche l'état vide quand aucune recette ne correspond", async ({ page }) => {
      await page.route("**/api/recipes?**", async (route) => {
        await route.fulfill({
          json: { ...RECIPES_LIST_RESPONSE, items: [], total: 0, total_pages: 1 },
        })
      })

      await page.goto("/recipes")
      await expect(page.getByText("Aucune recette trouvée")).toBeVisible()
    })

    test("le bouton 'Nouvelle recette' est présent", async ({ page }) => {
      await page.goto("/recipes")
      await expect(page.getByRole("button", { name: /nouvelle recette/i })).toBeVisible()
    })

    test("cliquer sur 'Nouvelle recette' navigue vers la page de création", async ({ page }) => {
      await page.goto("/recipes")
      await page.getByRole("button", { name: /nouvelle recette/i }).click()
      await expect(page).toHaveURL(/\/recipes\/new/)
    })
  })

  test.describe("Formulaire de création", () => {
    test("affiche le formulaire de création", async ({ page }) => {
      await page.goto("/recipes/new")
      // Le champ nom est en mode édition (autoFocus=true dans InlineEditText)
      await expect(page.getByPlaceholder("Nom de la recette")).toBeVisible()
      await expect(page.getByRole("button", { name: /créer la recette/i }).first()).toBeVisible()
    })

    test("le bouton Créer est désactivé si le titre est vide", async ({ page }) => {
      await page.goto("/recipes/new")
      // Deux boutons "Créer la recette" (header sticky + article) — on prend le premier
      const submitBtn = page.getByRole("button", { name: /créer la recette/i }).first()
      await expect(submitBtn).toBeDisabled()
    })

    test("peut remplir et soumettre le formulaire de création", async ({ page }) => {
      await page.route("**/api/recipes", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify("nouvelle-pizza"),
          })
        } else {
          await route.continue()
        }
      })

      await page.route("**/api/recipes/nouvelle-pizza", async (route) => {
        await route.fulfill({ json: { ...RECIPE_PIZZA, slug: "nouvelle-pizza", name: "Nouvelle pizza" } })
      })

      await page.goto("/recipes/new")

      // autoFocus=true sur InlineEditText — le champ est directement actif
      const nameInput = page.getByPlaceholder("Nom de la recette")
      await nameInput.fill("Nouvelle pizza")

      const submitBtn = page.getByRole("button", { name: /créer la recette/i }).first()
      await expect(submitBtn).toBeEnabled()

      await submitBtn.click()

      // Après création, on quitte /recipes/new
      await expect(page).not.toHaveURL(/\/recipes\/new/, { timeout: 8000 })
    })

    test("affiche les catégories disponibles dans le formulaire", async ({ page }) => {
      await page.goto("/recipes/new")
      await expect(page.getByText("Plat principal")).toBeVisible()
      await expect(page.getByText("Entrée")).toBeVisible()
      await expect(page.getByText("Dessert")).toBeVisible()
    })

    test("affiche les saisons dans le formulaire", async ({ page }) => {
      await page.goto("/recipes/new")
      await expect(page.getByText(/printemps/i)).toBeVisible()
      await expect(page.getByText(/été/i)).toBeVisible()
      await expect(page.getByText(/automne/i)).toBeVisible()
      await expect(page.getByText(/hiver/i)).toBeVisible()
    })
  })

  test.describe("Détail d'une recette", () => {
    test("affiche le détail d'une recette", async ({ page }) => {
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByRole("heading", { name: "Pizza maison" })).toBeVisible()
    })

    test("affiche les ingrédients de la recette", async ({ page }) => {
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByText(/farine/i)).toBeVisible()
      await expect(page.getByText(/mozzarella/i)).toBeVisible()
    })

    test("affiche les instructions de la recette", async ({ page }) => {
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByText(/pétrir la pâte/i)).toBeVisible()
    })

    test("affiche la description de la recette", async ({ page }) => {
      await page.goto("/recipes/pizza-maison")
      await expect(page.getByText(/pizza classique/i)).toBeVisible()
    })
  })

  test.describe("Recherche et filtres", () => {
    test("le champ de recherche est présent", async ({ page }) => {
      await page.goto("/recipes")
      await expect(page.getByPlaceholder(/rechercher/i)).toBeVisible()
    })

    test("une recherche déclenche un appel API avec le paramètre search", async ({ page }) => {
      let searchQuery = ""
      await page.route("**/api/recipes?**", async (route) => {
        const url = route.request().url()
        const params = new URL(url).searchParams
        searchQuery = params.get("search") ?? ""
        await route.fulfill({ json: { ...RECIPES_LIST_RESPONSE, items: [], total: 0, total_pages: 1 } })
      })

      await page.goto("/recipes")
      const searchInput = page.getByPlaceholder(/rechercher/i)
      await searchInput.fill("pizza")

      await page.waitForTimeout(600)
      expect(searchQuery).toBe("pizza")
    })
  })
})
