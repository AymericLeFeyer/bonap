/**
 * Assistant service — handles streaming chat with tool use.
 *
 * Streaming + tools are implemented for Anthropic (primary).
 * Other providers fall back to a single non-streaming call with JSON-based actions.
 */
import { llmConfigService } from './LLMConfigService.ts'
import type { LLMConfig } from '../../shared/types/llm.ts'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AssistantTool {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (input: Record<string, unknown>) => Promise<string>
}

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

export interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
}

// ─── Anthropic tool definitions ───────────────────────────────────────────────

const ANTHROPIC_TOOLS = [
  {
    name: 'search_recipe',
    description:
      'Recherche des recettes par nom ou mots-clés dans la bibliothèque Mealie.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Terme de recherche' },
      },
      required: ['query'],
    },
  },
  {
    name: 'add_to_planning',
    description: "Ajoute une recette au planning de l'utilisateur.",
    input_schema: {
      type: 'object',
      properties: {
        recipe_slug: {
          type: 'string',
          description: 'Slug exact de la recette',
        },
        recipe_id: { type: 'string', description: 'ID exact de la recette' },
        date: {
          type: 'string',
          description:
            'Date au format YYYY-MM-DD (optionnel, prochain créneau libre si absent)',
        },
        entry_type: {
          type: 'string',
          enum: ['lunch', 'dinner'],
          description: 'Déjeuner ou dîner',
        },
      },
      required: ['recipe_id'],
    },
  },
  {
    name: 'create_recipe',
    description:
      "Crée une nouvelle recette dans Mealie et propose de l'enregistrer.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: "Liste d'ingrédients en texte libre",
        },
        instructions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Étapes de la recette',
        },
      },
      required: ['name'],
    },
  },
]

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Sends a message to the assistant and emits streaming events.
 * @param history  Conversation history (user + assistant turns)
 * @param tools    Tool implementations keyed by name
 * @param onEvent  Callback for each event
 */
export async function sendAssistantMessage(
  history: AnthropicMessage[],
  tools: Record<string, AssistantTool>,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const config = llmConfigService.load()
  if (!llmConfigService.isConfigured()) {
    onEvent({
      type: 'error',
      message:
        'Aucun fournisseur IA configuré. Rendez-vous dans les Paramètres.',
    })
    onEvent({ type: 'done' })
    return
  }

  try {
    if (config.provider === 'anthropic') {
      await streamAnthropic(config, history, tools, onEvent)
    } else {
      await chatFallback(config, history, onEvent)
    }
  } catch (e) {
    onEvent({
      type: 'error',
      message: e instanceof Error ? e.message : 'Erreur inconnue',
    })
  } finally {
    onEvent({ type: 'done' })
  }
}

// ─── Anthropic streaming + tool use ──────────────────────────────────────────

async function streamAnthropic(
  config: LLMConfig,
  history: AnthropicMessage[],
  tools: Record<string, AssistantTool>,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
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
      stream: true,
      tools: ANTHROPIC_TOOLS,
      messages: history,
    }),
  })

  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`Anthropic ${res.status}: ${msg}`)
  }

  const { textBlocks, toolUseBlocks } = await readAnthropicStream(
    res.body,
    onEvent,
  )

  // If there are tool calls, execute them and loop
  if (toolUseBlocks.length > 0) {
    const assistantMessage: AnthropicMessage = {
      role: 'assistant',
      content: [
        ...textBlocks.map(
          (t): AnthropicContentBlock => ({ type: 'text', text: t }),
        ),
        ...toolUseBlocks,
      ],
    }

    const toolResults: AnthropicContentBlock[] = []
    for (const block of toolUseBlocks) {
      const toolName = block.name!
      onEvent({ type: 'tool_start', name: toolName })
      let result = ''
      const impl = tools[toolName]
      if (impl) {
        result = await impl.execute(block.input ?? {})
      } else {
        result = `Outil "${toolName}" non disponible.`
      }
      onEvent({ type: 'tool_result', name: toolName, result })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      })
    }

    const userToolResult: AnthropicMessage = {
      role: 'user',
      content: toolResults,
    }
    await streamAnthropic(
      config,
      [...history, assistantMessage, userToolResult],
      tools,
      onEvent,
    )
  }
}

