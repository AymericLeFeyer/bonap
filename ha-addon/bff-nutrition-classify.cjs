'use strict'

// Classification d'un ingrédient vers un aliment CIQUAL, puis estimation
// nutritionnelle d'une recette à partir du dictionnaire d'aliments.
// Voir docs/superpowers/specs/2026-10-05-calcul-nutrition-ciqual.md (§5, §7, §8).

const { canonicalWord, detectPrecisions, normalizeFoodKey, sameSet, toPlainText } = require('./bff-nutrition-text.cjs')
const { gramsFor, quantityKind, readIngredient } = require('./bff-nutrition-quantity.cjs')

const RESOLVED_STATUSES = new Set(['validated', 'auto', 'proposed', 'negligible'])
const CANDIDATE_LIMIT = 10
const SUGGESTION_LIMIT = 3
const RAW_PATTERN = /\b(cru|crue)\b/
const PLAIN_PATTERN = /\b(nature|frai|fraiche)\b/
const COOKED_PATTERN = /\b(cuite?|bouillie?|rotie?|poelee?|sautee?|grillee?|frite?|vapeur|braisee?|cuisinee?|mijotee?|reconstituee?|germee?)\b/
const PREPARED_PATTERN = /\b(preemballee?|recette|sauce|gratin|farcie?|plat|garnie?|preparee?)\b/
const SOFT_PRECISIONS = ['seche']
const NUTRIENT_FIELDS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'saturatedFat']
const ENERGY_FACTORS = { protein: 4, carbs: 4, fat: 9, fiber: 2 }

function rawnessOf(name) {
  const text = toPlainText(name).split(' ').map(canonicalWord).join(' ')
  let rawness = 0
  if (RAW_PATTERN.test(text)) rawness += 3
  if (PLAIN_PATTERN.test(text)) rawness += 1
  if (COOKED_PATTERN.test(text)) rawness -= 3
  if (PREPARED_PATTERN.test(text)) rawness -= 5
  return rawness
}

function describeFood(food) {
  const head = normalizeFoodKey(food.name.split(',')[0])
  const key = normalizeFoodKey(food.name)
  return {
    code: food.code,
    name: food.name,
    head,
    headTokens: head.split(' ').filter(Boolean),
    tokens: key.split(' ').filter(Boolean),
    precisions: detectPrecisions(food.name),
    rawness: rawnessOf(food.name),
  }
}

/**
 * Index de la table CIQUAL pour la classification.
 * @param {{ code: string, name: string }[]} foods aliments disposant de nutriments
 */
function buildCiqualIndex(foods) {
  const described = foods.map(describeFood)
  const byCode = new Map(described.map((food) => [food.code, food]))
  const byHead = new Map()
  const byName = new Map()
  const tokenIndex = new Map()
  for (const food of described) {
    if (!byHead.has(food.head)) byHead.set(food.head, [])
    byHead.get(food.head).push(food)
    byName.set(toPlainText(food.name), food)
    for (const token of new Set(food.tokens)) {
      if (!tokenIndex.has(token)) tokenIndex.set(token, [])
      tokenIndex.get(token).push(food)
    }
  }
  return {
    foods: described,
    byCode,
    byHead,
    byName,
    tokenIndex,
    nameOf: (code) => byCode.get(code)?.name ?? null,
  }
}

function compareByRawness(left, right) {
  return right.rawness - left.rawness
    || left.tokens.length - right.tokens.length
    || left.code.localeCompare(right.code, 'en', { numeric: true })
}

function extraPrecisions(food, wanted) {
  return food.precisions.filter((precision) => !wanted.includes(precision))
}

/**
 * Correspondance exacte en forme crue (ou à défaut la plus brute) :
 * même nom principal, mêmes précisions explicites (conserve, surgelé…).
 */
function withoutPrecisionWords(key) {
  return key.split(' ').filter((word) => detectPrecisions(word).length === 0).join(' ')
}

