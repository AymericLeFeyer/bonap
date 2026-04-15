import { useState } from "react"
import { updateNutritionUseCase } from "../../infrastructure/container.ts"
import type { MealieNutrition, MealieRecipe } from "../../shared/types/mealie.ts"

function extractErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Impossible de mettre a jour la nutrition."
  const raw = (err.message || "").trim()
  try {
    const parsed = JSON.parse(raw)
    const detail = parsed?.detail
    if (typeof detail?.message === "string" && detail.message.trim()) {
      return detail.message.trim()
    }
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim()
    }
    if (typeof parsed?.message === "string" && parsed.message.trim()) {
      return parsed.message.trim()
    }
    if (typeof parsed?.error === "string" && parsed.error.trim()) {
      return parsed.error.trim()
    }
  } catch {
    // Keep raw message if not JSON.
  }
  if (!raw || /^unknown error$/i.test(raw)) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (typeof statusCode === "number" && Number.isFinite(statusCode)) {
      return `Erreur API ${statusCode} pendant la mise a jour de la nutrition.`
    }
    return "Impossible de mettre a jour la nutrition."
  }
  return raw
}

export function useUpdateNutrition() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateNutrition = async (
    slug: string,
    nutrition: MealieNutrition,
    source?: string,
    ciqualMappings?: Record<string, string>,
  ): Promise<MealieRecipe | null> => {
    setLoading(true)
    setError(null)
    try {
      return await updateNutritionUseCase.execute(slug, nutrition, source, ciqualMappings)
    } catch (err) {
      setError(extractErrorMessage(err))
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateNutrition, loading, error }
}
