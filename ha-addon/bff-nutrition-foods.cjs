'use strict'

// Dictionnaire d'aliments partagé (/data/bonap-nutrition-foods.json).
// Le BFF n'a pas d'authentification : chaque fiche reçue est validée
// (clé normalisée, code CIQUAL existant, bornes de poids et de densité,
// nombre de fiches) avant d'être enregistrée.

const fs = require('fs')
const { normalizeFoodKey } = require('./bff-nutrition-text.cjs')

const FOOD_STATUSES = ['validated', 'auto', 'proposed', 'to-review', 'negligible']
const FOOD_ORIGINS = ['user', 'auto', 'ai', 'legacy']
const MAX_KEY_LENGTH = 80
const MAX_ENTRIES = 5000
const MAX_PATCHES_PER_REQUEST = 500
const MAX_SUGGESTIONS = 5
const PIECE_WEIGHT_RANGE = { min: 1, max: 5000 }
const DENSITY_RANGE = { min: 0.1, max: 3 }

const SEED_FOODS = {
  oeuf: { ciqualCode: '22000', pieceWeight: 60 },
  oignon: { ciqualCode: '20034', pieceWeight: 110 },
  echalote: { ciqualCode: '20097', pieceWeight: 35 },
  carotte: { ciqualCode: '20009', pieceWeight: 125 },
  'pomme terre': { ciqualCode: '4008', pieceWeight: 150 },
  tomate: { ciqualCode: '20047', pieceWeight: 120 },
  citron: { ciqualCode: '13009', pieceWeight: 120 },
  courgette: { ciqualCode: '20020', pieceWeight: 200 },
  poivron: { ciqualCode: '20041', pieceWeight: 150 },
  'chou fleur': { ciqualCode: '20016', pieceWeight: 600 },
  ail: { ciqualCode: '11000' },
  farine: { ciqualCode: '9436', density: 0.53 },
  sucre: { ciqualCode: '31016', density: 0.85 },
  'sucre roux': { ciqualCode: '31017', density: 0.85 },
  beurre: { ciqualCode: '16400' },
  'beurre doux': { ciqualCode: '16400' },
  'beurre demi sel': { ciqualCode: '16402' },
  'beurre sale': { ciqualCode: '16403' },
  lait: { ciqualCode: '19041', density: 1.03 },
  'lait entier': { ciqualCode: '19023', density: 1.03 },
  creme: { ciqualCode: '19402', density: 1.03 },
  'creme epaisse': { ciqualCode: '19410', density: 1.03 },
  'creme liquide': { ciqualCode: '19436', density: 1.03 },
  huile: { ciqualCode: '17270', density: 0.92 },
  'huile olive': { ciqualCode: '17270', density: 0.92 },
  'huile tournesol': { ciqualCode: '17440', density: 0.92 },
  miel: { ciqualCode: '31008', density: 1.3 },
  pate: { ciqualCode: '9810' },
  riz: { ciqualCode: '9100' },
  semoule: { ciqualCode: '9610' },
  paleron: { ciqualCode: '6002' },
  'tomate pelee': { ciqualCode: '20048' },
  'tomate pelee conserve': { ciqualCode: '20048' },
  mais: { ciqualCode: '20066' },
  'mais doux': { ciqualCode: '20066' },
  'boeuf hache': { ciqualCode: '6254' },
  'steak hache': { ciqualCode: '6254' },
  lardon: { ciqualCode: '28501' },
  'lardon fume': { ciqualCode: '28720' },
  emmental: { ciqualCode: '12115' },
  gruyere: { ciqualCode: '12114' },
  parmesan: { ciqualCode: '12120' },
  mozzarella: { ciqualCode: '19590' },
  jambon: { ciqualCode: '28900' },
  'jambon blanc': { ciqualCode: '28900' },
  'blanc poulet': { ciqualCode: '36017' },
  'filet poulet': { ciqualCode: '36017' },
  'thon conserve': { ciqualCode: '26039' },
  yaourt: { ciqualCode: '19593' },
  'yaourt nature': { ciqualCode: '19593' },
  chocolat: { ciqualCode: '31005' },
  'chocolat noir': { ciqualCode: '31005' },
  'vin blanc': { ciqualCode: '5215', density: 1 },
  'vin rouge': { ciqualCode: '5214', density: 1 },
  sel: { negligible: true },
  poivre: { negligible: true },
  'sel poivre': { negligible: true },
  'poivre noir': { negligible: true },
  'fleur sel': { negligible: true },
  eau: { negligible: true },
  'eau froide': { negligible: true },
  'eau chaude': { negligible: true },
  'eau tiede': { negligible: true },
}

