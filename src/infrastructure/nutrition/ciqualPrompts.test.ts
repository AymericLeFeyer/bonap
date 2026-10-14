import { describe, expect, it } from "vitest"
import {
  buildMatchPrompt,
  CIQUAL_BATCH_INSTRUCTION,
  parseMatchResponse,
  parsePieceWeightResponse,
} from "./ciqualPrompts.ts"

const cauliflower = {
  key: "chou fleur",
  label: "1 chou fleur",
  candidates: [
    { code: "11001", name: "Chou-fleur, cru" },
    { code: "11002", name: "Chou-fleur, cuit" },
  ],
}
const egg = { key: "oeuf", label: "2 oeufs", candidates: [{ code: "22000", name: "Oeuf, cru" }] }

describe("buildMatchPrompt", () => {
  it("reprend le format du document pour un seul ingrédient", () => {
    const { system, user } = buildMatchPrompt([cauliflower])
    expect(system).not.toContain(CIQUAL_BATCH_INSTRUCTION)
    expect(user).toBe("Ingrédient : « 1 chou fleur »\nCandidats :\n- 11001 : Chou-fleur, cru\n- 11002 : Chou-fleur, cuit")
  })

  it("numérote les ingrédients et demande un tableau pour un lot", () => {
    const { system, user } = buildMatchPrompt([cauliflower, egg])
    expect(system).toContain(CIQUAL_BATCH_INSTRUCTION)
    expect(user).toContain("2. Ingrédient : « 2 oeufs »")
  })
})

describe("parseMatchResponse", () => {
  it("lit l'objet JSON d'un seul ingrédient", () => {
    const raw = '{"code": "11001", "confidence": "haute", "searchTerm": null, "reason": "Frais."}'
    expect(parseMatchResponse(raw, [cauliflower])).toEqual([
      { key: "chou fleur", code: "11001", confidence: "haute", searchTerm: null },
    ])
  })

  it("tolère un bloc de code autour du JSON", () => {
    const raw = '```json\n{"code": "11001", "confidence": "moyenne"}\n```'
    expect(parseMatchResponse(raw, [cauliflower])[0].code).toBe("11001")
  })

  it("associe chaque objet d'un lot à son ingrédient par numéro", () => {
    const raw = '[{"ingredient": 2, "code": "22000", "confidence": "haute"}, {"ingredient": 1, "code": null, "confidence": "basse", "searchTerm": "chou"}]'
    const choices = parseMatchResponse(raw, [cauliflower, egg])
    expect(choices).toContainEqual({ key: "oeuf", code: "22000", confidence: "haute", searchTerm: null })
    expect(choices).toContainEqual({ key: "chou fleur", code: null, confidence: "basse", searchTerm: "chou" })
  })

  it("ne produit aucun choix pour une réponse illisible", () => {
    expect(parseMatchResponse("Je pense que c'est le chou-fleur cru.", [cauliflower])).toEqual([])
    expect(parseMatchResponse("{code: 11001", [cauliflower])).toEqual([])
  })

  it("considère une confiance inconnue comme basse", () => {
    expect(parseMatchResponse('{"code": "11001", "confidence": "certaine"}', [cauliflower])[0].confidence).toBe("basse")
  })
})

describe("parsePieceWeightResponse", () => {
  it("lit le poids d'une pièce", () => {
    expect(parsePieceWeightResponse('{"grams": 600, "confidence": "moyenne"}')).toEqual({ grams: 600, confidence: "moyenne" })
  })

  it("rejette un poids hors de 1 g à 5 kg", () => {
    expect(parsePieceWeightResponse('{"grams": 0.2, "confidence": "haute"}')).toBeNull()
    expect(parsePieceWeightResponse('{"grams": 8000, "confidence": "haute"}')).toBeNull()
  })

  it("rejette une réponse illisible", () => {
    expect(parsePieceWeightResponse("environ 600 g")).toBeNull()
  })
})
