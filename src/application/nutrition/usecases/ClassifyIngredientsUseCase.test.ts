import { beforeEach, describe, expect, it, vi } from "vitest"
import type {
  ClassifiedIngredient,
  NutritionFood,
  NutritionFoodPatch,
} from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { INutritionRepository } from "../../../domain/nutrition/repositories/INutritionRepository.ts"
import type { ICiqualAiMatcher } from "../../../domain/nutrition/services/ICiqualAiMatcher.ts"
import { ClassifyIngredientsUseCase } from "./ClassifyIngredientsUseCase.ts"

const CANDIDATES = [
  { code: "11001", name: "Chou-fleur, cru" },
  { code: "11002", name: "Chou-fleur, cuit" },
  { code: "11003", name: "Chou-fleur, surgelé, cru" },
  { code: "11004", name: "Gratin de chou-fleur, préemballé" },
]

function food(overrides: Partial<NutritionFood> = {}): NutritionFood {
  return {
    ciqualCode: null,
    ciqualName: null,
    pieceWeight: null,
    density: null,
    negligible: false,
    status: "to-review",
    origin: "auto",
    suggestions: [],
    updatedAt: null,
    ...overrides,
  }
}

function pendingItem(overrides: Partial<ClassifiedIngredient> = {}): ClassifiedIngredient {
  return {
    key: "chou fleur",
    label: "chou fleur",
    entry: null,
    needsAi: true,
    candidates: CANDIDATES,
    hasPieceQuantity: false,
    needsPieceWeight: false,
    ...overrides,
  }
}

function applyPatch(patch: NutritionFoodPatch): NutritionFood {
  const name = CANDIDATES.find((candidate) => candidate.code === patch.ciqualCode)?.name ?? null
  return food({
    ciqualCode: patch.ciqualCode ?? null,
    ciqualName: name,
    pieceWeight: patch.pieceWeight ?? null,
    status: patch.status ?? "proposed",
    origin: patch.origin,
  })
}

describe("ClassifyIngredientsUseCase", () => {
  let repository: { [K in keyof INutritionRepository]: ReturnType<typeof vi.fn> }
  let matcher: { [K in keyof ICiqualAiMatcher]: ReturnType<typeof vi.fn> }
  let useCase: ClassifyIngredientsUseCase
  const ingredients = [{ quantity: "1", unit: "", food: "", note: "1 chou fleur" }]

  beforeEach(() => {
    repository = {
      getFoods: vi.fn(),
      saveFoods: vi.fn(async (patches: NutritionFoodPatch[]) =>
        Object.fromEntries(patches.map((patch) => [patch.key, applyPatch(patch)]))),
      classify: vi.fn(async () => [pendingItem()]),
      estimate: vi.fn(),
      searchCiqual: vi.fn(async () => []),
    }
    matcher = { matchFoods: vi.fn(async () => []), estimatePieceWeight: vi.fn(async () => null) }
    useCase = new ClassifyIngredientsUseCase(repository as unknown as INutritionRepository, matcher as unknown as ICiqualAiMatcher)
  })

  const savedPatch = (): NutritionFoodPatch => repository.saveFoods.mock.calls[0][0][0]

  it("sans IA, s'en tient au résultat du serveur", async () => {
    await useCase.execute(ingredients, { aiEnabled: false })

    expect(repository.classify).toHaveBeenCalledWith(ingredients, { aiEnabled: false, legacyMappings: undefined })
    expect(matcher.matchFoods).not.toHaveBeenCalled()
  })

  it("enregistre le choix de l'IA comme fiche « proposée par l'IA »", async () => {
    matcher.matchFoods.mockResolvedValue([{ key: "chou fleur", code: "11001", confidence: "haute", searchTerm: null }])

    const [item] = await useCase.execute(ingredients, { aiEnabled: true })

    expect(savedPatch()).toMatchObject({ key: "chou fleur", ciqualCode: "11001", status: "proposed", origin: "ai" })
    expect(item.entry?.ciqualCode).toBe("11001")
  })

  it("rejette un code absent de la liste : l'ingrédient passe « à vérifier »", async () => {
    matcher.matchFoods.mockResolvedValue([{ key: "chou fleur", code: "99999", confidence: "haute", searchTerm: null }])

    await useCase.execute(ingredients, { aiEnabled: true })

    expect(savedPatch()).toMatchObject({ status: "to-review", ciqualCode: null })
  })

  it("n'applique pas une confiance basse : le choix devient la première suggestion", async () => {
    matcher.matchFoods.mockResolvedValue([{ key: "chou fleur", code: "11003", confidence: "basse", searchTerm: null }])

    await useCase.execute(ingredients, { aiEnabled: true })

    expect(savedPatch()).toMatchObject({ status: "to-review", suggestions: ["11003", "11001", "11002"] })
  })

  it("relance une seule recherche avec le terme proposé par l'IA", async () => {
    const retryCandidates = [{ code: "20100", name: "Romanesco, cru" }]
    repository.searchCiqual.mockResolvedValue(retryCandidates)
    matcher.matchFoods
      .mockResolvedValueOnce([{ key: "chou fleur", code: null, confidence: "basse", searchTerm: "romanesco" }])
      .mockResolvedValueOnce([{ key: "chou fleur", code: "20100", confidence: "moyenne", searchTerm: null }])

    await useCase.execute(ingredients, { aiEnabled: true })

    expect(repository.searchCiqual).toHaveBeenCalledWith("romanesco", 10)
    expect(matcher.matchFoods).toHaveBeenCalledTimes(2)
    expect(savedPatch()).toMatchObject({ ciqualCode: "20100", status: "proposed" })
  })

  it("une erreur ou une réponse illisible de l'IA laisse l'ingrédient « à vérifier »", async () => {
    matcher.matchFoods.mockRejectedValue(new Error("quota"))

    await useCase.execute(ingredients, { aiEnabled: true })

    expect(savedPatch()).toMatchObject({ status: "to-review" })
  })

  it("regroupe les ingrédients par lots de 10", async () => {
    repository.classify.mockResolvedValue(
      Array.from({ length: 12 }, (_, index) => pendingItem({ key: `aliment ${index}`, label: `aliment ${index}` })),
    )

    await useCase.execute(ingredients, { aiEnabled: true })

    expect(matcher.matchFoods).toHaveBeenCalledTimes(2)
    expect(matcher.matchFoods.mock.calls[0][0]).toHaveLength(10)
  })

  it("estime et enregistre le poids d'une pièce manquant", async () => {
    repository.classify.mockResolvedValue([
      pendingItem({ needsAi: false, hasPieceQuantity: true, entry: food({ ciqualCode: "11001", ciqualName: "Chou-fleur, cru", status: "auto" }) }),
    ])
    matcher.estimatePieceWeight.mockResolvedValue({ grams: 600, confidence: "moyenne" })

    const [item] = await useCase.execute(ingredients, { aiEnabled: true })

    expect(matcher.estimatePieceWeight).toHaveBeenCalledWith({ label: "chou fleur", ciqualName: "Chou-fleur, cru" })
    expect(repository.saveFoods.mock.calls[1][0]).toEqual([{ key: "chou fleur", pieceWeight: 600, origin: "ai" }])
    expect(item.entry?.pieceWeight).toBe(600)
    expect(item.needsPieceWeight).toBe(false)
  })

  it("s'interrompt quand le traitement est annulé", async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(useCase.execute(ingredients, { aiEnabled: true, signal: controller.signal })).rejects.toThrow()
    expect(matcher.matchFoods).not.toHaveBeenCalled()
  })
})
