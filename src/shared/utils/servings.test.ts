import { describe, it, expect } from "vitest"
import {
  parseServings,
  getRecipeServings,
  encodeServingsInText,
  decodeServingsFromText,
  formatQuantity,
} from "./servings.ts"

describe("parseServings", () => {
  it("extracts the first number from a free-text yield", () => {
    expect(parseServings("4")).toBe(4)
    expect(parseServings("4 personnes")).toBe(4)
    expect(parseServings("pour 6")).toBe(6)
    expect(parseServings("4-6 personnes")).toBe(4)
  })

  it("returns undefined when no number is present", () => {
    expect(parseServings("personnes")).toBeUndefined()
    expect(parseServings("")).toBeUndefined()
    expect(parseServings(undefined)).toBeUndefined()
  })
})

describe("getRecipeServings", () => {
  it("prefers recipeServings over the other fields", () => {
    expect(
      getRecipeServings({
        recipeServings: 4,
        recipeYieldQuantity: 8,
        recipeYield: "12 personnes",
      }),
    ).toBe(4)
  })

  it("falls back to recipeYieldQuantity when recipeServings is 0 or missing", () => {
    expect(getRecipeServings({ recipeServings: 0, recipeYieldQuantity: 6 })).toBe(6)
    expect(getRecipeServings({ recipeYieldQuantity: 6 })).toBe(6)
  })

  it("falls back to parsing recipeYield text when both numeric fields are unset", () => {
    expect(getRecipeServings({ recipeYield: "4 personnes" })).toBe(4)
    expect(getRecipeServings({ recipeServings: 0, recipeYield: "8 cookies" })).toBe(8)
  })

  it("returns undefined when nothing usable is present", () => {
    expect(getRecipeServings({})).toBeUndefined()
    expect(getRecipeServings(undefined)).toBeUndefined()
    expect(getRecipeServings(null)).toBeUndefined()
    expect(getRecipeServings({ recipeYield: "personnes" })).toBeUndefined()
  })
})

describe("encodeServingsInText / decodeServingsFromText", () => {
  it("round-trips a servings count through a meal note", () => {
    const encoded = encodeServingsInText(4, "extra cheese")
    expect(encoded).toBe("[s:4]extra cheese")

    const { servings, note } = decodeServingsFromText(encoded)
    expect(servings).toBe(4)
    expect(note).toBe("extra cheese")
  })

  it("leaves the note untouched when no servings are encoded", () => {
    expect(encodeServingsInText(undefined, "hello")).toBe("hello")
    expect(decodeServingsFromText("hello")).toEqual({ servings: undefined, note: "hello" })
  })
})

describe("formatQuantity", () => {
  it("strips trailing zeros for integer-equivalent values", () => {
    expect(formatQuantity(2)).toBe("2")
    expect(formatQuantity(2.0)).toBe("2")
  })

  it("rounds to 1 decimal", () => {
    expect(formatQuantity(2.456)).toBe("2.5")
    expect(formatQuantity(0.94)).toBe("0.9")
  })
})
