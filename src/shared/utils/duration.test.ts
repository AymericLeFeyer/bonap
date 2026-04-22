import { describe, it, expect } from "vitest"
import {
  formatDuration,
  parsePrepTimeToMinutes,
  formatMinutes,
  formatDurationToNumber,
} from "./duration.ts"

describe("formatDuration", () => {
  it("retourne '—' pour null/undefined/vide", () => {
    expect(formatDuration(null)).toBe("—")
    expect(formatDuration(undefined)).toBe("—")
    expect(formatDuration("")).toBe("—")
  })

  it("formate un nombre en minutes simples", () => {
    expect(formatDuration(30)).toBe("30 min")
    expect(formatDuration(5)).toBe("5 min")
  })

  it("formate un nombre >= 60 en heures", () => {
    expect(formatDuration(60)).toBe("1 h")
    expect(formatDuration(90)).toBe("1 h 30 min")
    expect(formatDuration(120)).toBe("2 h")
    expect(formatDuration(135)).toBe("2 h 15 min")
  })

  it("parse ISO 8601 PT30M", () => {
    expect(formatDuration("PT30M")).toBe("30 min")
    expect(formatDuration("PT1H")).toBe("1 h")
    expect(formatDuration("PT1H30M")).toBe("1 h 30 min")
    expect(formatDuration("PT2H15M")).toBe("2 h 15 min")
  })

  it("parse un texte humain simple", () => {
    expect(formatDuration("8 min")).toBe("8 min")
    expect(formatDuration("8 mins")).toBe("8 min")
    expect(formatDuration("8 minutes")).toBe("8 min")
  })

  it("parse le format compact 1h10", () => {
    expect(formatDuration("1h10")).toBe("1 h 10 min")
    expect(formatDuration("2h")).toBe("2 h")
    expect(formatDuration("1h 10")).toBe("1 h 10 min")
  })

  it("parse string numérique", () => {
    expect(formatDuration("90")).toBe("1 h 30 min")
    expect(formatDuration("15")).toBe("15 min")
  })

  it("retourne '—' pour 0 ou valeurs négatives", () => {
    expect(formatDuration(0)).toBe("—")
    expect(formatDuration(-5)).toBe("—")
  })

  it("retourne '—' pour une string non reconnue", () => {
    expect(formatDuration("pas une durée")).toBe("—")
  })
})

describe("parsePrepTimeToMinutes", () => {
  it("retourne '' pour vide", () => {
    expect(parsePrepTimeToMinutes(undefined)).toBe("")
    expect(parsePrepTimeToMinutes("")).toBe("")
  })

  it("retourne le nombre tel quel", () => {
    expect(parsePrepTimeToMinutes("30")).toBe("30")
  })

  it("parse ISO 8601", () => {
    expect(parsePrepTimeToMinutes("PT30M")).toBe("30")
    expect(parsePrepTimeToMinutes("PT1H30M")).toBe("90")
    expect(parsePrepTimeToMinutes("PT2H")).toBe("120")
  })

  it("retourne '' pour une valeur de 0", () => {
    expect(parsePrepTimeToMinutes("0")).toBe("")
    expect(parsePrepTimeToMinutes("PT0M")).toBe("")
  })
})

describe("formatMinutes", () => {
  it("retourne '' pour 0 ou invalide", () => {
    expect(formatMinutes("0")).toBe("")
    expect(formatMinutes("abc")).toBe("")
    expect(formatMinutes("")).toBe("")
  })

  it("formate les minutes", () => {
    expect(formatMinutes("30")).toBe("30 min")
    expect(formatMinutes("90")).toBe("1 h 30 min")
    expect(formatMinutes("60")).toBe("1 h")
  })
})

describe("formatDurationToNumber", () => {
  it("retourne 0 pour vide", () => {
    expect(formatDurationToNumber()).toBe(0)
    expect(formatDurationToNumber("")).toBe(0)
  })

  it("parse un nombre simple", () => {
    expect(formatDurationToNumber("30")).toBe(30)
    expect(formatDurationToNumber("90")).toBe(90)
  })

  it("parse avec 'min'", () => {
    expect(formatDurationToNumber("30 min")).toBe(30)
    expect(formatDurationToNumber("5 minutes")).toBe(5)
  })

  it("parse 1h30", () => {
    expect(formatDurationToNumber("1h30")).toBe(90)
    expect(formatDurationToNumber("2h")).toBe(120)
  })

  it("parse ISO 8601", () => {
    expect(formatDurationToNumber("PT1H30M")).toBe(90)
    expect(formatDurationToNumber("PT30M")).toBe(30)
  })
})
