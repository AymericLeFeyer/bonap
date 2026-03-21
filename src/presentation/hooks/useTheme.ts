import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"

const STORAGE_KEY = "bonap-theme"

function getSystemPreference(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme): void {
  const resolved = theme === "system" ? getSystemPreference() : theme
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch (_) {}
  return "system"
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  // Apply on mount and listen to system preference changes when theme === 'system'
  useEffect(() => {
    applyTheme(theme)

    if (theme !== "system") return

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch (_) {}
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      // Simple toggle light ↔ dark (bypassing system)
      const resolved = prev === "system" ? getSystemPreference() : prev
      const next: Theme = resolved === "dark" ? "light" : "dark"
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch (_) {}
      return next
    })
  }, [])

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? getSystemPreference() : theme

  return { theme, resolvedTheme, setTheme, toggleTheme }
}
