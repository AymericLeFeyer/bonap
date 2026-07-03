export type LLMProvider =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'perplexity'
  | 'ollama'
  | 'openrouter'
  | 'opencode'
  | 'opencode-go'

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  model: string
  ollamaBaseUrl: string
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-4-6',
  ollamaBaseUrl: 'http://localhost:11434',
}

export const LLM_PROVIDERS: Record<
  LLMProvider,
  { label: string; models: string[]; needsKey: boolean }
> = {
  anthropic: {
    label: 'Anthropic',
    models: [
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-6',
      'claude-opus-4-6',
    ],
    needsKey: true,
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
    needsKey: true,
  },
  google: {
    label: 'Google',
    models: ['gemini-flash-lite-latest', 'gemini-flash-latest','gemini-pro-latest'],
    needsKey: true,
  },
  mistral: {
    label: 'Mistral',
    models: [
      'mistral-large-latest',
      'mistral-small-latest',
      'open-mistral-nemo',
    ],
    needsKey: true,
  },
  perplexity: {
    label: 'Perplexity',
    models: ['sonar-pro', 'sonar', 'sonar-reasoning'],
    needsKey: true,
  },
  ollama: {
    label: 'Ollama (local)',
    models: [],
    needsKey: false,
  },
  openrouter: {
    label: 'OpenRouter',
    models: [
      'anthropic/claude-sonnet-4-6',
      'openai/gpt-4o',
      'google/gemini-2.5-flash',
      'mistral/mistral-large-latest',
      'stepfun/step-3.5-flash:free',
      'arcee-ai/trinity-large-preview:free',
      'z-ai/glm-4.5-air:free',
      'arcee-ai/trinity-mini:free',
      'google/gemma-3-27b-it:free',
      'openrouter/free',
    ],
    needsKey: true,
  },
  'opencode-go': {
    label: 'OpenCode Go',
    models: [
      'minimax-m3',
      'minimax-m2.7',
      'qwen3.7-max',
      'qwen3.7-plus',
      'qwen3.6-plus',
      'mimo-v2.5-pro',
      'mimo-v2.5',
      'glm-5.2',
      'kimi-k2.7-code',
      'kimi-k2.6',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
    ],
    needsKey: true,
  },
  opencode: {
    label: 'OpenCode Zen',
    models: [
      'claude-sonnet-4-6',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
      'gpt-5.5',
      'gpt-5.4',
      'gpt-5',
      'gemini-3.1-pro',
      'gemini-3-flash',
      'minimax-m3',
      'qwen3.7-max',
      'kimi-k2.7-code',
      'deepseek-v4-pro',
    ],
    needsKey: true,
  },
}
