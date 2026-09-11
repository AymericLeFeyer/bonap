import { describe, expect, it } from "vitest"
import { mergeServerSettingValue, toServerSettingValue } from "./ServerSettingsService.ts"

const llm = (value: Record<string, unknown>) => JSON.stringify(value)

describe("toServerSettingValue", () => {
  it("retire la clé API avant l'envoi au serveur", () => {
    const sent = toServerSettingValue(
      "bonap_llm_config",
      llm({ provider: "openai", apiKey: "sk-secret", model: "gpt-4o", ollamaBaseUrl: "" }),
    )
    expect(JSON.parse(sent)).toEqual({ provider: "openai", model: "gpt-4o", ollamaBaseUrl: "" })
  })

  it("laisse les autres paramètres intacts", () => {
    expect(toServerSettingValue("bonap_theme", "dark")).toBe("dark")
  })
})

describe("mergeServerSettingValue", () => {
  it("conserve la clé API locale", () => {
    const merged = mergeServerSettingValue(
      "bonap_llm_config",
      llm({ provider: "anthropic", model: "claude-sonnet-4-6" }),
      llm({ provider: "openai", apiKey: "sk-local", model: "gpt-4o" }),
    )
    expect(JSON.parse(merged)).toEqual({ provider: "anthropic", model: "claude-sonnet-4-6", apiKey: "sk-local" })
  })

  it("ignore une clé API venue du serveur (ancien fichier)", () => {
    const merged = mergeServerSettingValue(
      "bonap_llm_config",
      llm({ provider: "google", apiKey: "AIza-from-server" }),
      null,
    )
    expect(JSON.parse(merged)).toEqual({ provider: "google" })
  })

  it("renvoie la valeur serveur telle quelle pour les autres clés", () => {
    expect(mergeServerSettingValue("bonap_accent", "green", "blue")).toBe("green")
  })
})
