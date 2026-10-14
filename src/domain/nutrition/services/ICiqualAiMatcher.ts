import type { CiqualFood } from "../entities/NutritionFood.ts"

export type AiConfidence = "haute" | "moyenne" | "basse"

export interface CiqualMatchRequest {
  key: string
  label: string
  candidates: CiqualFood[]
}

export interface CiqualMatchChoice {
  key: string
  code: string | null
  confidence: AiConfidence
  searchTerm: string | null
}

export interface PieceWeightRequest {
  label: string
  ciqualName: string
}

export interface PieceWeightEstimate {
  grams: number
  confidence: AiConfidence
}

/**
 * Port vers l'IA : elle désigne un aliment CIQUAL existant parmi des
 * candidats, ou estime le poids d'une pièce. Elle ne fournit jamais de
 * valeurs nutritionnelles.
 */
export interface ICiqualAiMatcher {
  matchFoods(requests: CiqualMatchRequest[]): Promise<CiqualMatchChoice[]>
  estimatePieceWeight(request: PieceWeightRequest): Promise<PieceWeightEstimate | null>
}