function findExactRawMatch(key, index) {
  const sameHead = [...new Set([
    ...(index.byHead.get(key) ?? []),
    ...(index.byHead.get(withoutPrecisionWords(key)) ?? []),
  ])]
  const wanted = detectPrecisions(key)
  const strict = sameHead.filter((food) => sameSet(food.precisions, wanted) && food.rawness >= 0)
  const brute = sameHead.filter((food) => {
    const extra = extraPrecisions(food, wanted)
    return food.rawness >= 0
      && wanted.every((precision) => food.precisions.includes(precision))
      && extra.length > 0
      && extra.every((precision) => SOFT_PRECISIONS.includes(precision))
  })
  const strictRaw = strict.filter((food) => RAW_PATTERN.test(toPlainText(food.name)))
  const pool = strictRaw.length > 0 ? strictRaw : [...strict, ...brute]
  return pool.sort(compareByRawness)[0] ?? null
}

function scoreCandidate(food, keyTokens, key, wanted) {
  const overlap = keyTokens.filter((token) => food.tokens.includes(token)).length
  if (overlap === 0) return -Infinity
  const headOverlap = keyTokens.filter((token) => food.headTokens.includes(token)).length
  const precisionMismatch = extraPrecisions(food, wanted).length
    + wanted.filter((precision) => !food.precisions.includes(precision)).length
  let score = overlap * 8 + headOverlap * 2
  score -= Math.max(0, food.headTokens.length - headOverlap)
  score -= precisionMismatch * 6
  score += food.rawness * 2
  if (food.head === key) score += 20
  else if (food.head.startsWith(`${key} `)) score += 6
  return score
}

/**
 * Recherche approchée : les meilleurs candidats, entrées crues favorisées.
 * @returns {{ code: string, name: string, score: number, food: object }[]}
 */
