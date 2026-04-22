import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"

test.describe("Liste de courses — Habituels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test.describe("Section Habituels", () => {
    test("affiche la section Habituels", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByRole("heading", { name: "Habituels" })).toBeVisible({ timeout: 8000 })
    })

    test("affiche le formulaire d'ajout d'habituel", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByPlaceholder(/ajouter un habituel/i)).toBeVisible({ timeout: 8000 })
    })

    test("ajouter un habituel déclenche un appel API vers la liste Habituels", async ({ page }) => {
      let createCalled = false

      await page.route("**/api/households/shopping/items/create-bulk", async (route) => {
        const body = route.request().postDataJSON() ?? []
        const targetsHabituels = Array.isArray(body) && body.some(
          (item: { shoppingListId?: string }) => item.shoppingListId === "list-habituels",
        )
        if (targetsHabituels) createCalled = true
        await route.fulfill({
          json: [
            {
              id: "hab-new",
              shoppingListId: "list-habituels",
              checked: false,
              position: 10,
              isFood: false,
              note: "Pain",
              quantity: 1,
            },
          ],
        })
      })

      await page.goto("/shopping")
      const input = page.getByPlaceholder(/ajouter un habituel/i)
      await expect(input).toBeVisible({ timeout: 8000 })
      await input.fill("Pain")
      await input.press("Enter")

      await expect.poll(() => createCalled, { timeout: 5000 }).toBe(true)
    })
  })

  test.describe("Catalogue par défaut", () => {
    // Le catalogue est activé par défaut (null === true dans useDefaultHabituels)
    test("bouton Catalogue présent par défaut", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByRole("heading", { name: "Habituels" })).toBeVisible({ timeout: 8000 })
      await expect(page.getByRole("button", { name: /catalogue/i })).toBeVisible()
    })

    test("ouvrir le catalogue affiche les catégories fruits et légumes", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByRole("heading", { name: "Habituels" })).toBeVisible({ timeout: 8000 })
      await page.getByRole("button", { name: /catalogue/i }).click()

      await expect(page.getByRole("dialog")).toBeVisible()
      await expect(page.getByText("Fruits", { exact: true })).toBeVisible()
      await expect(page.getByText("Légumes", { exact: true })).toBeVisible()
    })

    test("cliquer sur une catégorie révèle ses items", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByRole("heading", { name: "Habituels" })).toBeVisible({ timeout: 8000 })
      await page.getByRole("button", { name: /catalogue/i }).click()

      await page.getByText("Fruits", { exact: true }).click()

      await expect(page.getByText("Pomme", { exact: true }).first()).toBeVisible()
      await expect(page.getByText("Banane", { exact: true }).first()).toBeVisible()
    })

    test("ajouter un item depuis le catalogue appelle l'API", async ({ page }) => {
      let addedItem: string | null = null

      await page.route("**/api/households/shopping/items/create-bulk", async (route) => {
        const body = route.request().postDataJSON() ?? []
        const first = Array.isArray(body) ? body[0] : null
        if (first?.shoppingListId === "list-habituels") {
          addedItem = first.note
        }
        await route.fulfill({
          json: [
            {
              id: "hab-catalogue",
              shoppingListId: "list-habituels",
              checked: false,
              position: 10,
              isFood: false,
              note: addedItem ?? "",
              quantity: 1,
            },
          ],
        })
      })

      await page.goto("/shopping")
      await expect(page.getByRole("heading", { name: "Habituels" })).toBeVisible({ timeout: 8000 })
      await page.getByRole("button", { name: /catalogue/i }).click()
      await page.getByText("Légumes", { exact: true }).click()

      await page.getByRole("button", { name: /ajouter carotte/i }).click()

      await expect.poll(() => addedItem, { timeout: 5000 }).toBe("Carotte")
    })
  })

  test.describe("Impression / export PDF", () => {
    test("bouton d'impression présent dans le header", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByRole("button", { name: /imprimer|pdf/i })).toBeVisible({ timeout: 8000 })
    })

    test("bouton d'impression désactivé si liste vide", async ({ page }) => {
      await page.route("**/api/households/shopping/lists/list-bonap", async (route) => {
        await route.fulfill({
          json: {
            id: "list-bonap",
            name: "Bonap",
            listItems: [],
            labelSettings: [],
          },
        })
      })

      await page.goto("/shopping")
      const printBtn = page.getByRole("button", { name: /imprimer|pdf/i })
      await expect(printBtn).toBeVisible({ timeout: 8000 })
      await expect(printBtn).toBeDisabled()
    })

    test("cliquer sur imprimer injecte un iframe dans le DOM", async ({ page }) => {
      await page.goto("/shopping")
      await expect(page.getByText("farine")).toBeVisible({ timeout: 8000 })

      // Stub l'appel print() qui ouvre une vraie popup navigateur
      await page.evaluate(() => {
        const origCreateElement = document.createElement.bind(document)
        ;(document as unknown as { createElement: typeof document.createElement }).createElement =
          function (tag: string) {
            const el = origCreateElement(tag)
            if (tag.toLowerCase() === "iframe") {
              el.addEventListener("load", () => {
                const iframe = el as HTMLIFrameElement
                if (iframe.contentWindow) {
                  iframe.contentWindow.print = () => { (window as unknown as { __printCalled?: boolean }).__printCalled = true }
                }
              })
            }
            return el
          }
      })

      await page.getByRole("button", { name: /imprimer|pdf/i }).click()

      // Vérifie qu'un iframe a été injecté (même s'il est retiré vite)
      // On attend que print() ait été appelé
      await expect.poll(
        () => page.evaluate(() => (window as unknown as { __printCalled?: boolean }).__printCalled === true),
        { timeout: 5000 },
      ).toBe(true)
    })
  })
})
