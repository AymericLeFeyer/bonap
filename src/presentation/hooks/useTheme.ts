import { useCallback, useEffect, useState } from "react"
import { themeService } from "../../infrastructure/theme/ThemeService.ts"
import type { Theme, AccentColor } from "../../infrastructure/theme/ThemeService.ts"

export type { Theme, AccentColor }

function getSystemPreference(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => themeService.getTheme())
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => themeService.getAccentColor())

  // Synchronise l'état React si ThemeService.apply() est appelé en dehors du hook
  // (ex: syncSettingsFromServer au démarrage met à jour localStorage puis appelle apply())
  useEffect(() => {
    const handler = () => {
      setThemeState(themeService.getTheme())
      setAccentColorState(themeService.getAccentColor())
    }
    window.addEventListener('bonap:theme-changed', handler)
    return () => window.removeEventListener('bonap:theme-changed', handler)
  }, [])

  // Appliquer le thème à chaque changement et écouter les changements système
  useEffect(() => {
    themeService.apply()

    if (theme !== "system") return

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => themeService.apply()
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme, accentColor])

  const setTheme = useCallback((next: Theme) => {
    themeService.setTheme(next)
    setThemeState(next)
  }, [])

  const setAccentColor = useCallback((color: AccentColor) => {
    themeService.setAccentColor(color)
    setAccentColorState(color)
  }, [])

  // Conserver toggleTheme pour compatibilité (Sidebar l'utilise encore mais on va le retirer)
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const resolved = prev === "system" ? getSystemPreference() : prev
      const next: Theme = resolved === "dark" ? "light" : "dark"
      themeService.setTheme(next)
      return next
    })
  }, [])

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? getSystemPreference() : theme

  return { theme, resolvedTheme, setTheme, toggleTheme, accentColor, setAccentColor }
}