function findCandidates(text, index, limit = CANDIDATE_LIMIT) {
  const key = normalizeFoodKey(text)
  const keyTokens = key.split(' ').filter((token) => token.length >= 2)
  if (keyTokens.length === 0) return []
  const wanted = detectPrecisions(key)
  const pool = new Set(keyTokens.flatMap((token) => index.tokenIndex.get(token) ?? []))
  return [...pool]
    .map((food) => ({ code: food.code, name: food.name, score: scoreCandidate(food, keyTokens, key, wanted), food }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score || compareByRawness(left.food, right.food))
    .slice(0, limit)
}

/**
 * Sans IA, la recherche approchée n'est retenue que si le nom du meilleur
 * candidat commence par l'ingrédient, n'ajoute qu'un mot au plus, est cru
 * ou brut, et devance nettement le suivant.
 */
function isConfidentApproximate(key, candidates) {
  const [best, second] = candidates
  if (!best) return false
  const keyTokens = key.split(' ')
  const { food } = best
  const coversKey = food.head === key || food.head.startsWith(`${key} `)
  const extraTokens = food.headTokens.length - keyTokens.length
  return coversKey
    && extraTokens <= 1
    && food.rawness >= 0
    && sameSet(food.precisions, detectPrecisions(key))
    && (!second || best.score > second.score)
}

function isResolved(entry) {
  return !!entry && RESOLVED_STATUSES.has(entry.status) && (entry.negligible || !!entry.ciqualCode)
}

function groupIngredientsByKey(ingredients) {
  const groups = new Map()
  for (const ingredient of ingredients) {
    const reading = readIngredient(ingredient)
    const key = normalizeFoodKey(reading.label)
    if (!key) continue
    const kind = quantityKind(reading)
    const group = groups.get(key) ?? { key, label: reading.label, kinds: new Set() }
    group.kinds.add(kind)
    groups.set(key, group)
  }
  return [...groups.values()]
}

function legacyCodeFor(label, legacyMappings, index) {
  const legacyName = legacyMappings[label]
  if (typeof legacyName !== 'string') return null
  return index.byName.get(toPlainText(legacyName))?.code ?? null
}

function toCandidateList(candidates) {
  return candidates.map(({ code, name }) => ({ code, name }))
}

/**
 * Résout chaque ingrédient distinct : fiche du dictionnaire, correspondance
 * héritée, correspondance exacte crue, puis recherche approchée.
 * Les fiches automatiques à enregistrer sont renvoyées dans `patches`.
 * Les ingrédients restants sont signalés `needsAi` quand l'IA est active.
 * Les éléments renvoyés passent ensuite par `refreshItems`.
 */
function classifyIngredients(ingredients, { store, index, aiEnabled, legacyMappings = {} }) {
  const items = []
  const patches = []

  for (const group of groupIngredientsByKey(ingredients)) {
    if (group.kinds.size === 1 && group.kinds.has('vague')) continue

    const current = store.get(group.key, index)
    const item = {
      key: group.key,
      label: group.label,
      entry: current,
      needsAi: false,
      candidates: [],
      hasPieceQuantity: group.kinds.has('piece'),
    }

    if (!isResolved(current)) {
      const legacyCode = current ? null : legacyCodeFor(group.label, legacyMappings, index)
      const exact = legacyCode ? null : findExactRawMatch(group.key, index)
      if (legacyCode) {
        patches.push({ key: group.key, ciqualCode: legacyCode, ciqualName: index.nameOf(legacyCode), status: 'proposed', origin: 'legacy' })
      } else if (exact) {
        patches.push({ key: group.key, ciqualCode: exact.code, ciqualName: exact.name, status: 'auto', origin: 'auto' })
      } else {
        const candidates = findCandidates(group.key, index)
        item.candidates = toCandidateList(candidates)
        if (aiEnabled && candidates.length > 0) {
          item.needsAi = true
        } else if (isConfidentApproximate(group.key, candidates)) {
          patches.push({ key: group.key, ciqualCode: candidates[0].code, ciqualName: candidates[0].name, status: 'auto', origin: 'auto' })
        } else {
          patches.push({
            key: group.key,
            status: 'to-review',
            origin: 'auto',
            suggestions: toCandidateList(candidates.slice(0, SUGGESTION_LIMIT)),
          })
        }
      }
    }

    items.push(item)
  }

  return { items, patches }
}

/**
 * Relit les fiches après enregistrement et signale les aliments comptés à la
 * pièce dont le poids d'une pièce est encore inconnu.
 */
function refreshItems(items, store, index) {
  return items.map((item) => {
    const entry = store.get(item.key, index)
    const needsPieceWeight = item.hasPieceQuantity && !!entry?.ciqualCode && !entry.negligible && !entry.pieceWeight
    return { ...item, entry, needsPieceWeight }
  })
}

function round(value, digits = 1) {
  return Number((value || 0).toFixed(digits))
}

function formatNutritionField(value, unit) {
  return value > 0 ? `${round(value)} ${unit}` : undefined
}

function emptyTotals() {
  return Object.fromEntries(NUTRIENT_FIELDS.map((field) => [field, 0]))
}

/**
 * Certaines entrées CIQUAL 2020 (les pommes, par exemple) n'ont pas de valeur
 * d'énergie alors que leurs macronutriments sont renseignés : l'énergie est
 * alors recalculée avec les coefficients du règlement UE n° 1169/2011.
 */
function withEnergy(nutrients) {
  if (Number.isFinite(nutrients.calories)) return nutrients
  const calories = Object.entries(ENERGY_FACTORS)
    .reduce((sum, [field, factor]) => sum + (nutrients[field] || 0) * factor, 0)
  return { ...nutrients, calories }
}

function addNutrients(totals, nutrients, grams) {
  const factor = grams / 100
  for (const field of NUTRIENT_FIELDS) totals[field] += (nutrients[field] || 0) * factor
}

function toMealieNutrition(totals) {
  return {
    calories: formatNutritionField(totals.calories, 'kcal'),
    proteinContent: formatNutritionField(totals.protein, 'g'),
    carbohydrateContent: formatNutritionField(totals.carbs, 'g'),
    fatContent: formatNutritionField(totals.fat, 'g'),
    fiberContent: formatNutritionField(totals.fiber, 'g'),
    sugarContent: formatNutritionField(totals.sugar, 'g'),
    sodiumContent: formatNutritionField(totals.sodium, 'mg'),
    saturatedFatContent: formatNutritionField(totals.saturatedFat, 'g'),
  }
}

/**
 * Couverture : part du poids total de la recette réellement estimée,
 * hors ingrédients négligeables. Un ingrédient exclu dont le poids est
 * inconnu compte pour le poids moyen des ingrédients pesés.
 */
function computeCoverage(lines) {
  const weighed = lines.filter((line) => !line.negligible && line.grams !== null)
  const unknownCount = lines.filter((line) => !line.negligible && line.grams === null).length
  const estimatedGrams = weighed.filter((line) => line.included).reduce((sum, line) => sum + line.grams, 0)
  const knownGrams = weighed.reduce((sum, line) => sum + line.grams, 0)
  const averageGrams = weighed.length > 0 ? knownGrams / weighed.length : 100
  const totalGrams = knownGrams + unknownCount * averageGrams
  return {
    estimatedGrams: round(estimatedGrams),
    totalGrams: round(totalGrams),
    coverage: totalGrams > 0 ? round(estimatedGrams / totalGrams, 3) : 0,
  }
}

function exclusionReason(entry, conversion) {
  if (!entry?.ciqualCode || entry.status === 'to-review') return 'no-match'
  if (conversion.reason) return conversion.reason
  return null
}

/**
 * Estime la nutrition d'une recette à partir du dictionnaire.
 * Le résultat est ramené à une portion.
 * @param {{ store, index, nutrientsOf: (code: string) => object | null, fallbackNutrients: (label: string) => Promise<object | null> }} context
 */
async function estimateRecipe(ingredients, servings, context) {
  const { store, index, nutrientsOf, fallbackNutrients } = context
  const totals = emptyTotals()
  const lines = []
  let usedFallback = false

  for (const ingredient of ingredients) {
    const reading = readIngredient(ingredient)
    const key = normalizeFoodKey(reading.label)
    if (!key) continue
    const entry = store.get(key, index)
    const base = {
      ingredient: reading.label,
      key,
      status: entry?.status ?? 'to-review',
      ciqualCode: entry?.ciqualCode ?? null,
      ciqualName: entry?.ciqualName ?? null,
      grams: null,
      included: false,
      negligible: false,
      source: null,
    }

    const conversion = entry?.negligible ? { negligible: true } : gramsFor(reading, key, entry)
    if (conversion.negligible) {
      lines.push({ ...base, negligible: true, reason: entry?.negligible ? 'negligible' : 'vague-quantity' })
      continue
    }

    const grams = conversion.grams ?? null
    const reason = exclusionReason(entry, conversion)
    if (reason) {
      lines.push({ ...base, grams: grams === null ? null : round(grams), reason })
      continue
    }

    let nutrients = nutrientsOf(entry.ciqualCode)
    let source = 'ciqual'
    if (!nutrients) {
      nutrients = await fallbackNutrients(entry.ciqualName || reading.label)
      source = 'off'
      usedFallback = usedFallback || !!nutrients
    }
    if (!nutrients) {
      lines.push({ ...base, grams: round(grams), reason: 'no-nutrients' })
      continue
    }

    addNutrients(totals, withEnergy(nutrients), grams)
    lines.push({ ...base, grams: round(grams), included: true, source })
  }

  const portions = Number.isFinite(servings) && servings > 0 ? servings : 1
  const perServing = Object.fromEntries(NUTRIENT_FIELDS.map((field) => [field, totals[field] / portions]))

  return {
    source: usedFallback ? 'ANSES CIQUAL 2020 (+ Open Food Facts)' : 'ANSES CIQUAL 2020',
    servings: portions,
    ...computeCoverage(lines),
    lines,
    nutrition: toMealieNutrition(perServing),
  }
}

module.exports = {
  buildCiqualIndex,
  classifyIngredients,
  computeCoverage,
  estimateRecipe,
  findCandidates,
  findExactRawMatch,
  isConfidentApproximate,
  rawnessOf,
  refreshItems,
  withEnergy,
}
