import { useCallback, useState } from "react"

const STORAGE_KEY = "bonap.featureFlags"

export interface FeatureFlags {
  nutrition: boolean
  servings: boolean
  autoPlan: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
  nutrition: true,
  servings: true,
  autoPlan: true,
}

function loadFlags(): FeatureFlags {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_FLAGS
    return { ...DEFAULT_FLAGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_FLAGS
  }
}

export function useFeatureFlags() {
  const [flags, setFlagsState] = useState<FeatureFlags>(loadFlags)

  const setFlag = useCallback((key: keyof FeatureFlags, value: boolean) => {
    setFlagsState((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { flags, setFlag }
}
