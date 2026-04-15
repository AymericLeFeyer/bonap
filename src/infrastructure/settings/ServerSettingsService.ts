/**
 * ServerSettingsService — synchronise les préférences utilisateur avec le serveur
 * de l'addon HA (marmiton-proxy.cjs → /data/bonap-settings.json).
 *
 * Cela permet de partager les paramètres (thème, LLM) entre les différentes
 * origines d'accès (http://ip:8123 et https://mondomaine) car localStorage est
 * isolé par origine (Same-Origin Policy).
 *
 * En dehors d'un runtime Docker (dev local, prod Vite sans addon HA), les
 * fonctions sont des no-ops silencieuses.
 */
import { getIngressBasename, isDockerRuntime } from '../../shared/utils/env.ts'

/** Clés stockées dans localStorage que l'on synchronise avec le serveur. */
export const SERVER_SETTINGS_KEYS = [
  'bonap_llm_config',
  'bonap_theme',
  'bonap_accent',
  'bonap.familySize',
  'bonap_planning_prefs',
  'bonap.featureFlags',
] as const

export type ServerSettingsKey = (typeof SERVER_SETTINGS_KEYS)[number]

function getSettingsUrl(): string {
  return `${getIngressBasename()}/api/marmiton/settings`
}

/**
 * Charge les paramètres depuis le serveur et les écrit dans localStorage.
 * À appeler au démarrage de l'app (une fois).
 * Résout sans erreur si le serveur est indisponible (hors Docker, réseau coupé).
 */
export async function syncSettingsFromServer(): Promise<void> {
  if (!isDockerRuntime()) return
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000) // 2s max, ne bloque pas le démarrage
    const res = await fetch(getSettingsUrl(), { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return
    const settings = (await res.json()) as Record<string, string>
    for (const key of SERVER_SETTINGS_KEYS) {
      const value = settings[key]
      if (value !== undefined && value !== null) {
        try {
          localStorage.setItem(key, value)
        } catch { /* localStorage indisponible */ }
      }
    }
  } catch { /* serveur indisponible — on utilise localStorage tel quel */ }
}

/**
 * Enregistre une valeur de paramètre sur le serveur (fire-and-forget).
 * Silencieux en hors-Docker.
 */
export function saveSettingToServer(key: ServerSettingsKey, value: string): void {
  if (!isDockerRuntime()) return
  fetch(getSettingsUrl(), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ [key]: value }),
  }).catch(() => { /* best-effort */ })
}
