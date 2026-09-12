/**
 * ServerSettingsService — synchronise les préférences utilisateur avec le serveur
 * de l'addon HA (bonap-bff.cjs → /data/bonap-settings.json).
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
  'bonap_home_page',
] as const

export type ServerSettingsKey = (typeof SERVER_SETTINGS_KEYS)[number]

/**
 * Champs de `bonap_llm_config` qui restent dans le localStorage du navigateur :
 * GET /api/bonap/settings est public (pas d'auth dans Bonap), une clé API
 * synchronisée serait lisible par n'importe quel visiteur. Le BFF les filtre
 * aussi de son côté (ha-addon/bff-settings.cjs).
 */
const LOCAL_ONLY_LLM_FIELDS = ['apiKey'] as const

function parseObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Valeur à envoyer au serveur : sans les champs secrets. */
export function toServerSettingValue(key: ServerSettingsKey, value: string): string {
  if (key !== 'bonap_llm_config') return value
  const parsed = parseObject(value)
  if (!parsed) return value
  for (const field of LOCAL_ONLY_LLM_FIELDS) delete parsed[field]
  return JSON.stringify(parsed)
}

/**
 * Valeur à écrire en localStorage à partir de celle du serveur : les champs
 * secrets déjà présents localement sont conservés (le serveur ne les a jamais).
 */
export function mergeServerSettingValue(
  key: ServerSettingsKey,
  serverValue: string,
  localValue: string | null,
): string {
  if (key !== 'bonap_llm_config') return serverValue
  const server = parseObject(serverValue)
  if (!server) return serverValue
  for (const field of LOCAL_ONLY_LLM_FIELDS) delete server[field]
  const local = parseObject(localValue)
  for (const field of LOCAL_ONLY_LLM_FIELDS) {
    if (local && field in local) server[field] = local[field]
  }
  return JSON.stringify(server)
}

function getSettingsUrl(): string {
  return `${getIngressBasename()}/api/bonap/settings`
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
      if (typeof value === 'string') {
        try {
          localStorage.setItem(key, mergeServerSettingValue(key, value, localStorage.getItem(key)))
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
    body: JSON.stringify({ [key]: toServerSettingValue(key, value) }),
  }).catch(() => { /* best-effort */ })
}
