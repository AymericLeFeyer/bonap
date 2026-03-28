import type { LLMConfig, LLMProvider } from "../../shared/types/llm.ts"
import { DEFAULT_LLM_CONFIG } from "../../shared/types/llm.ts"

const STORAGE_KEY = "bonap_llm_config"

export class LLMConfigService {
  load(): LLMConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...DEFAULT_LLM_CONFIG }
      return { ...DEFAULT_LLM_CONFIG, ...JSON.parse(raw) } as LLMConfig
    } catch {
      return { ...DEFAULT_LLM_CONFIG }
    }
  }

  save(config: LLMConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }

  isConfigured(): boolean {
    const config = this.load()
    if (config.provider === "ollama") return Boolean(config.ollamaBaseUrl)
    return Boolean(config.apiKey)
  }

  async testConnection(config: LLMConfig): Promise<{ ok: boolean; message: string }> {
    try {
      switch (config.provider) {
        case "anthropic":
          return await testAnthropic(config.apiKey, config.model)
        case "openai":
          return await testOpenAI(config.apiKey, config.model)
        case "google":
          return await testGoogle(config.apiKey, config.model)
        case "ollama":
          return await testOllama(config.ollamaBaseUrl)
        default:
          return { ok: false, message: "Fournisseur inconnu" }
      }
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Erreur inconnue" }
    }
  }
}

async function testAnthropic(apiKey: string, model: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "Hi" }],
    }),
  })
  if (res.ok || res.status === 400) return { ok: true, message: "Clé valide" }
  if (res.status === 401) return { ok: false, message: "Clé invalide (401)" }
  return { ok: false, message: `Erreur ${res.status}` }
}

async function testOpenAI(apiKey: string, model: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "Hi" }],
    }),
  })
  if (res.ok || res.status === 400) return { ok: true, message: "Clé valide" }
  if (res.status === 401) return { ok: false, message: "Clé invalide (401)" }
  return { ok: false, message: `Erreur ${res.status}` }
}

async function testGoogle(apiKey: string, model: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] }),
    },
  )
  if (res.ok || res.status === 400) return { ok: true, message: "Clé valide" }
  if (res.status === 400) return { ok: false, message: "Clé invalide (400)" }
  if (res.status === 403) return { ok: false, message: "Clé invalide (403)" }
  return { ok: false, message: `Erreur ${res.status}` }
}

async function testOllama(baseUrl: string): Promise<{ ok: boolean; message: string }> {
  const url = baseUrl.replace(/\/+$/, "")
  const res = await fetch(`${url}/api/version`)
  if (res.ok) {
    const data = await res.json() as { version?: string }
    return { ok: true, message: `Ollama ${data.version ?? ""}` }
  }
  return { ok: false, message: `Impossible de joindre Ollama (${res.status})` }
}

export const llmConfigService = new LLMConfigService()

export type { LLMProvider }
