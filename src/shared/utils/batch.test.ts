import { describe, it, expect } from "vitest"
import {
  addToStock, batchInfoToExtras, expiryStatus, getBatchInfo, isBatchRecipe,
  parseBatchStock, returnToStock, stockCount, takeFromStock, thawReminder, withoutBatchExtras,
  BATCH_EXTRAS,
} from "./batch.ts"

const tag = (name: string) => ({ id: name, name, slug: name })

describe("getBatchInfo", () => {
  it("lit le tag, les durées et le stock des extras", () => {
    const info = getBatchInfo({
      tags: [tag("batch")],
      extras: {
        [BATCH_EXTRAS.fridgeDays]: "3",
        [BATCH_EXTRAS.freezerDays]: "90",
        [BATCH_EXTRAS.stock]: JSON.stringify([{ location: "freezer", count: 2, preparedAt: "2026-11-02" }]),
      },
    })
    expect(info).toEqual({
      enabled: true,
      fridgeDays: 3,
      freezerDays: 90,
      stock: [{ location: "freezer", count: 2, preparedAt: "2026-11-02" }],
    })
  })

  it("une recette sans tag ni extras n'est pas batch", () => {
    expect(getBatchInfo({ tags: [tag("rapide")] })).toEqual({ enabled: false, stock: [] })
    expect(isBatchRecipe(undefined)).toBe(false)
  })

  it("ignore un stock illisible ou des entrées invalides", () => {
    expect(parseBatchStock("pas du json")).toEqual([])
    expect(parseBatchStock(JSON.stringify([
      { location: "cave", count: 1, preparedAt: "2026-11-02" },
      { location: "fridge", count: 0, preparedAt: "2026-11-02" },
      { location: "fridge", count: 1, preparedAt: "hier" },
      { location: "fridge", count: 2, preparedAt: "2026-11-03" },
    ]))).toEqual([{ location: "fridge", count: 2, preparedAt: "2026-11-03" }])
  })
})

describe("batchInfoToExtras", () => {
  it("omet les clés non renseignées", () => {
    expect(batchInfoToExtras({ enabled: true, stock: [] })).toEqual({})
    expect(batchInfoToExtras({ enabled: true, fridgeDays: 4, stock: [] })).toEqual({ [BATCH_EXTRAS.fridgeDays]: "4" })
  })

  it("retire les clés batch des extras existants", () => {
    expect(withoutBatchExtras({ emoji: "🍝", [BATCH_EXTRAS.stock]: "[]" })).toEqual({ emoji: "🍝" })
  })
})

describe("stock", () => {
  const stock = [
    { location: "freezer" as const, count: 2, preparedAt: "2026-11-02" },
    { location: "freezer" as const, count: 1, preparedAt: "2026-10-01" },
    { location: "fridge" as const, count: 1, preparedAt: "2026-11-10" },
  ]

  it("fusionne un ajout du même jour au même endroit", () => {
    const next = addToStock(stock, { location: "freezer", count: 3, preparedAt: "2026-11-02" })
    expect(stockCount(next, "freezer")).toBe(6)
    expect(next.filter((e) => e.location === "freezer")).toHaveLength(2)
  })

  it("prend la préparation la plus ancienne par défaut", () => {
    const { stock: next, taken } = takeFromStock(stock, "freezer")
    expect(taken?.preparedAt).toBe("2026-10-01")
    expect(next.find((e) => e.preparedAt === "2026-10-01")).toBeUndefined()
    expect(stockCount(next)).toBe(3)
  })

  it("prend une préparation précise et signale un stock vide", () => {
    expect(takeFromStock(stock, "freezer", "2026-11-02").taken?.preparedAt).toBe("2026-11-02")
    expect(takeFromStock(stock, "fridge", "2026-01-01").taken).toBeNull()
  })

  it("remet un plat déprogrammé dans son entrée d'origine", () => {
    const { stock: next } = takeFromStock(stock, "freezer", "2026-10-01")
    expect(returnToStock(next, "freezer", "2026-10-01")).toEqual(
      addToStock([], stock[1]).concat(stock[0], stock[2]),
    )
  })
})

describe("expiryStatus", () => {
  const info = { fridgeDays: 3, freezerDays: 60 }
  it("calcule la date limite à partir de la préparation", () => {
    expect(expiryStatus({ location: "fridge", count: 1, preparedAt: "2026-11-10" }, info, "2026-11-11"))
      .toEqual({ status: "ok", expiry: "2026-11-13", daysLeft: 2 })
    expect(expiryStatus({ location: "fridge", count: 1, preparedAt: "2026-11-10" }, info, "2026-11-14").status)
      .toBe("expired")
    expect(expiryStatus({ location: "freezer", count: 1, preparedAt: "2026-10-01" }, info, "2026-11-25").status)
      .toBe("soon")
  })

  it("reste inconnue sans durée renseignée", () => {
    expect(expiryStatus({ location: "fridge", count: 1, preparedAt: "2026-11-10" }, {}, "2026-11-11").status)
      .toBe("unknown")
  })
})

describe("thawReminder", () => {
  it("rappelle de sortir un plat du congélateur la veille et le jour même", () => {
    expect(thawReminder("freezer", "2026-11-14", "2026-11-13")).toMatch(/sortir/)
    expect(thawReminder("freezer", "2026-11-13", "2026-11-13")).toMatch(/décongeler/)
    expect(thawReminder("freezer", "2026-11-20", "2026-11-13")).toBeNull()
    expect(thawReminder("fridge", "2026-11-14", "2026-11-13")).toBeNull()
  })
})
