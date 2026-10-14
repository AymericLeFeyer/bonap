import type {
  CiqualFood,
  ClassifiedIngredient,
  NutritionFoodPatch,
  NutritionFoods,
  NutritionIngredientInput,
} from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { INutritionRepository } from "../../../domain/nutrition/repositories/INutritionRepository.ts"
import type {
  CiqualMatchChoice,
  CiqualMatchRequest,
  ICiqualAiMatcher,
} from "../../../domain/nutrition/services/ICiqualAiMatcher.ts"

export const AI_BATCH_SIZE = 10
const SEARCH_LIMIT = 10
const SUGGESTION_COUNT = 3

export interface ClassifyIngredientsOptions {
  aiEnabled: boolean
  legacyMappings?: Record<string, string>
  signal?: AbortSignal
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size))
}

function codesOf(candidates: CiqualFood[], first?: string): string[] {
  const codes = candidates.map((candidate) => candidate.code)
  return (first ? [first, ...codes.filter((code) => code !== first)] : codes).slice(0, SUGGESTION_COUNT)
}

function toReview(request: CiqualMatchRequest, firstSuggestion?: string): NutritionFoodPatch {
  return {
    key: request.key,
    ciqualCode: null,
    status: "to-review",
    origin: "ai",
    suggestions: codesOf(request.candidates, firstSuggestion),
  }
}

function isAmongCandidates(choice: CiqualMatchChoice | undefined, request: CiqualMatchRequest): choice is CiqualMatchChoice & { code: string } {
  return !!choice?.code && request.candidates.some((candidate) => candidate.code === choice.code)
}

function needsPieceWeight(item: ClassifiedIngredient): boolean {
  const entry = item.entry
  return item.hasPieceQuantity && !!entry?.ciqualCode && !entry.negligible && !entry.pieceWeight
}

function withEntries(items: ClassifiedIngredient[], foods: NutritionFoods): ClassifiedIngredient[] {
  return items.map((item) => {
    const updated = { ...item, entry: foods[item.key] ?? item.entry }
    return { ...updated, needsPieceWeight: needsPieceWeight(updated) }
  })
}

/**
 * Classe les ingrédients : le serveur résout tout ce qui est certain
 * (dictionnaire, correspondance exacte crue, synonymes), puis l'IA, si elle
 * est active, choisit parmi les candidats CIQUAL et estime le poids des pièces.
 */
export class ClassifyIngredientsUseCase {
  private readonly repository: INutritionRepository
  private readonly matcher: ICiqualAiMatcher

  constructor(repository: INutritionRepository, matcher: ICiqualAiMatcher) {
    this.repository = repository
    this.matcher = matcher
  }

  async execute(ingredients: NutritionIngredientInput[], options: ClassifyIngredientsOptions): Promise<ClassifiedIngredient[]> {
    const items = await this.repository.classify(ingredients, {
      aiEnabled: options.aiEnabled,
      legacyMappings: options.legacyMappings,
    })
    if (!options.aiEnabled) return items

    const pending = items.filter((item) => item.needsAi)
    const matched = withEntries(items, await this.repository.saveFoods(await this.matchWithAi(pending, options.signal)))
    const weights = await this.estimatePieceWeights(matched.filter((item) => item.needsPieceWeight), options.signal)
    return withEntries(matched, await this.repository.saveFoods(weights)).map((item) => ({ ...item, needsAi: false }))
  }

  private async matchWithAi(items: ClassifiedIngredient[], signal?: AbortSignal): Promise<NutritionFoodPatch[]> {
    const patches: NutritionFoodPatch[] = []
    for (const batch of chunk(items, AI_BATCH_SIZE)) {
      signal?.throwIfAborted()
      const requests = batch.map(({ key, label, candidates }) => ({ key, label, candidates }))
      const choices = await this.askMatcher(requests)
      for (const request of requests) {
        patches.push(await this.resolveChoice(request, choices.find((choice) => choice.key === request.key)))
      }
    }
    return patches
  }

  private async askMatcher(requests: CiqualMatchRequest[]): Promise<CiqualMatchChoice[]> {
    try {
      return await this.matcher.matchFoods(requests)
    } catch {
      return []
    }
  }

  private async resolveChoice(request: CiqualMatchRequest, choice: CiqualMatchChoice | undefined): Promise<NutritionFoodPatch> {
    if (isAmongCandidates(choice, request)) return this.applyChoice(request, choice)
    if (!choice?.code && choice?.searchTerm) return this.retryWithSearchTerm(request, choice.searchTerm)
    return toReview(request)
  }

  private async retryWithSearchTerm(request: CiqualMatchRequest, searchTerm: string): Promise<NutritionFoodPatch> {
    const candidates = await this.repository.searchCiqual(searchTerm, SEARCH_LIMIT)
    if (candidates.length === 0) return toReview(request)
    const retried = { ...request, candidates }
    const [choice] = await this.askMatcher([retried])
    return isAmongCandidates(choice, retried) ? this.applyChoice(retried, choice) : toReview(request)
  }

  private applyChoice(request: CiqualMatchRequest, choice: CiqualMatchChoice & { code: string }): NutritionFoodPatch {
    if (choice.confidence === "basse") return toReview(request, choice.code)
    return {
      key: request.key,
      ciqualCode: choice.code,
      status: "proposed",
      origin: "ai",
      suggestions: codesOf(request.candidates, choice.code),
    }
  }

  private async estimatePieceWeights(items: ClassifiedIngredient[], signal?: AbortSignal): Promise<NutritionFoodPatch[]> {
    const patches: NutritionFoodPatch[] = []
    for (const item of items) {
      signal?.throwIfAborted()
      const estimate = await this.matcher
        .estimatePieceWeight({ label: item.label, ciqualName: item.entry?.ciqualName ?? item.label })
        .catch(() => null)
      if (estimate) patches.push({ key: item.key, pieceWeight: estimate.grams, origin: "ai" })
    }
    return patches
  }
}
