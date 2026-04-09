import type { LLMConfig, LLMProvider } from '../../shared/types/llm.ts'
import { DEFAULT_LLM_CONFIG, LLM_PROVIDERS } from '../../shared/types/llm.ts'

const STORAGE_KEY = 'bonap_llm_config'

function getEnvOverrides(): Partial<LLMConfig> {
  const env = window.__ENV__
  if (!env) return {}
  const overrides: Partial<LLMConfig> = {}
  if (env.LLM_PROVIDER) overrides.provider = env.LLM_PROVIDER as LLMProvider
  if (env.LLM_API_KEY) overrides.apiKey = env.LLM_API_KEY
  if (env.LLM_MODEL) overrides.model = env.LLM_MODEL
  if (env.LLM_OLLAMA_URL) overrides.ollamaBaseUrl = env.LLM_OLLAMA_URL
  return overrides
}

export function getLLMEnvFields(): Set<keyof LLMConfig> {
  const env = window.__ENV__
  const fields = new Set<keyof LLMConfig>()
  if (env?.LLM_PROVIDER) fields.add('provider')
  if (env?.LLM_API_KEY) fields.add('apiKey')
  if (env?.LLM_MODEL) fields.add('model')
  if (env?.LLM_OLLAMA_URL) fields.add('ollamaBaseUrl')
  return fields
}

export class LLMConfigService {
  load(): LLMConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const stored = raw ? (JSON.parse(raw) as Partial<LLMConfig>) : {}
      return {
        ...DEFAULT_LLM_CONFIG,
        ...stored,
        ...getEnvOverrides(),
      } as LLMConfig
    } catch {
      return { ...DEFAULT_LLM_CONFIG, ...getEnvOverrides() } as LLMConfig
    }
  }

  save(config: LLMConfig): void {
    // Ne pas écraser les champs gérés par les variables d'environnement
    const envFields = getLLMEnvFields()
    const toSave = { ...config }
    for (const field of envFields) delete toSave[field]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  }

  isConfigured(): boolean {
    const config = this.load()
    if (config.provider === 'ollama') return Boolean(config.ollamaBaseUrl)
    return Boolean(config.apiKey)
  }

  async fetchModels(config: LLMConfig): Promise<string[]> {
    try {
      switch (config.provider) {
        case 'anthropic':
          return await fetchAnthropicModels(config.apiKey)
        case 'openai':
          return await fetchOpenAIModels(config.apiKey)
        case 'mistral':
          return await fetchMistralModels(config.apiKey)
        case 'ollama':
          return await fetchOllamaModels(config.ollamaBaseUrl)
        case 'openrouter':
          return await fetchOpenRouterModels(config.apiKey)
        default:
          return LLM_PROVIDERS[config.provider as LLMProvider]?.models ?? []
      }
    } catch {
      return LLM_PROVIDERS[config.provider as LLMProvider]?.models ?? []
    }
  }

  async testConnection(
    config: LLMConfig,
  ): Promise<{ ok: boolean; message: string }> {
    try {
      switch (config.provider) {
        case 'anthropic':
          return await testAnthropic(config.apiKey, config.model)
        case 'openai':
          return await testOpenAI(config.apiKey, config.model)
        case 'google':
          return await testGoogle(config.apiKey, config.model)
        case 'ollama':
          return await testOllama(config.ollamaBaseUrl)
        case 'openrouter':
          return await testOpenRouter(config.apiKey, config.model)
        default:
          return { ok: false, message: 'Fournisseur inconnu' }
      }
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur inconnue',
      }
    }
  }
}

async function testAnthropic(
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  })
  if (res.ok || res.status === 400) return { ok: true, message: 'Clé valide' }
  if (res.status === 401) return { ok: false, message: 'Clé invalide (401)' }
  return { ok: false, message: `Erreur ${res.status}` }
}

async function testOpenAI(
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  })
  if (res.ok || res.status === 400) return { ok: true, message: 'Clé valide' }
  if (res.status === 401) return { ok: false, message: 'Clé invalide (401)' }
  return { ok: false, message: `Erreur ${res.status}` }
}

async function testGoogle(
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }),
    },
  )
  if (res.ok || res.status === 400) return { ok: true, message: 'Clé valide' }
  if (res.status === 400) return { ok: false, message: 'Clé invalide (400)' }
  if (res.status === 403) return { ok: false, message: 'Clé invalide (403)' }
  return { ok: false, message: `Erreur ${res.status}` }
}

async function testOllama(
  baseUrl: string,
): Promise<{ ok: boolean; message: string }> {
  const url = baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${url}/api/version`)
  if (res.ok) {
    const data = (await res.json()) as { version?: string }
    return { ok: true, message: `Ollama ${data.version ?? ''}` }
  }
  return { ok: false, message: `Impossible de joindre Ollama (${res.status})` }
}

async function testOpenRouter(
  apiKey: string,
  model: string,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  })
  if (res.ok || res.status === 400) return { ok: true, message: 'Clé valide' }
  if (res.status === 401) return { ok: false, message: 'Clé invalide (401)' }
  return { ok: false, message: `Erreur ${res.status}` }
}

async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = (await res.json()) as { data: { id: string }[] }
  return data.data.map((m) => m.id).filter((id) => id.startsWith('claude-'))
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = (await res.json()) as { data: { id: string }[] }
  return data.data
    .map((m) => m.id)
    .filter((id) => /^(gpt-|o[1-9]|o[1-9]-|chatgpt-)/.test(id))
    .sort()
}

async function fetchMistralModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.mistral.ai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = (await res.json()) as { data: { id: string }[] }
  return data.data.map((m) => m.id).sort()
}

async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  const url = baseUrl.replace(/\/+$/, '')
  const res = await fetch(`${url}/api/tags`)
  if (!res.ok) throw new Error(`${res.status}`)
  const data = (await res.json()) as { models: { name: string }[] }
  return data.models.map((m) => m.name)
}

async function fetchOpenRouterModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  const data = (await res.json()) as { data: { id: string }[] }
  return data.data.map((m) => m.id).sort()
}

export const llmConfigService = new LLMConfigService()

export type { LLMProvider }
