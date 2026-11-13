import { describe, it, expect } from "vitest"
import { buildBatchPrompt, parseBatchResponse } from "./batchPrompts.ts"

const candidates = [
  { slug: "lasagnes", name: "Lasagnes", labels: ["Gratins"] },
  { slug: "salade-nicoise", name: "Salade niçoise", labels: [] },
]

describe("buildBatchPrompt", () => {
  it("liste chaque recette avec son identifiant", () => {
    const prompt = buildBatchPrompt(candidates)
    expect(prompt).toContain("- lasagnes : Lasagnes (Gratins)")
    expect(prompt).toContain("- salade-nicoise : Salade niçoise")
  })
})

describe("parseBatchResponse", () => {
  it("lit le tableau JSON même entouré de texte", () => {
    const raw = 'Voici :\n[{"slug":"lasagnes","fridgeDays":3,"freezerDays":90,"reason":"se réchauffe bien"}]'
    expect(parseBatchResponse(raw, candidates)).toEqual([
      { slug: "lasagnes", fridgeDays: 3, freezerDays: 90, reason: "se réchauffe bien" },
    ])
  })

  it("écarte les recettes inconnues, les doublons et les durées absurdes", () => {
    const raw = JSON.stringify([
      { slug: "inventee", fridgeDays: 3 },
      { slug: "lasagnes", fridgeDays: 40, freezerDays: -2 },
      { slug: "lasagnes", fridgeDays: 2 },
    ])
    expect(parseBatchResponse(raw, candidates)).toEqual([{ slug: "lasagnes", fridgeDays: 7 }])
  })

  it("retourne une liste vide sur une réponse illisible", () => {
    expect(parseBatchResponse("désolé", candidates)).toEqual([])
  })
})
