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
      'deepseek-v4-flash',
      'deepseek-v4-pro',
      'glm-5.2',
      'qwen3.7-max',
      'qwen3.7-plus',
      'minimax-m3',
    ],
    needsKey: true,
  },
  opencode: {
    label: 'OpenCode Zen',
    models: [
      'claude-haiku-4-5',
      'claude-sonnet-5',
      'claude-opus-4-8',
      'gpt-5-nano',
      'gpt-5.5',
      'gpt-5.5-pro',
      'gemini-3-flash',
      'gemini-3.1-pro',
      'grok-build-0.1',
      'minimax-m3',
      'deepseek-v4-flash',
      'deepseek-v4-flash-free',
      'deepseek-v4-pro',
      'qwen3.7-plus',
      'qwen3.7-max',
      'glm-5.2',
    ],
    needsKey: true,
  },
}
