import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"

test.describe("Navigation — accès aux pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test("redirige / vers /recipes", async ({ page }) => {
    await page.goto("/")
    await page.waitForURL("**/recipes**")
    await expect(page).toHaveURL(/\/recipes/)
  })

  test("page Recettes est accessible depuis la sidebar", async ({ page }) => {
    await page.goto("/recipes")
    await expect(page.getByRole("heading", { name: "Mes recettes" })).toBeVisible()
  })

  test("page Planning est accessible", async ({ page }) => {
    await page.goto("/planning")
    await expect(page.getByRole("heading", { name: "Planning" })).toBeVisible()
  })

  test("page Statistiques est accessible", async ({ page }) => {
    await page.goto("/stats")
    // La page stats a un titre
    await expect(page.getByRole("heading", { name: /statistiques/i })).toBeVisible()
  })

  test("page Courses est accessible", async ({ page }) => {
    await page.goto("/shopping")
    await expect(page.getByRole("heading", { name: "Liste de courses" })).toBeVisible()
  })

  test("page Paramètres est accessible", async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: /param/i })).toBeVisible()
  })

  test("la sidebar contient les liens de navigation principaux", async ({ page }) => {
    await page.goto("/recipes")
    // Les liens de la sidebar sont présents
    await expect(page.getByRole("link", { name: /planning/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /courses/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /recettes/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /statistiques/i })).toBeVisible()
    await expect(page.getByRole("link", { name: "Paramètres", exact: true })).toBeVisible()
  })

  test("navigation depuis la sidebar vers Planning", async ({ page }) => {
    await page.goto("/recipes")
    await page.getByRole("link", { name: /planning/i }).click()
    await expect(page).toHaveURL(/\/planning/)
    await expect(page.getByRole("heading", { name: "Planning" })).toBeVisible()
  })

  test("navigation depuis la sidebar vers Courses", async ({ page }) => {
    await page.goto("/recipes")
    await page.getByRole("link", { name: /courses/i }).click()
    await expect(page).toHaveURL(/\/shopping/)
  })
})
