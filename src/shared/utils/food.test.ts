import { describe, it, expect } from "vitest"
import { extractFoodKey } from "./food.ts"

describe("extractFoodKey", () => {
  describe("quantités", () => {
    it("retire une quantité entière", () => {
      expect(extractFoodKey("200g de gruyère")).toBe("gruyère")
    })

    it("retire une quantité décimale avec virgule", () => {
      expect(extractFoodKey("1,5 litre lait")).toBe("lait")
    })

    it("retire une quantité décimale avec point", () => {
      expect(extractFoodKey("1.5 kg farine")).toBe("farine")
    })

    it("retire une fraction numérique", () => {
      expect(extractFoodKey("1/2 cuillère de sel")).toBe("sel")
    })

    it("retire une fraction unicode", () => {
      expect(extractFoodKey("½ tasse de sucre")).toBe("sucre")
    })
  })

  describe("unités", () => {
    it("retire 'g'", () => {
      expect(extractFoodKey("500 g farine")).toBe("farine")
    })

    it("retire 'kg'", () => {
      expect(extractFoodKey("2 kg pommes")).toBe("pommes")
    })

    it("retire 'cuillères à soupe'", () => {
      expect(extractFoodKey("2 cuillères à soupe de crème")).toBe("crème")
    })

    it("retire 'cuillères à café'", () => {
      expect(extractFoodKey("1 cuillère à café sel")).toBe("sel")
    })

    it("retire 'ml'", () => {
      expect(extractFoodKey("500 ml lait")).toBe("lait")
    })
  })

  describe("prépositions", () => {
    it("retire 'de '", () => {
      expect(extractFoodKey("200g de gruyère")).toBe("gruyère")
    })

    it("retire l'apostrophe de 'd'huile'", () => {
      expect(extractFoodKey("2 cuillères d'huile")).toBe("huile")
    })

    it("ne retire pas le 'd' si collé à un autre mot", () => {
      expect(extractFoodKey("dattes séchées")).toBe("dattes séchées")
    })
  })

  describe("cas sans modification nécessaire", () => {
    it("retourne le nom seul en minuscules", () => {
      expect(extractFoodKey("Sel")).toBe("sel")
    })

    it("retourne un ingrédient sans quantité", () => {
      expect(extractFoodKey("1 oignon rouge")).toBe("oignon rouge")
    })

    it("gère une chaîne avec espaces multiples", () => {
      expect(extractFoodKey("  pommes  ")).toBe("pommes")
    })

    it("retourne une chaîne vide pour une entrée vide", () => {
      expect(extractFoodKey("")).toBe("")
    })
  })
})
