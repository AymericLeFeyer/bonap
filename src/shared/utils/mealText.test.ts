import { describe, it, expect } from "vitest"
import { decodeMealText, encodeMealText } from "./mealText.ts"
import { decodeServingsFromText } from "./servings.ts"

describe("decodeMealText", () => {
  it("lit une note sans marqueur comme un plat", () => {
    expect(decodeMealText("sans viande")).toEqual({ servings: undefined, course: "plat", note: "sans viande" })
    expect(decodeMealText(undefined)).toEqual({ servings: undefined, course: "plat", note: "" })
  })

  it("lit les portions et le type", () => {
    expect(decodeMealText("[s:4][c:dessert]note")).toEqual({ servings: 4, course: "dessert", note: "note" })
  })

  it("accepte les marqueurs dans n'importe quel ordre", () => {
    expect(decodeMealText("[c:entree][s:2]")).toEqual({ servings: 2, course: "entree", note: "" })
  })

  it("laisse dans la note un crochet qui n'est pas un marqueur connu", () => {
    expect(decodeMealText("[c:gouter]miam").note).toBe("[c:gouter]miam")
  })

  it("reste compatible avec les notes portions seules déjà écrites", () => {
    expect(decodeMealText("[s:6]restes")).toEqual({ servings: 6, course: "plat", note: "restes" })
  })
})

describe("encodeMealText", () => {
  it("n'écrit pas de marqueur pour un plat", () => {
    expect(encodeMealText({ servings: 4, course: "plat", note: "note" })).toBe("[s:4]note")
    expect(encodeMealText({ course: "plat", note: "" })).toBe("")
  })

  it("écrit les portions avant le type, lisible par l'ancien décodeur", () => {
    const text = encodeMealText({ servings: 3, course: "dessert", note: "x" })
    expect(text).toBe("[s:3][c:dessert]x")
    expect(decodeServingsFromText(text).servings).toBe(3)
  })

  it("fait l'aller-retour", () => {
    const parts = { servings: 2, course: "entree" as const, note: "froid" }
    expect(decodeMealText(encodeMealText(parts))).toEqual(parts)
  })
})

describe("marqueur batch", () => {
  it("lit et réécrit la provenance d'un plat batch", () => {
    const text = "[s:4][b:freezer:2026-11-02][g:Marc]à réchauffer"
    const parts = decodeMealText(text)
    expect(parts.batch).toEqual({ location: "freezer", preparedAt: "2026-11-02" })
    expect(parts.guests).toEqual(["Marc"])
    expect(parts.note).toBe("à réchauffer")
    expect(encodeMealText(parts)).toBe(text)
  })

  it("laisse dans la note un marqueur batch invalide", () => {
    expect(decodeMealText("[b:cave:2026-11-02]x").note).toBe("[b:cave:2026-11-02]x")
  })
})
