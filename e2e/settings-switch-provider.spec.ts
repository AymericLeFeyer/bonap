import { test, expect } from "@playwright/test"
import { setAuthToken, mockAllApiRoutes } from "./helpers/mockApi.ts"

test.describe("Settings — basculer le fournisseur LLM", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await setAuthToken(page)
    await mockAllApiRoutes(page)
  })

  test("changer provider + clé + modèle met à jour localStorage bonap_llm_config", async ({ page }) => {
    await page.goto("/settings")

    // Ouvrir la section "Fournisseur IA" (CollapsibleSection fermée par défaut).
    await page.getByRole("button", { name: /Fournisseur IA/ }).click()

    // État initial : provider Anthropic actif (DEFAULT_LLM_CONFIG).
    const anthropicBtn = page.getByRole("button", { name: "Anthropic", exact: true })
    await expect(anthropicBtn).toBeVisible()

    // Basculer vers OpenAI — handleProviderChange() prend le premier modèle "gpt-4o".
    await page.getByRole("button", { name: "OpenAI", exact: true }).click()

    // Le sélecteur de modèle est désormais visible (availableModels.length > 0).
    await expect(page.getByRole("button", { name: "gpt-4o", exact: true })).toBeVisible()

    // Changer de modèle → "gpt-4o-mini".
    await page.getByRole("button", { name: "gpt-4o-mini", exact: true }).click()

    // Renseigner la clé API (input #api-key, label "Clé API").
    await page.getByLabel("Clé API").fill("sk-test-e2e")

    // useEffect([config]) déclenche llmConfigService.save() à chaque changement.
    // La valeur finale doit contenir provider="openai", apiKey="sk-test-e2e",
    // model="gpt-4o-mini" et ollamaBaseUrl par défaut.
    await expect.poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem("bonap_llm_config"))
      return raw ? (JSON.parse(raw) as Record<string, string>) : null
    }).toEqual(
      expect.objectContaining({
        provider: "openai",
        apiKey: "sk-test-e2e",
        model: "gpt-4o-mini",
        ollamaBaseUrl: "http://localhost:11434",
      }),
    )

    // Feedback "Sauvegardé" visible (auto-reset après 1500 ms).
    await expect(page.getByText("Sauvegardé", { exact: true })).toBeVisible()
  })
})