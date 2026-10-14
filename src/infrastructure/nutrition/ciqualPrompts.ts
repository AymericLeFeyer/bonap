import type {
  AiConfidence,
  CiqualMatchChoice,
  CiqualMatchRequest,
  PieceWeightEstimate,
  PieceWeightRequest,
} from "../../domain/nutrition/services/ICiqualAiMatcher.ts"

export const CIQUAL_MATCH_SYSTEM_PROMPT = `Tu es un expert de la table de composition nutritionnelle ANSES CIQUAL.
On te donne un ingrédient tel qu'il est écrit dans une recette, et une liste
d'aliments CIQUAL candidats identifiés par leur code.

Choisis l'aliment CIQUAL qui correspond le mieux à cet ingrédient tel qu'il
est acheté et pesé AVANT cuisson.

Règles :
- Choisis uniquement un code présent dans la liste.
- Privilégie la forme crue. À défaut, la forme la plus brute (nature, non préparée).
- Respecte les précisions explicites de l'ingrédient : conserve, surgelé, séché, fumé, allégé.
- Ignore les marques, les quantités et les unités.
- Si aucun candidat ne convient, ne choisis rien et propose un terme de recherche
  CIQUAL plus générique (1 à 3 mots).

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{"code": "<code>" ou null, "confidence": "haute" | "moyenne" | "basse",
 "searchTerm": "<terme>" ou null, "reason": "<une phrase courte>"}`

export const CIQUAL_BATCH_INSTRUCTION = `

Plusieurs ingrédients numérotés te sont donnés. Réponds UNIQUEMENT avec un
tableau JSON valide contenant un objet par ingrédient, avec en plus le champ
"ingredient": <numéro de l'ingrédient>.`

export const PIECE_WEIGHT_RANGE = { min: 1, max: 5000 }

const CONFIDENCES: AiConfidence[] = ["haute", "moyenne", "basse"]

function describeRequest(request: CiqualMatchRequest): string {
  const candidates = request.candidates.map((candidate) => `- ${candidate.code} : ${candidate.name}`).join("\n")
  return `Ingrédient : « ${request.label} »\nCandidats :\n${candidates}`
}

export function buildMatchPrompt(requests: CiqualMatchRequest[]): { system: string; user: string } {
  if (requests.length === 1) {
    return { system: CIQUAL_MATCH_SYSTEM_PROMPT, user: describeRequest(requests[0]) }
  }
  return {
    system: CIQUAL_MATCH_SYSTEM_PROMPT + CIQUAL_BATCH_INSTRUCTION,
    user: requests.map((request, index) => `${index + 1}. ${describeRequest(request)}`).join("\n\n"),
  }
}

export function buildPieceWeightPrompt(request: PieceWeightRequest): string {
  return `Donne le poids moyen, en grammes, d'une pièce entière et crue, telle qu'achetée
en France, de l'aliment suivant : « ${request.ciqualName} » (écrit dans la recette : « ${request.label} »).

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{"grams": <nombre>, "confidence": "haute" | "moyenne" | "basse"}`
}

function extractJson(raw: string): unknown {
  const start = raw.search(/[[{]/)
  if (start === -1) return null
  const closing = raw[start] === "[" ? "]" : "}"
  const end = raw.lastIndexOf(closing)
  if (end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function readConfidence(value: unknown): AiConfidence {
  return CONFIDENCES.includes(value as AiConfidence) ? (value as AiConfidence) : "basse"
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function toChoice(value: Record<string, unknown>, key: string): CiqualMatchChoice {
  const code = typeof value.code === "number" ? String(value.code) : readText(value.code)
  return { key, code, confidence: readConfidence(value.confidence), searchTerm: readText(value.searchTerm) }
}

/**
 * Lit la réponse de l'IA. Une réponse illisible ne produit aucun choix :
 * les ingrédients concernés restent « à vérifier ».
 */
export function parseMatchResponse(raw: string, requests: CiqualMatchRequest[]): CiqualMatchChoice[] {
  const parsed = extractJson(raw)
  if (requests.length === 1 && isRecord(parsed)) return [toChoice(parsed, requests[0].key)]
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isRecord).flatMap((value, position) => {
    const number = typeof value.ingredient === "number" ? value.ingredient : position + 1
    const request = requests[number - 1]
    return request ? [toChoice(value, request.key)] : []
  })
}

export function parsePieceWeightResponse(raw: string): PieceWeightEstimate | null {
  const parsed = extractJson(raw)
  if (!isRecord(parsed)) return null
  const grams = typeof parsed.grams === "number" ? parsed.grams : Number.parseFloat(String(parsed.grams))
  if (!Number.isFinite(grams) || grams < PIECE_WEIGHT_RANGE.min || grams > PIECE_WEIGHT_RANGE.max) return null
  return { grams: Math.round(grams), confidence: readConfidence(parsed.confidence) }
}