function emptyEntry() {
  return {
    ciqualCode: null,
    ciqualName: null,
    pieceWeight: null,
    density: null,
    negligible: false,
    status: 'to-review',
    origin: 'auto',
    suggestions: [],
    updatedAt: null,
  }
}

/**
 * Fiche initiale tirée des correspondances historiquement codées en dur.
 * @param {string} key
 * @param {{ nameOf: (code: string) => string | null }} ciqual
 */
function seedEntry(key, ciqual) {
  const seed = SEED_FOODS[key]
  if (!seed) return null
  const ciqualName = seed.ciqualCode ? ciqual.nameOf(seed.ciqualCode) : null
  if (seed.ciqualCode && !ciqualName && !seed.negligible) return null
  return {
    ...emptyEntry(),
    ciqualCode: ciqualName ? seed.ciqualCode : null,
    ciqualName,
    pieceWeight: seed.pieceWeight ?? null,
    density: seed.density ?? null,
    negligible: !!seed.negligible,
    status: seed.negligible ? 'negligible' : 'auto',
  }
}

function isInRange(value, range) {
  return typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max
}

function validateKey(key) {
  if (typeof key !== 'string' || !key || key.length > MAX_KEY_LENGTH) return 'Clé d\'aliment invalide'
  if (normalizeFoodKey(key) !== key) return `Clé non normalisée : « ${key} »`
  return null
}

function validateNullableNumber(value, range, label) {
  if (value === null) return null
  return isInRange(value, range) ? null : `${label} hors bornes (${range.min} à ${range.max})`
}

/**
 * Valide une modification de fiche reçue du navigateur.
 * Le nom CIQUAL n'est jamais repris du client : il est relu dans la table.
 * @param {unknown} raw
 * @param {{ nameOf: (code: string) => string | null }} ciqual
 */
function validateFoodPatch(raw, ciqual) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Fiche invalide' }
  const keyError = validateKey(raw.key)
  if (keyError) return { ok: false, error: keyError }

  const patch = { key: raw.key }

  if ('ciqualCode' in raw) {
    if (raw.ciqualCode === null) {
      patch.ciqualCode = null
      patch.ciqualName = null
    } else {
      const name = typeof raw.ciqualCode === 'string' ? ciqual.nameOf(raw.ciqualCode) : null
      if (!name) return { ok: false, error: `Code CIQUAL inconnu : ${String(raw.ciqualCode).slice(0, 20)}` }
      patch.ciqualCode = raw.ciqualCode
      patch.ciqualName = name
    }
  }

  if ('pieceWeight' in raw) {
    const error = validateNullableNumber(raw.pieceWeight, PIECE_WEIGHT_RANGE, 'Poids d\'une pièce')
    if (error) return { ok: false, error }
    patch.pieceWeight = raw.pieceWeight
  }

  if ('density' in raw) {
    const error = validateNullableNumber(raw.density, DENSITY_RANGE, 'Densité')
    if (error) return { ok: false, error }
    patch.density = raw.density
  }

  if ('negligible' in raw) {
    if (typeof raw.negligible !== 'boolean') return { ok: false, error: 'Champ « négligeable » invalide' }
    patch.negligible = raw.negligible
  }

  if ('status' in raw) {
    if (!FOOD_STATUSES.includes(raw.status)) return { ok: false, error: 'Statut invalide' }
    patch.status = raw.status
  }

  if (!FOOD_ORIGINS.includes(raw.origin)) return { ok: false, error: 'Origine invalide' }
  patch.origin = raw.origin

  if ('suggestions' in raw) {
    if (!Array.isArray(raw.suggestions)) return { ok: false, error: 'Suggestions invalides' }
    patch.suggestions = raw.suggestions
      .slice(0, MAX_SUGGESTIONS)
      .filter((code) => typeof code === 'string')
      .map((code) => ({ code, name: ciqual.nameOf(code) }))
      .filter((suggestion) => !!suggestion.name)
  }

  return { ok: true, patch }
}

