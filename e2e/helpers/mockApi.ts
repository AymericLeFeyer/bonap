import type { Page } from "@playwright/test"
import {
  RECIPES_LIST_RESPONSE,
  RECIPE_PIZZA,
  RECIPE_SALADE,
  MEALPLANS_RESPONSE,
  SHOPPING_LISTS_RESPONSE,
  SHOPPING_LIST_BONAP_RESPONSE,
  SHOPPING_LIST_HABITUELS_RESPONSE,
  CATEGORIES_RESPONSE,
  TAGS_RESPONSE,
  FOODS_RESPONSE,
  UNITS_RESPONSE,
} from "../fixtures/mealie.ts"

/**
 * Configure le localStorage avec un faux token Mealie pour bypasser le login.
 */
export async function setAuthToken(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("bonap-mealie-token", "fake-token-e2e")
    localStorage.setItem("bonap-mealie-url", "http://localhost:9000")
  })
}

/**
 * Intercepte toutes les routes API Mealie avec des réponses mockées par défaut.
 * Chaque test peut surcharger les routes spécifiques dont il a besoin.
 */
export async function mockAllApiRoutes(page: Page) {
  // --- Recettes ---
  await page.route("**/api/recipes?**", async (route) => {
    const url = route.request().url()
    // Exclure les routes avec slug (/api/recipes/pizza-maison)
    if (url.includes("/api/recipes?")) {
      await route.fulfill({ json: RECIPES_LIST_RESPONSE })
    } else {
      await route.continue()
    }
  })

  await page.route("**/api/recipes/pizza-maison", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: RECIPE_PIZZA })
    } else if (route.request().method() === "PATCH") {
      await route.fulfill({ json: RECIPE_PIZZA })
    } else {
      await route.continue()
    }
  })

  await page.route("**/api/recipes/salade-nicoise", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: RECIPE_SALADE })
    } else if (route.request().method() === "PATCH") {
      await route.fulfill({ json: RECIPE_SALADE })
    } else {
      await route.continue()
    }
  })

  // POST /api/recipes (création)
  await page.route("**/api/recipes", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify("nouvelle-recette"),
      })
    } else {
      await route.continue()
    }
  })

  // --- Planning ---
  await page.route("**/api/households/mealplans**", async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      await route.fulfill({ json: MEALPLANS_RESPONSE })
    } else if (method === "POST") {
      await route.fulfill({
        json: {
          id: 99,
          date: "2026-04-07",
          entryType: "dinner",
          recipeId: "abc123",
          recipe: RECIPE_PIZZA,
        },
      })
    } else if (method === "DELETE") {
      await route.fulfill({ status: 200, body: "" })
    } else {
      await route.continue()
    }
  })

  // --- Shopping lists ---
  // Utiliser un regex pour matcher /lists et /lists?... mais PAS /lists/:id
  await page.route(/\/api\/households\/shopping\/lists(\?[^/]*)?$/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: SHOPPING_LISTS_RESPONSE })
    } else if (route.request().method() === "POST") {
      await route.fulfill({ json: { id: "list-new", name: "Bonap" } })
    } else {
      await route.continue()
    }
  })

  await page.route("**/api/households/shopping/lists/list-bonap", async (route) => {
    await route.fulfill({ json: SHOPPING_LIST_BONAP_RESPONSE })
  })

  await page.route("**/api/households/shopping/lists/list-habituels", async (route) => {
    await route.fulfill({ json: SHOPPING_LIST_HABITUELS_RESPONSE })
  })

  // --- Shopping items ---
  await page.route("**/api/households/shopping/items/create-bulk", async (route) => {
    await route.fulfill({
      json: [
        {
          id: "item-new",
          shoppingListId: "list-bonap",
          checked: false,
          position: 10,
          isFood: false,
          note: "Nouvel article",
          quantity: 1,
        },
      ],
    })
  })

  await page.route("**/api/households/shopping/items", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() ?? []
      await route.fulfill({ json: body })
    } else {
      await route.continue()
    }
  })

  await page.route("**/api/households/shopping/items?**", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 200, body: "" })
    } else {
      await route.continue()
    }
  })

  // --- Référentiels ---
  await page.route("**/api/organizers/categories**", async (route) => {
    await route.fulfill({ json: CATEGORIES_RESPONSE })
  })

  await page.route("**/api/organizers/tags**", async (route) => {
    await route.fulfill({ json: TAGS_RESPONSE })
  })

  await page.route("**/api/foods**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: FOODS_RESPONSE })
    } else if (route.request().method() === "POST") {
      await route.fulfill({ json: { id: "f-new", name: "nouvel aliment" } })
    } else {
      await route.continue()
    }
  })

  await page.route("**/api/units**", async (route) => {
    await route.fulfill({ json: UNITS_RESPONSE })
  })

  // Statistiques (utilisé dans StatsPage)
  await page.route("**/api/households/statistics**", async (route) => {
    await route.fulfill({ json: { totalRecipes: 2 } })
  })

  // Images recettes — retourner un placeholder (1x1 px transparent)
  await page.route("**/api/media/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64",
      ),
    })
  })
}
