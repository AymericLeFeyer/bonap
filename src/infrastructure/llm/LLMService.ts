import { llmConfigService } from './LLMConfigService.ts'
import type { LLMConfig } from '../../shared/types/llm.ts'

/**
 * Sends a single chat turn to the configured LLM provider.
 * Returns the raw text of the assistant response.
 */
export async function llmChat(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const config = llmConfigService.load()
  if (!llmConfigService.isConfigured()) {
    throw new Error(
      'Aucun fournisseur IA configuré. Rendez-vous dans les Paramètres.',
    )
  }
  switch (config.provider) {
    case 'anthropic':
      return callAnthropic(config, systemPrompt, userMessage)
    case 'openai':
      return callOpenAI(config, systemPrompt, userMessage)
    case 'google':
      return callGoogle(config, systemPrompt, userMessage)
    case 'mistral':
      return callMistral(config, systemPrompt, userMessage)
    case 'perplexity':
      return callPerplexity(config, systemPrompt, userMessage)
    case 'openrouter':
      return callOpenRouter(config, systemPrompt, userMessage)
    case 'ollama':
      return callOllama(config, systemPrompt, userMessage)
    default:
      throw new Error('Fournisseur IA inconnu')
  }
}

async function callAnthropic(
  config: LLMConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Anthropic ${res.status}: ${err}`)
  }
  const data = (await res.json()) as { content: Array<{ text: string }> }
  return data.content[0]?.text ?? ''
}

async function callOpenAI(
  config: LLMConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`OpenAI ${res.status}: ${err}`)
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0]?.message.content ?? ''
}

async function callGoogle(
  config: LLMConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
      }),
    },
  )
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Google ${res.status}: ${err}`)
  }
  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
  }
  return data.candidates[0]?.content.parts[0]?.text ?? ''
}

async function callMistral(
  config: LLMConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Mistral ${res.status}: ${err}`)
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0]?.message.content ?? ''
}

async function callPerplexity(
  config: LLMConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Perplexity ${res.status}: ${err}`)
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0]?.message.content ?? ''
}

async function callOllama(
  config: LLMConfig,
  system: string,
  user: string,
): Promise<string> {
  const base = config.ollamaBaseUrl.replace(/\/+$/, '')
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Ollama ${res.status}: ${err}`)
  }
  const data = (await res.json()) as { message: { content: string } }
  return data.message?.content ?? ''
}

async function callOpenRouter(
  config: LLMConfig,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`OpenRouter ${res.status}: ${err}`)
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  return data.choices[0]?.message.content ?? ''
}