function resolveStatusAndFlag(entry, patch) {
  if (patch.negligible === true || patch.status === 'negligible') {
    return { ...entry, negligible: true, status: 'negligible' }
  }
  if (patch.negligible === false && entry.status === 'negligible') {
    return { ...entry, negligible: false, status: entry.ciqualCode ? 'proposed' : 'to-review' }
  }
  if (patch.status && patch.status !== 'negligible') return { ...entry, negligible: false }
  return entry
}

/**
 * Applique une modification à une fiche. Une fiche validée par l'utilisateur
 * n'est jamais modifiée par un traitement automatique ou par l'IA.
 * @returns {object | null} la nouvelle fiche, ou null si la modification est refusée
 */
function mergeFoodEntry(current, patch, now = new Date()) {
  if (current?.status === 'validated' && patch.origin !== 'user') return null
  const { key: _key, ...fields } = patch
  const merged = { ...emptyEntry(), ...current, ...fields, updatedAt: now.toISOString() }
  return resolveStatusAndFlag(merged, patch)
}

function sanitizeStoredFoods(raw) {
  const foods = raw && typeof raw === 'object' && raw.foods && typeof raw.foods === 'object' ? raw.foods : {}
  const result = {}
  for (const [key, entry] of Object.entries(foods).slice(0, MAX_ENTRIES)) {
    if (validateKey(key) || !entry || typeof entry !== 'object') continue
    if (!FOOD_STATUSES.includes(entry.status) || !FOOD_ORIGINS.includes(entry.origin)) continue
    result[key] = { ...emptyEntry(), ...entry }
  }
  return result
}

/**
 * Stockage fichier du dictionnaire. Les fiches initiales ne sont pas écrites :
 * elles servent de valeurs par défaut tant qu'aucune fiche n'existe.
 * @param {{ filePath: string }} options
 */
function createFoodStore({ filePath }) {
  let cache = null

  function load() {
    if (cache) return cache
    try {
      cache = fs.existsSync(filePath) ? sanitizeStoredFoods(JSON.parse(fs.readFileSync(filePath, 'utf8'))) : {}
    } catch (e) {
      console.error('[Nutrition] Dictionnaire illisible, repart à vide :', e.message)
      cache = {}
    }
    return cache
  }

  function persist(foods) {
    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, foods }, null, 2), 'utf8')
    fs.renameSync(tmp, filePath)
    cache = foods
  }

  function get(key, ciqual) {
    return load()[key] ?? seedEntry(key, ciqual)
  }

  function all(ciqual) {
    const seeds = Object.fromEntries(
      Object.keys(SEED_FOODS)
        .map((key) => [key, seedEntry(key, ciqual)])
        .filter(([, entry]) => entry !== null),
    )
    return { ...seeds, ...load() }
  }

  /**
   * @param {object[]} patches modifications déjà validées
   * @returns {{ updated: Record<string, object>, skipped: string[] }}
   */
  function upsert(patches, ciqual) {
    const foods = { ...load() }
    const updated = {}
    const skipped = []
    for (const patch of patches) {
      const current = foods[patch.key] ?? seedEntry(patch.key, ciqual)
      const merged = mergeFoodEntry(current, patch)
      if (!merged) {
        skipped.push(patch.key)
        continue
      }
      if (!(patch.key in foods) && Object.keys(foods).length >= MAX_ENTRIES) {
        skipped.push(patch.key)
        continue
      }
      foods[patch.key] = merged
      updated[patch.key] = merged
    }
    if (Object.keys(updated).length > 0) persist(foods)
    return { updated, skipped }
  }

  return { all, get, upsert }
}

module.exports = {
  DENSITY_RANGE,
  FOOD_ORIGINS,
  FOOD_STATUSES,
  MAX_ENTRIES,
  MAX_PATCHES_PER_REQUEST,
  PIECE_WEIGHT_RANGE,
  SEED_FOODS,
  createFoodStore,
  mergeFoodEntry,
  seedEntry,
  validateFoodPatch,
}
