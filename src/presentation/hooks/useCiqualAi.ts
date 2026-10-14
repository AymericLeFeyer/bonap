import { useCallback } from "react"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"
import { useFeatureFlags } from "./useFeatureFlags.ts"

/**
 * Correspondance CIQUAL assistée par l'IA : active seulement si un fournisseur
 * IA est configuré et que l'interrupteur des Paramètres est allumé.
 */
export function useCiqualAi() {
  const { flags, setFlag } = useFeatureFlags()
  const available = llmConfigService.isConfigured()
  const setEnabled = useCallback((value: boolean) => setFlag("ciqualAi", value), [setFlag])

  return { available, enabled: available && flags.ciqualAi, setEnabled }
}
