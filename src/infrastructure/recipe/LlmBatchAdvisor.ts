import type { BatchAdvice, BatchCandidate, IBatchAdvisor } from "../../domain/recipe/services/IBatchAdvisor.ts"
import { llmChat } from "../llm/LLMService.ts"
import { BATCH_SYSTEM_PROMPT, buildBatchPrompt, parseBatchResponse } from "./batchPrompts.ts"

type ChatFn = (systemPrompt: string, userMessage: string) => Promise<string>

/** Adaptateur IA : appel depuis le navigateur via llmChat (la clé API reste locale). */
export class LlmBatchAdvisor implements IBatchAdvisor {
  private readonly chat: ChatFn

  constructor(chat: ChatFn = llmChat) {
    this.chat = chat
  }

  async adviseBatchRecipes(candidates: BatchCandidate[]): Promise<BatchAdvice[]> {
    if (candidates.length === 0) return []
    return parseBatchResponse(await this.chat(BATCH_SYSTEM_PROMPT, buildBatchPrompt(candidates)), candidates)
  }
}