async function readAnthropicStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
): Promise<{ textBlocks: string[]; toolUseBlocks: AnthropicContentBlock[] }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()

  const textBlocks: string[] = []
  const toolUseBlocks: AnthropicContentBlock[] = []

  interface BlockState {
    type: string
    id?: string
    name?: string
    inputJson: string
    text: string
  }
  const blockStates = new Map<number, BlockState>()

  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw || raw === '[DONE]') continue
      try {
        const evt = JSON.parse(raw) as Record<string, unknown>
        handleAnthropicEvent(
          evt,
          blockStates,
          textBlocks,
          toolUseBlocks,
          onEvent,
        )
      } catch {
        /* ignore malformed lines */
      }
    }
  }

  return { textBlocks, toolUseBlocks }
}

function handleAnthropicEvent(
  evt: Record<string, unknown>,
  blockStates: Map<
    number,
    {
      type: string
      id?: string
      name?: string
      inputJson: string
      text: string
    }
  >,
  textBlocks: string[],
  toolUseBlocks: AnthropicContentBlock[],
  onEvent: (event: StreamEvent) => void,
) {
  if (evt.type === 'content_block_start') {
    const index = evt.index as number
    const block = evt.content_block as Record<string, unknown>
    blockStates.set(index, {
      type: block.type as string,
      id: block.id as string | undefined,
      name: block.name as string | undefined,
      inputJson: '',
      text: '',
    })
  } else if (evt.type === 'content_block_delta') {
    const index = evt.index as number
    const delta = evt.delta as Record<string, unknown>
    const state = blockStates.get(index)
    if (!state) return

    if (delta.type === 'text_delta') {
      const text = delta.text as string
      state.text += text
      onEvent({ type: 'text', text })
    } else if (delta.type === 'input_json_delta') {
      state.inputJson += delta.partial_json as string
    }
  } else if (evt.type === 'content_block_stop') {
    const index = evt.index as number
    const state = blockStates.get(index)
    if (!state) return

    if (state.type === 'text') {
      textBlocks.push(state.text)
    } else if (state.type === 'tool_use') {
      let input: Record<string, unknown> = {}
      try {
        input = JSON.parse(state.inputJson) as Record<string, unknown>
      } catch {
        /* empty input */
      }
      toolUseBlocks.push({
        type: 'tool_use',
        id: state.id,
        name: state.name,
        input,
      })
    }
  }
}

// ─── Non-Anthropic fallback (no streaming, no tool use) ──────────────────────

async function chatFallback(
  config: LLMConfig,
  history: AnthropicMessage[],
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const messages = history.map((m) => ({
    role: m.role,
    content:
      typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
  }))

  let text = ''

  if (
    config.provider === 'openai' ||
    config.provider === 'mistral' ||
    config.provider === 'perplexity' ||
    config.provider === 'openrouter'
  ) {
    const endpoints: Record<string, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      mistral: 'https://api.mistral.ai/v1/chat/completions',
      perplexity: 'https://api.perplexity.ai/chat/completions',
      openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    }
    const res = await fetch(endpoints[config.provider], {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: config.model, messages }),
    })
    if (!res.ok) throw new Error(`${config.provider} ${res.status}`)
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>
    }
    text = data.choices[0]?.message.content ?? ''
  } else if (config.provider === 'google') {
    // Gemini attend role "user"/"model" (pas "assistant"), et l'API supporte CORS directement
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents }),
      },
    )
    if (!res.ok) throw new Error(`Google ${res.status}`)
    const data = (await res.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>
    }
    text = data.candidates[0]?.content.parts[0]?.text ?? ''
  } else if (config.provider === 'ollama') {
    const base = config.ollamaBaseUrl.replace(/\/+$/, '')
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.model, stream: false, messages }),
    })
    if (!res.ok) throw new Error(`Ollama ${res.status}`)
    const data = (await res.json()) as { message: { content: string } }
    text = data.message?.content ?? ''
  }

  // Emit text as a single chunk (simulated streaming)
  for (const word of text.split(' ')) {
    onEvent({ type: 'text', text: word ? word + ' ' : '' })
  }
}
