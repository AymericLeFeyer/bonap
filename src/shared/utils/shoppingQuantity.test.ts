import { describe, it, expect } from "vitest"
import { formatAmount, formatUnit, formatItemQuantity, normalizeQuantity } from "./shoppingQuantity.ts"

// Unités telles que renvoyées par une instance Mealie v3.22.0.
const GRAMME = { name: "gramme", abbreviation: "g", useAbbreviation: true }
const CUILLERE = { name: "cuillère à soupe", abbreviation: "c. à s.", useAbbreviation: true }
const GOUSSE = { name: "gousse", pluralName: "gousses", useAbbreviation: false }
const BOITE = { name: "boîte", abbreviation: undefined, useAbbreviation: false }
const KILO = { name: "kilogramme", abbreviation: "kg", useAbbreviation: true }
const MILLILITRE = { name: "millilitre", abbreviation: "ml", useAbbreviation: true }
const CENTILITRE = { name: "centilitre", abbreviation: "cl", useAbbreviation: true }
const LITRE = { name: "litre", abbreviation: "L", useAbbreviation: true }

describe("formatAmount", () => {
  it("supprime les décimales inutiles", () => {
    expect(formatAmount(700)).toBe("700")
    expect(formatAmount(700.0)).toBe("700")
  })

  it("conserve les décimales utiles", () => {
    expect(formatAmount(2.5)).toBe("2.5")
    expect(formatAmount(0.25)).toBe("0.25")
  })
})

describe("formatUnit", () => {
  it("préfère l'abréviation quand l'unité est marquée useAbbreviation", () => {
    expect(formatUnit(700, GRAMME)).toBe("g")
    expect(formatUnit(3, CUILLERE)).toBe("c. à s.")
  })

  it("utilise le nom complet sinon", () => {
    expect(formatUnit(1, BOITE)).toBe("boîte")
  })

  it("utilise le pluriel au-delà de un", () => {
    expect(formatUnit(11, GOUSSE)).toBe("gousses")
    expect(formatUnit(1, GOUSSE)).toBe("gousse")
  })

  it("retourne une chaîne vide sans unité", () => {
    expect(formatUnit(3, undefined)).toBe("")
  })
})

describe("formatItemQuantity", () => {
  it("associe quantité et unité", () => {
    expect(formatItemQuantity(700, GRAMME)).toBe("700 g")
    // Cas rapporté dans #98 : « 3 C.A.S de sauce huître » affiché « 3 sauces huitres ».
    expect(formatItemQuantity(3, CUILLERE)).toBe("3 c. à s.")
    // Cas rapporté dans #98 : « 11 gousses d'ail ».
    expect(formatItemQuantity(11, GOUSSE)).toBe("11 gousses")
  })

  it("affiche la quantité seule quand l'article n'a pas d'unité", () => {
    expect(formatItemQuantity(3, undefined)).toBe("3")
  })

  it("n'affiche rien pour une quantité absente ou nulle", () => {
    expect(formatItemQuantity(undefined, GRAMME)).toBe("")
    expect(formatItemQuantity(0, GRAMME)).toBe("")
  })
})

describe("normalizeQuantity", () => {
  // Cas rapporté : une recette de 500 g de tomates cuisinée 3 fois.
  it("monte d'un barreau quand la quantité dépasse l'unité supérieure", () => {
    const { quantity, unit } = normalizeQuantity(1500, GRAMME)
    expect(quantity).toBe(1.5)
    expect(unit?.abbreviation).toBe("kg")
  })

  it("redescend d'un barreau sous l'unité courante", () => {
    const { quantity, unit } = normalizeQuantity(0.5, KILO)
    expect(quantity).toBe(500)
    expect(unit?.abbreviation).toBe("g")
  })

  it("arrondit plutôt que de rester dans l'unité basse", () => {
    // Une unité cohérente d'une ligne à l'autre prime sur le gramme près.
    expect(formatItemQuantity(1234, GRAMME)).toBe("1.23 kg")
  })

  it("laisse les unités non métriques intactes", () => {
    expect(normalizeQuantity(1500, GOUSSE)).toEqual({ quantity: 1500, unit: GOUSSE, step: 1 })
    expect(normalizeQuantity(1500, undefined)).toEqual({ quantity: 1500, unit: undefined, step: 1 })
  })

  it("expose le pas d'incrément dans l'unité stockée", () => {
    expect(normalizeQuantity(1500, GRAMME).step).toBe(1000)
    expect(normalizeQuantity(0.5, KILO).step).toBe(0.001)
    expect(normalizeQuantity(700, GRAMME).step).toBe(1)
  })

  it("gère aussi les volumes, y compris depuis les centilitres", () => {
    expect(normalizeQuantity(1500, MILLILITRE).unit?.abbreviation).toBe("L")
    expect(normalizeQuantity(150, CENTILITRE)).toMatchObject({ quantity: 1.5, step: 100 })
    expect(normalizeQuantity(0.75, LITRE)).toMatchObject({ quantity: 750 })
  })
})

describe("formatItemQuantity — unités métriques", () => {
  it("affiche l'unité la plus lisible", () => {
    expect(formatItemQuantity(1500, GRAMME)).toBe("1.5 kg")
    expect(formatItemQuantity(2000, GRAMME)).toBe("2 kg")
    expect(formatItemQuantity(1500, MILLILITRE)).toBe("1.5 L")
  })

  it("ne touche pas aux quantités déjà lisibles", () => {
    expect(formatItemQuantity(500, GRAMME)).toBe("500 g")
    expect(formatItemQuantity(250, MILLILITRE)).toBe("250 ml")
  })
})
