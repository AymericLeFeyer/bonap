import { afterEach, describe, expect, it, vi } from "vitest"
import { LLM_PROVIDERS, type LLMProvider } from "../../shared/types/llm.ts"
import { llmConfigService } from "./LLMConfigService.ts"

describe("llmConfigService.testConnection", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(Object.keys(LLM_PROVIDERS) as LLMProvider[])(
    "sait tester le fournisseur %s",
    async (provider) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(JSON.stringify({ models: [] }), { status: 200 })),
      )
      const result = await llmConfigService.testConnection({
        provider,
        apiKey: "test-key",
        model: "test-model",
        ollamaBaseUrl: "http://localhost:11434",
      })
      expect(result.message).not.toBe("Fournisseur inconnu")
      expect(result.ok).toBe(true)
    },
  )

  it("appelle l'API Mistral pour le fournisseur mistral", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    await llmConfigService.testConnection({
      provider: "mistral",
      apiKey: "test-key",
      model: "mistral-small-latest",
      ollamaBaseUrl: "",
    })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mistral.ai/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    )
  })
})
