import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"

test.describe("Settings — basculer thème et couleur d'accent", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test("changer thème (Sombre) + couleur (Bleu) met à jour localStorage + DOM", async ({ page }) => {
    await page.goto("/settings")

    // Ouvrir la section "Apparence" (CollapsibleSection fermée par défaut).
    await page.getByRole("button", { name: /Apparence/ }).click()

    // --- Thème : passer en Sombre ---
    await page.getByRole("button", { name: "Sombre", exact: true }).click()

    // localStorage.bonap_theme = "dark"
    await expect.poll(async () =>
      page.evaluate(() => localStorage.getItem("bonap_theme")),
    ).toBe("dark")

    // <html> a la classe "dark" (ThemeService.apply() toggle la classe).
    await expect(page.locator("html")).toHaveClass(/dark/)

    // --- Accent : passer en Bleu ---
    // Boutons couleur avec aria-label={color.name}. "Bleu" est unique.
    await page.getByRole("button", { name: "Bleu", exact: true }).click()

    // localStorage.bonap_accent = "blue"
    await expect.poll(async () =>
      page.evaluate(() => localStorage.getItem("bonap_accent")),
    ).toBe("blue")

    // CSS var --color-primary reflète la nouvelle couleur (teinte 250 = bleu).
    await expect.poll(async () =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--color-primary"),
      ),
    ).toContain("250")
  })
})