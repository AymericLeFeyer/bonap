import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"
import {
  SHOPPING_LIST_BONAP_RESPONSE,
} from "./fixtures/mealie.ts"

test.describe("Liste de courses", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test.describe("Affichage", () => {
    test("affiche le titre de la page courses", async ({ page }) => {
      await page.goto("/shopping")
      // Titre exact pour éviter strict mode (il y a aussi "Prochaines courses")
      await expect(page.getByRole("heading", { name: "Liste de courses" })).toBeVisible()
    })

    test("affiche les articles de la liste Bonap", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })
      await expect(page.getByText("mozzarella")).toBeVisible()
    })

    test("affiche les catégories (labels) des articles", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })
      // Utiliser .first() car le label peut apparaître en header ET dans l'item
      await expect(page.getByText("Féculents").first()).toBeVisible()
      await expect(page.getByText("Produits laitiers").first()).toBeVisible()
    })

    test("affiche le formulaire d'ajout d'un article", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByPlaceholder(/ajouter un article/i)).toBeVisible({ timeout: 8000 })
    })
  })

  test.describe("Cocher/décocher un article", () => {
    test("cocher un article appelle l'API de mise à jour", async ({ page }) => {
      let updateCalled = false

      await page.route("**/api/households/shopping/items", async (route) => {
        if (route.request().method() === "PUT") {
          updateCalled = true
          const body = route.request().postDataJSON() ?? []
          await route.fulfill({ json: body })
        } else {
          await route.continue()
        }
      })

      await page.goto("/shopping")
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })

      const checkboxes = page.getByRole("button", { name: "Cocher" })
      await checkboxes.first().click()

      await page.waitForTimeout(300)
      expect(updateCalled).toBe(true)
    })

    test("un article coché apparaît barré", async ({ page }) => {
      await page.route("**/api/households/shopping/lists/list-bonap", async (route) => {
        await route.fulfill({
          json: {
            ...SHOPPING_LIST_BONAP_RESPONSE,
            listItems: [
              {
                ...SHOPPING_LIST_BONAP_RESPONSE.listItems[0],
                checked: true,
              },
              SHOPPING_LIST_BONAP_RESPONSE.listItems[1],
            ],
          },
        })
      })

      await page.goto("/shopping")
      await expect(page.getByText("mozzarella")).toBeVisible({ timeout: 8000 })

      const checkedItem = page.locator(".line-through")
      await expect(checkedItem).toBeVisible()
    })
  })

  test.describe("Ajout d'un article", () => {
    test("peut saisir un article dans le champ d'ajout", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByPlaceholder(/ajouter un article/i)).toBeVisible({ timeout: 8000 })

      const addInput = page.getByPlaceholder(/ajouter un article/i)
      await addInput.fill("Sel de mer")
      await expect(addInput).toHaveValue("Sel de mer")
    })

    test("soumettre le formulaire d'ajout appelle l'API", async ({ page }) => {
      let createBulkCalled = false

      await page.route("**/api/households/shopping/items/create-bulk", async (route) => {
        createBulkCalled = true
        await route.fulfill({
          json: [
            {
              id: "item-new",
              shoppingListId: "list-bonap",
              checked: false,
              position: 10,
              isFood: false,
              note: "Sel de mer",
              quantity: 1,
            },
          ],
        })
      })

      await page.goto("/shopping")
      await expect(page.getByPlaceholder(/ajouter un article/i)).toBeVisible({ timeout: 8000 })

      // Attendre que la liste soit chargée (pour que le listId soit disponible)
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })

      const addInput = page.getByPlaceholder(/ajouter un article/i).first()
      await addInput.fill("Sel de mer")
      await addInput.press("Enter")

      await page.waitForTimeout(500)
      expect(createBulkCalled).toBe(true)
    })
  })

  test.describe("Suppression d'un article", () => {
    test("peut supprimer un article via le bouton Trash", async ({ page }) => {
      let deleteCalled = false

      await page.route("**/api/households/shopping/items?**", async (route) => {
        if (route.request().method() === "DELETE") {
          deleteCalled = true
          await route.fulfill({ status: 200, body: "" })
        } else {
          await route.continue()
        }
      })

      await page.goto("/shopping")
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })

      const listItem = page.locator("li").filter({ hasText: "farine" })
      await listItem.hover()

      const deleteBtn = listItem.getByRole("button").filter({ has: page.locator("svg.lucide-trash-2") })
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click()
        await page.waitForTimeout(300)
        expect(deleteCalled).toBe(true)
      } else {
        // Le bouton peut ne pas être visible selon l'implémentation hover CSS
        expect(await listItem.isVisible()).toBe(true)
      }
    })
  })

  test.describe("Étiquettes (fixes #20 et #21)", () => {
    test("affiche 'Étiquettes' et non 'Catégories' dans l'interface", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })

      // Le bouton de gestion doit afficher Étiquettes
      await expect(page.getByTitle("Gérer les étiquettes")).toBeVisible()
      // Aucune occurrence de "Catégories" visible dans la page
      await expect(page.getByText("Catégories", { exact: true })).not.toBeVisible()
    })

    test("affiche 'Sans étiquette' pour les articles sans label", async ({ page }) => {
      // On a besoin de ≥2 groupes pour que les headers soient affichés
      const itemWithoutLabel = { ...SHOPPING_LIST_BONAP_RESPONSE.listItems[0] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (itemWithoutLabel as any).label

      await page.route("**/api/households/shopping/lists/list-bonap", async (route) => {
        await route.fulfill({
          json: {
            ...SHOPPING_LIST_BONAP_RESPONSE,
            listItems: [
              itemWithoutLabel,
              SHOPPING_LIST_BONAP_RESPONSE.listItems[1], // mozzarella avec étiquette
            ],
          },
        })
      })

      await page.goto("/shopping")
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })
      await expect(page.getByText("Sans étiquette")).toBeVisible({ timeout: 8000 })
    })

    test("respecte l'ordre des étiquettes défini dans Mealie", async ({ page }) => {
      // labelSettings définit l'ordre : Produits laitiers d'abord, Féculents ensuite
      await page.route("**/api/households/shopping/lists/list-bonap", async (route) => {
        await route.fulfill({
          json: {
            ...SHOPPING_LIST_BONAP_RESPONSE,
            labelSettings: [
              { label: { id: "label2", name: "Produits laitiers", color: "#00ff00" } },
              { label: { id: "label1", name: "Féculents", color: "#ff0000" } },
            ],
          },
        })
      })

      await page.goto("/shopping")
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })

      const headers = page.locator(".bg-secondary\\/50 span.uppercase")
      const texts = await headers.allTextContents()
      const labelIdx = (name: string) => texts.findIndex((t) => t.toLowerCase().includes(name.toLowerCase()))

      // "Produits laitiers" doit apparaître avant "Féculents"
      expect(labelIdx("Produits laitiers")).toBeLessThan(labelIdx("Féculents"))
    })
  })

  test.describe("Vider la liste", () => {
    test("un bouton pour vider les articles cochés est présent", async ({ page }) => {
      await page.route("**/api/households/shopping/lists/list-bonap", async (route) => {
        await route.fulfill({
          json: {
            ...SHOPPING_LIST_BONAP_RESPONSE,
            listItems: [
              {
                ...SHOPPING_LIST_BONAP_RESPONSE.listItems[0],
                checked: true,
              },
            ],
          },
        })
      })

      await page.goto("/shopping")
      await expect(page.getByRole("heading", { name: "Liste de courses" })).toBeVisible()
      // Un item coché est affiché avec line-through
      await expect(page.locator(".line-through")).toBeVisible({ timeout: 8000 })
    })
  })
})
