import type {
  CiqualMatchChoice,
  CiqualMatchRequest,
  ICiqualAiMatcher,
  PieceWeightEstimate,
  PieceWeightRequest,
} from "../../domain/nutrition/services/ICiqualAiMatcher.ts"
import { llmChat } from "../llm/LLMService.ts"
import {
  buildMatchPrompt,
  buildPieceWeightPrompt,
  parseMatchResponse,
  parsePieceWeightResponse,
} from "./ciqualPrompts.ts"

const PIECE_WEIGHT_SYSTEM_PROMPT = "Tu es un expert des aliments vendus en France."

type ChatFn = (systemPrompt: string, userMessage: string) => Promise<string>

/**
 * Adaptateur IA : la requête part du navigateur via llmChat, la clé API ne
 * le quitte donc jamais.
 */
export class LlmCiqualMatcher implements ICiqualAiMatcher {
  private readonly chat: ChatFn

  constructor(chat: ChatFn = llmChat) {
    this.chat = chat
  }

  async matchFoods(requests: CiqualMatchRequest[]): Promise<CiqualMatchChoice[]> {
    if (requests.length === 0) return []
    const { system, user } = buildMatchPrompt(requests)
    return parseMatchResponse(await this.chat(system, user), requests)
  }

  async estimatePieceWeight(request: PieceWeightRequest): Promise<PieceWeightEstimate | null> {
    return parsePieceWeightResponse(await this.chat(PIECE_WEIGHT_SYSTEM_PROMPT, buildPieceWeightPrompt(request)))
  }
}
