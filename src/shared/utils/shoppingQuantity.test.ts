import { describe, it, expect } from "vitest"
import { formatAmount, formatUnit, formatItemQuantity } from "./shoppingQuantity.ts"

// Unités telles que renvoyées par une instance Mealie v3.22.0.
const GRAMME = { name: "gramme", abbreviation: "g", useAbbreviation: true }
const CUILLERE = { name: "cuillère à soupe", abbreviation: "c. à s.", useAbbreviation: true }
const GOUSSE = { name: "gousse", pluralName: "gousses", useAbbreviation: false }
const BOITE = { name: "boîte", abbreviation: undefined, useAbbreviation: false }

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
