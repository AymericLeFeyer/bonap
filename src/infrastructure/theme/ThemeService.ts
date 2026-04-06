import { getEnv } from "../../shared/utils/env.ts"

export type Theme = "light" | "dark" | "system"

export interface AccentColor {
  id: string
  name: string
  oklch: string // valeur oklch sans parenthèses, ex: "0.62 0.18 42"
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: "orange", name: "Orange", oklch: "0.62 0.18 42" },
  { id: "blue", name: "Bleu", oklch: "0.55 0.20 250" },
  { id: "violet", name: "Violet", oklch: "0.55 0.22 290" },
  { id: "green", name: "Vert", oklch: "0.55 0.18 145" },
  { id: "rose", name: "Rose", oklch: "0.60 0.20 10" },
  { id: "teal", name: "Teal", oklch: "0.55 0.16 185" },
  { id: "amber", name: "Ambre", oklch: "0.65 0.18 75" },
  { id: "indigo", name: "Indigo", oklch: "0.52 0.22 270" },
]

const THEME_KEY = "bonap_theme"
const ACCENT_KEY = "bonap_accent"
const ENV_ACCENT_COLORS = getEnv("VITE_ACCENT_COLORS")
const DEFAULT_ACCENT = ACCENT_COLORS.find(c => c.id === ENV_ACCENT_COLORS) ?? ACCENT_COLORS[0]


function getSystemPreference(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

/**
 * Pour une couleur OKLCH en mode light (ex: "0.62 0.18 42"),
 * on génère une version dark légèrement plus claire en augmentant le L.
 */
function makeDarkVariant(oklch: string): string {
  const parts = oklch.trim().split(/\s+/)
  if (parts.length < 3) return oklch
  const l = parseFloat(parts[0])
  const lightened = Math.min(l + 0.08, 0.95).toFixed(2)
  return `${lightened} ${parts[1]} ${parts[2]}`
}

export class ThemeService {
  private _systemMediaQuery: MediaQueryList | null = null
  private _systemHandler: (() => void) | null = null

  getTheme(): Theme {
    const envTheme = getEnv("VITE_THEME")

    const isTheme = (v: any): v is Theme =>
      v === "light" || v === "dark" || v === "system"
    
    // 1. ENV
    if (isTheme(envTheme)) {
      return envTheme
    }

    // 2. localStorage
    try {
      const stored = localStorage.getItem(THEME_KEY)
      if (isTheme(stored)) return stored
    } catch (_) { }

    // 3. fallback
    return "system"
  }

  setTheme(theme: Theme): void {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch (_) {}
    this.apply()
  }

  getAccentColor(): AccentColor {
    try {
      const stored = localStorage.getItem(ACCENT_KEY)
      if (stored) {
        const found = ACCENT_COLORS.find((c) => c.id === stored)
        if (found) return found
      }
    } catch (_) {}
    return DEFAULT_ACCENT
  }

  setAccentColor(color: AccentColor): void {
    try {
      localStorage.setItem(ACCENT_KEY, color.id)
    } catch (_) {}
    this.apply()
  }

  apply(): void {
    const theme = this.getTheme()
    const accent = this.getAccentColor()

    // Résolution light/dark
    const resolved = theme === "system" ? getSystemPreference() : theme
    document.documentElement.classList.toggle("dark", resolved === "dark")

    // Application de l'accent color
    const primaryLight = accent.oklch
    const primaryDark = makeDarkVariant(accent.oklch)

    if (resolved === "dark") {
      document.documentElement.style.setProperty("--color-primary", `oklch(${primaryDark})`)
      document.documentElement.style.setProperty("--color-ring", `oklch(${primaryDark})`)
    } else {
      document.documentElement.style.setProperty("--color-primary", `oklch(${primaryLight})`)
      document.documentElement.style.setProperty("--color-ring", `oklch(${primaryLight})`)
    }

    // Gestion du listener system
    this._removeSystemListener()
    if (theme === "system") {
      this._setupSystemListener()
    }
  }

  private _setupSystemListener(): void {
    this._systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    this._systemHandler = () => this.apply()
    this._systemMediaQuery.addEventListener("change", this._systemHandler)
  }

  private _removeSystemListener(): void {
    if (this._systemMediaQuery && this._systemHandler) {
      this._systemMediaQuery.removeEventListener("change", this._systemHandler)
      this._systemMediaQuery = null
      this._systemHandler = null
    }
  }
}

export const themeService = new ThemeService()
