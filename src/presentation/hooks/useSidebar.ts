import { useCallback, useState } from "react"

const STORAGE_KEY = "bonap-sidebar-collapsed"

function getStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function useSidebar() {
  // Desktop: sidebar collapsed to icon-only mode
  const [collapsed, setCollapsedState] = useState<boolean>(getStoredCollapsed)
  // Mobile: drawer open or closed
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
<<<<<<< HEAD
      } catch{
        // nothing
      }
=======
      } catch { /* localStorage unavailable */ }
>>>>>>> f905814d36a40f0fea940f73a355cdfbad52ab11
      return next
    })
  }, [])

  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return { collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile }
}
