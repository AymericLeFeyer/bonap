import { describe, it, expect } from "vitest"
import { formatDate, getWeeksBetween, toDateStr } from "./date.ts"

describe("formatDate", () => {
  it("formate une date au format YYYY-MM-DD", () => {
    const d = new Date(2026, 3, 22)
    expect(formatDate(d)).toBe("2026-04-22")
  })

  it("pad les mois et jours à 2 chiffres", () => {
    const d = new Date(2026, 0, 5)
    expect(formatDate(d)).toBe("2026-01-05")
  })
})

describe("toDateStr", () => {
  it("donne le même résultat que formatDate", () => {
    const d = new Date(2026, 11, 25)
    expect(toDateStr(d)).toBe("2026-12-25")
  })
})

describe("getWeeksBetween", () => {
  it("retourne au moins 1 semaine", () => {
    expect(getWeeksBetween("2026-04-22", "2026-04-22")).toBe(1)
  })

  it("calcule 1 semaine pour 7 jours", () => {
    expect(getWeeksBetween("2026-04-01", "2026-04-07")).toBe(1)
  })

  it("calcule 2 semaines pour 14 jours", () => {
    expect(getWeeksBetween("2026-04-01", "2026-04-14")).toBe(2)
  })

  it("retourne un nombre fractionnaire pour une période intermédiaire", () => {
    const result = getWeeksBetween("2026-04-01", "2026-04-10")
    expect(result).toBeGreaterThan(1)
    expect(result).toBeLessThan(2)
  })
})
