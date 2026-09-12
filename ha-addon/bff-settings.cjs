'use strict'

// Validation des paramètres partagés (/data/bonap-settings.json).
// Le BFF n'a pas d'authentification : tout visiteur peut lire et écrire ce
// fichier. On n'y accepte donc que les clés connues du front, en chaîne de
// taille bornée, et on n'y conserve jamais de secret.

// Miroir de SERVER_SETTINGS_KEYS (src/infrastructure/settings/ServerSettingsService.ts).
const ALLOWED_SETTINGS_KEYS = new Set([
  'bonap_llm_config',
  'bonap_theme',
  'bonap_accent',
  'bonap.familySize',
  'bonap_planning_prefs',
  'bonap.featureFlags',
  'bonap_home_page',
])

const MAX_SETTING_LENGTH = 16 * 1024

// Champs de bonap_llm_config qui ne doivent jamais être stockés côté serveur :
// GET /settings est public, une clé API y serait lisible par n'importe qui.
const SECRET_LLM_FIELDS = ['apiKey']

/**
 * Retourne la valeur nettoyée, ou null si elle est invalide.
 * @param {string} key
 * @param {unknown} value
 */
function sanitizeSettingValue(key, value) {
  if (!ALLOWED_SETTINGS_KEYS.has(key)) return null
  if (typeof value !== 'string' || value.length > MAX_SETTING_LENGTH) return null
  if (key !== 'bonap_llm_config') return value
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    for (const field of SECRET_LLM_FIELDS) delete parsed[field]
    return JSON.stringify(parsed)
  } catch {
    return null
  }
}

/** Filtre un objet de paramètres complet (lecture du fichier existant). */
function sanitizeSettings(settings) {
  const out = {}
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return out
  for (const [key, value] of Object.entries(settings)) {
    const clean = sanitizeSettingValue(key, value)
    if (clean !== null) out[key] = clean
  }
  return out
}

/**
 * Valide le corps d'un PATCH /settings.
 * @returns {{ ok: true, patch: Record<string,string> } | { ok: false, error: string }}
 */
function validateSettingsPatch(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Corps JSON objet attendu' }
  }
  const patch = {}
  for (const [key, value] of Object.entries(body)) {
    const clean = sanitizeSettingValue(key, value)
    if (clean === null) return { ok: false, error: `Paramètre refusé : ${key.slice(0, 64)}` }
    patch[key] = clean
  }
  return { ok: true, patch }
}

module.exports = {
  ALLOWED_SETTINGS_KEYS,
  MAX_SETTING_LENGTH,
  sanitizeSettingValue,
  sanitizeSettings,
  validateSettingsPatch,
}
