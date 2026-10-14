import { useCallback, useEffect, useRef, useState } from "react"
import type { BulkProgress, BulkReport } from "../../application/nutrition/usecases/CompleteAllRecipesNutritionUseCase.ts"
import { completeAllRecipesNutritionUseCase } from "../../infrastructure/container.ts"
import { useCiqualAi } from "./useCiqualAi.ts"

/** Lancement global « Compléter toutes les recettes avec CIQUAL », annulable. */
export function useCompleteAllRecipesNutrition() {
  const { enabled: aiEnabled } = useCiqualAi()
  const [progress, setProgress] = useState<BulkProgress | null>(null)
  const [report, setReport] = useState<BulkReport | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const start = useCallback(async () => {
    const controller = new AbortController()
    controllerRef.current = controller
    setRunning(true)
    setError(null)
    setReport(null)
    setProgress(null)
    try {
      setReport(await completeAllRecipesNutritionUseCase.execute({
        aiEnabled,
        signal: controller.signal,
        onProgress: setProgress,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le traitement a échoué")
    } finally {
      controllerRef.current = null
      setRunning(false)
    }
  }, [aiEnabled])

  const cancel = useCallback(() => controllerRef.current?.abort(), [])

  return { aiEnabled, progress, report, running, error, start, cancel }
}
