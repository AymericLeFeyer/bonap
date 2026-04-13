'use strict'

const express = require('express')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const app = express()
const PORT = 3001
const execFileAsync = promisify(execFile)
// Pure-JS windows-1252 decoder (Alpine Node uses small-icu which lacks extended encodings)
function decodeWindows1252(buffer) {
  // Supplemental codepoints for bytes 0x80-0x9F (undefined entries stay as replacement char)
  const cp1252 = [
    0x20AC, 0xFFFD, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
    0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0xFFFD, 0x017D, 0xFFFD,
    0xFFFD, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
    0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0xFFFD, 0x017E, 0x0178,
  ]
  let out = ''
  for (let i = 0; i < buffer.length; i++) {
    const b = buffer[i]
    if (b < 0x80 || b >= 0xA0) out += String.fromCharCode(b)
    else out += String.fromCharCode(cp1252[b - 0x80])
  }
  return out
}
app.use(express.json({ limit: '1mb' }))

// Ollama server-side (injected via env vars from run.sh)
const OLLAMA_URL = (process.env.OLLAMA_URL || '').replace(/\/+$/, '')
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || ''

const BASE_URL = 'https://www.marmiton.org'
const SEARCH_URL = `${BASE_URL}/recettes/recherche.aspx`
const CIQUAL_ZIP_URL = 'https://ciqual.anses.fr/cms/sites/default/files/inline-files/XML_2020_07_07.zip'
const CIQUAL_DATA_DIR = process.env.CIQUAL_DATA_DIR || path.join(os.tmpdir(), 'bonap-ciqual')
const CIQUAL_FILES = {
  foods: 'alim_2020_07_07.xml',
  composition: 'compo_2020_07_07.xml',
}
const CIQUAL_CODES = {
  calories: '328',
  protein: '25000',
  carbs: '31000',
  sugar: '32000',
  fiber: '34100',
  fat: '40000',
  saturatedFat: '40302',
  sodium: '10110',
}
const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const INGREDIENT_ALIASES = [
  { pattern: /\bpaleron\b/g, value: 'boeuf' },
  { pattern: /\btomates? pelee?s?\b/g, value: 'tomate en conserve' },
  { pattern: /\bmais\b/g, value: 'mais en conserve' },
  { pattern: /\bmais doux\b/g, value: 'mais en conserve' },
  { pattern: /\bboite\s+de\s+mais\b/g, value: 'mais en conserve' },
]
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
}
let ciqualCachePromise = null
const openFoodFactsCache = new Map()

// Parse ISO 8601 duration → minutes (ex: "PT1H30M" → 90)
function parseISO8601(duration) {
  if (!duration) return 0
  const h = parseInt(duration.match(/(\d+)H/)?.[1] ?? '0', 10)
  const m = parseInt(duration.match(/(\d+)M/)?.[1] ?? '0', 10)
  return h * 60 + m
}

function formatMinutes(min) {
  if (!min || min <= 0) return ''
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const r = min % 60
  return r > 0 ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

function toAbsoluteUrl(raw, baseUrl = BASE_URL) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) return `https:${s}`
  try {
    return new URL(s, baseUrl).toString()
  } catch {
    return s
  }
}

function extractImageUrl(value, baseUrl = BASE_URL) {
  if (!value) return ''
  if (typeof value === 'string') return toAbsoluteUrl(value, baseUrl)
  if (Array.isArray(value)) {
    for (const v of value) {
      const u = extractImageUrl(v, baseUrl)
      if (u) return u
    }
    return ''
  }
  if (typeof value === 'object') {
    return (
      extractImageUrl(value.url, baseUrl) ||
      extractImageUrl(value.contentUrl, baseUrl) ||
      extractImageUrl(value.thumbnailUrl, baseUrl)
    )
  }
  return ''
}

// Parse all JSON-LD blocks from an HTML string, return array of parsed objects
// Handles: plain, HTML-entity encoded (Marmiton), and whitespace/case variations
function parseJsonLd(html) {
  const results = []
  // Match both plain text and HTML-entity encoded type attributes, with optional whitespace/quotes
  const re = /<script[^>]*type\s*=\s*["']?\s*(?:application\/ld\+json|application&#x2F;ld&#x2B;json)\s*["']?[^>]*>([\s\S]*?)<\/script>/gi
  for (const [, content] of html.matchAll(re)) {
    try {
      const data = JSON.parse(content.trim())
      if (Array.isArray(data)) results.push(...data)
      else results.push(data)
    } catch (_) {}
  }
  // Also handle @graph wrapper (common pattern)
  const wrapped = results.flatMap(r => r['@graph'] ? r['@graph'] : [r])
  return wrapped
}

function normalizeSpace(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim()
}

function normalizeNutritionText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseNutritionNumber(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const normalized = raw.replace(',', '.')
  const num = Number.parseFloat(normalized)
  return Number.isFinite(num) ? num : null
}

function parseQuantityString(value) {
  const raw = String(value ?? '').trim()
    .replace(/\u00BC/g, '1/4')
    .replace(/\u00BD/g, '1/2')
    .replace(/\u00BE/g, '3/4')
  if (!raw) return null
  const frac = raw.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) {
    const num = Number.parseFloat(frac[1])
    const den = Number.parseFloat(frac[2])
    if (den > 0) return num / den
  }
  const num = Number.parseFloat(raw.replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

function decodeCiqualFile(filePath) {
  return decodeWindows1252(fs.readFileSync(filePath))
}

function extractXmlValue(block, tag) {
  return normalizeSpace(block.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'i'))?.[1] || '')
}

async function ensureCiqualDataset() {
  fs.mkdirSync(CIQUAL_DATA_DIR, { recursive: true })
  const foodFile = path.join(CIQUAL_DATA_DIR, CIQUAL_FILES.foods)
  const compositionFile = path.join(CIQUAL_DATA_DIR, CIQUAL_FILES.composition)
  if (fs.existsSync(foodFile) && fs.existsSync(compositionFile)) {
    return { foodFile, compositionFile }
  }

  const archivePath = path.join(CIQUAL_DATA_DIR, 'ciqual.zip')
  if (!fs.existsSync(archivePath)) {
    const res = await fetch(CIQUAL_ZIP_URL, { headers: HEADERS, signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`Téléchargement CIQUAL impossible (${res.status})`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(archivePath, buf)
  }

  if (process.platform === 'win32') {
    await execFileAsync('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path '${archivePath.replace(/'/g, "''")}' -DestinationPath '${CIQUAL_DATA_DIR.replace(/'/g, "''")}' -Force`,
    ])
  } else {
    await execFileAsync('unzip', ['-o', archivePath, '-d', CIQUAL_DATA_DIR])
  }

  if (!fs.existsSync(foodFile) || !fs.existsSync(compositionFile)) {
    throw new Error('Archive CIQUAL extraite mais fichiers XML introuvables')
  }

  return { foodFile, compositionFile }
}

function buildCiqualTokenIndex(foods) {
  const tokenIndex = new Map()
  for (const food of foods) {
    for (const token of new Set(food.tokens)) {
      if (!tokenIndex.has(token)) tokenIndex.set(token, new Set())
      tokenIndex.get(token).add(food.code)
    }
  }
  return tokenIndex
}

function simplifyIngredientName(value) {
  let normalized = normalizeNutritionText(value)
    .replace(/\b(demi|moitie)\b/g, ' ')
    .replace(/\b(en|au|a la|a l)\s+conserve\b/g, ' conserve ')
    .replace(/\b(en|au|a la|a l)\s+bocal\b/g, ' conserve ')
    .replace(/\bboite?s?\s+de\b/g, ' ')
    .replace(/\bboite?s?\b/g, ' ')
    .replace(/\bcannette?s?\b/g, ' ')
    .replace(/\bconserve?s?\b/g, ' conserve ')
    .replace(/\begouttee?s?\b/g, ' ')
    .replace(/\begoutter\b/g, ' ')
    .replace(/\b(de|du|des|d|la|le|les|un|une|a|au|aux)\b/g, ' ')
    .replace(/\b(bio|frais|fraiche|fraiches|frais|frais?e?s?|hache|hachee|emince|emincee|rape|rapee|cuit|cuite|maison|extra vierge|vierge|entier|entiere|concasse|concassee|moulu|moulue)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const alias of INGREDIENT_ALIASES) {
    normalized = normalized.replace(alias.pattern, alias.value)
  }

  return normalized.replace(/\s+/g, ' ').trim()
}

function normalizeUnitForNutrition(value) {
  const key = normalizeNutritionText(value)
  if (!key) return ''
  if (/^(g|gramme|grammes)$/.test(key)) return 'g'
  if (/^(kg|kilogramme|kilogrammes)$/.test(key)) return 'kg'
  if (/^(mg|milligramme|milligrammes)$/.test(key)) return 'mg'
  if (/^(ml|millilitre|millilitres)$/.test(key)) return 'ml'
  if (/^(cl|centilitre|centilitres)$/.test(key)) return 'cl'
  if (/^(l|litre|litres)$/.test(key)) return 'l'
  if (/^(c a c|c cafe|cc|cuillere a cafe|cuilleree a cafe)$/.test(key)) return 'tsp'
  if (/^(c a s|c soupe|cs|cuillere a soupe|cuilleree a soupe)$/.test(key)) return 'tbsp'
  if (/^(boite|boites|conserve|conserves|can|cans)$/.test(key)) return 'can'
  if (/^(pincee|pincees)$/.test(key)) return 'pinch'
  if (/^(gousse|gousses)$/.test(key)) return 'clove'
  return key
}

function inferCanWeight(foodName) {
  const name = simplifyIngredientName(foodName)
  if (/tomate/.test(name)) return 400
  if (/mais/.test(name)) return 285
  if (/thon/.test(name)) return 140
  if (/pois chiche|haricot|lentille/.test(name)) return 250
  return 300
}

function inferDensity(foodName) {
  const name = simplifyIngredientName(foodName)
  if (/huile/.test(name)) return 0.92
  if (/miel|sirop/.test(name)) return 1.3
  if (/lait|creme|yaourt/.test(name)) return 1.03
  if (/farine/.test(name)) return 0.53
  if (/sucre/.test(name)) return 0.85
  return 1
}

function inferCountWeight(foodName) {
  const name = simplifyIngredientName(foodName)
  if (/oeuf/.test(name)) return 60
  if (/oignon/.test(name)) return 110
  if (/echalote/.test(name)) return 35
  if (/carotte/.test(name)) return 125
  if (/pomme de terre/.test(name)) return 150
  if (/tomate/.test(name)) return 120
  if (/citron/.test(name)) return 120
  if (/courgette/.test(name)) return 200
  if (/poivron/.test(name)) return 150
  return null
}

function gramsFromIngredient(ingredient, matchedFoodName) {
  const quantity = parseQuantityString(ingredient.quantity)
  if (quantity === null || quantity <= 0) return null
  const foodName = ingredient.food || ingredient.note || matchedFoodName || ''
  const unit = normalizeUnitForNutrition(ingredient.unit)

  if (!unit) {
    const countWeight = inferCountWeight(foodName)
    return countWeight ? quantity * countWeight : null
  }
  if (unit === 'g') return quantity
  if (unit === 'kg') return quantity * 1000
  if (unit === 'mg') return quantity / 1000

  const density = inferDensity(foodName)
  if (unit === 'ml') return quantity * density
  if (unit === 'cl') return quantity * 10 * density
  if (unit === 'l') return quantity * 1000 * density
  if (unit === 'tsp') return quantity * 5 * density
  if (unit === 'tbsp') return quantity * 15 * density
  if (unit === 'can') return quantity * inferCanWeight(foodName)
  if (unit === 'pinch') return quantity * 0.36
  if (unit === 'clove') return quantity * 6

  return null
}

function parseCiqualFoods(xml) {
  const foods = []
  for (const [, block] of xml.matchAll(/<ALIM>([\s\S]*?)<\/ALIM>/gi)) {
    const code = extractXmlValue(block, 'alim_code')
    const name = extractXmlValue(block, 'alim_nom_fr')
    const indexName = extractXmlValue(block, 'ALIM_NOM_INDEX_FR') || name
    if (!code || !name) continue
    const normalized = simplifyIngredientName(indexName)
    const tokens = normalized.split(' ').filter((token) => token.length >= 2)
    foods.push({ code, name, normalized, tokens })
  }
  return foods
}

function parseCiqualComposition(xml) {
  const wantedCodes = new Set(Object.values(CIQUAL_CODES))
  const nutrientsByFood = new Map()
  for (const [, block] of xml.matchAll(/<COMPO>([\s\S]*?)<\/COMPO>/gi)) {
    const foodCode = extractXmlValue(block, 'alim_code')
    const nutrientCode = extractXmlValue(block, 'const_code')
    if (!foodCode || !wantedCodes.has(nutrientCode)) continue
    const value = parseNutritionNumber(extractXmlValue(block, 'teneur'))
    if (value === null) continue
    if (!nutrientsByFood.has(foodCode)) nutrientsByFood.set(foodCode, {})
    const bucket = nutrientsByFood.get(foodCode)
    if (nutrientCode === CIQUAL_CODES.calories) bucket.calories = value
    if (nutrientCode === CIQUAL_CODES.protein) bucket.protein = value
    if (nutrientCode === CIQUAL_CODES.carbs) bucket.carbs = value
    if (nutrientCode === CIQUAL_CODES.sugar) bucket.sugar = value
    if (nutrientCode === CIQUAL_CODES.fiber) bucket.fiber = value
    if (nutrientCode === CIQUAL_CODES.fat) bucket.fat = value
    if (nutrientCode === CIQUAL_CODES.saturatedFat) bucket.saturatedFat = value
    if (nutrientCode === CIQUAL_CODES.sodium) bucket.sodium = value
  }
  return nutrientsByFood
}

async function loadCiqualDatabase() {
  if (ciqualCachePromise) return ciqualCachePromise
  ciqualCachePromise = (async () => {
    const { foodFile, compositionFile } = await ensureCiqualDataset()
    const foods = parseCiqualFoods(decodeCiqualFile(foodFile))
    const nutrientsByFood = parseCiqualComposition(decodeCiqualFile(compositionFile))
    const foodsWithNutrition = foods.filter((food) => nutrientsByFood.has(food.code))
    return {
      foods: foodsWithNutrition,
      tokenIndex: buildCiqualTokenIndex(foodsWithNutrition),
      nutrientsByFood,
    }
  })().catch((err) => {
    ciqualCachePromise = null
    throw err
  })
  return ciqualCachePromise
}

function scoreCiqualFoodCandidate(food, ingredientTokens, ingredientText, rawIngredientName = '') {
  const tokenOverlap = ingredientTokens.filter((token) => food.tokens.includes(token)).length
  if (tokenOverlap === 0) return -Infinity
  let score = tokenOverlap * 8
  if (food.normalized === ingredientText) score += 20
  if (food.normalized.startsWith(ingredientText) || ingredientText.startsWith(food.normalized)) score += 8
  score -= Math.abs(food.tokens.length - ingredientTokens.length)
  
  // Bonus for matching cooking methods (friteuse, four, vapeur, poele, braiseе, grille, etc.)
  const cookingMethods = [
    { pattern: /friteuse|frit.?es?/i, food: /friteuse/ },
    { pattern: /four|roti|roties|au four|cuisson four/i, food: /four|roti/ },
    { pattern: /vapeur|cuit a la vapeur/i, food: /vapeur/ },
    { pattern: /poele|a la poele|poele/i, food: /poele/ },
    { pattern: /braiseе|braisee|braise/i, food: /braise/ },
    { pattern: /grille|grilles?/i, food: /grille/ },
    { pattern: /feu doux|doux/i, food: /doux/ },
  ]
  
  for (const method of cookingMethods) {
    const hasMethodInRaw = method.pattern.test(rawIngredientName)
    const hasMethodInFood = method.food.test(food.name)
    if (hasMethodInRaw && hasMethodInFood) {
      score += 6  // Strong bonus: cooking method matches
    } else if (hasMethodInRaw && !hasMethodInFood) {
      score -= 4  // Penalty: user specifies cooking method but food doesn't have it
    }
  }
  
  return score
}

function findBestCiqualFood(ingredientName, db) {
  const normalized = simplifyIngredientName(ingredientName)
  const tokens = normalized.split(' ').filter((token) => token.length >= 2)
  if (!tokens.length) return null

  const candidateCodes = new Set()
  for (const token of tokens) {
    const codes = db.tokenIndex.get(token)
    if (!codes) continue
    for (const code of codes) candidateCodes.add(code)
  }

  let candidates = candidateCodes.size
    ? db.foods.filter((food) => candidateCodes.has(food.code))
    : db.foods

  let best = null
  let bestScore = -Infinity
  for (const food of candidates) {
    const score = scoreCiqualFoodCandidate(food, tokens, normalized, ingredientName)
    if (score > bestScore) {
      best = food
      bestScore = score
    }
  }

  return bestScore >= 8 ? best : null
}

function findTopCiqualFoods(ingredientName, db, limit = 5) {
  const normalized = simplifyIngredientName(ingredientName)
  const tokens = normalized.split(' ').filter((token) => token.length >= 2)
  if (!tokens.length) return []

  const candidateCodes = new Set()
  for (const token of tokens) {
    const codes = db.tokenIndex.get(token)
    if (!codes) continue
    for (const code of codes) candidateCodes.add(code)
  }

  const candidates = candidateCodes.size
    ? db.foods.filter((food) => candidateCodes.has(food.code))
    : db.foods

  return candidates
    .map((food) => ({ food, score: scoreCiqualFoodCandidate(food, tokens, normalized, ingredientName) }))
    .filter((entry) => entry.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.food.name)
}

function searchCiqualFoods(query, db, limit = 20) {
  const normalized = simplifyIngredientName(query)
  const tokens = normalized.split(' ').filter((token) => token.length >= 2)
  if (!tokens.length) return []

  const candidateCodes = new Set()
  for (const token of tokens) {
    const codes = db.tokenIndex.get(token)
    if (!codes) continue
    for (const code of codes) candidateCodes.add(code)
  }

  const candidates = candidateCodes.size
    ? db.foods.filter((food) => candidateCodes.has(food.code))
    : db.foods

  return candidates
    .map((food) => ({
      food,
      score: scoreCiqualFoodCandidate(food, tokens, normalized, query),
    }))
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => ({
      code: entry.food.code,
      name: entry.food.name,
    }))
}

function scoreOpenFoodFactsProduct(product, ingredientText, ingredientTokens) {
  const name = simplifyIngredientName(product?.product_name || '')
  if (!name) return -Infinity
  const category = simplifyIngredientName(Array.isArray(product?.categories_tags) ? product.categories_tags.join(' ') : '')
  const haystack = `${name} ${category}`.trim()
  let overlap = 0
  for (const token of ingredientTokens) {
    if (haystack.includes(token)) overlap += 1
  }
  if (overlap === 0) return -Infinity
  let score = overlap * 7
  if (name === ingredientText) score += 14
  if (name.startsWith(ingredientText) || ingredientText.startsWith(name)) score += 6
  return score
}

function parseOpenFoodFactsNumber(value) {
  const num = Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(num) ? num : null
}

function parseOpenFoodFactsNutrition(nutriments) {
  if (!nutriments || typeof nutriments !== 'object') return null
  const calories = parseOpenFoodFactsNumber(nutriments['energy-kcal_100g'])
  const protein = parseOpenFoodFactsNumber(nutriments.proteins_100g)
  const carbs = parseOpenFoodFactsNumber(nutriments.carbohydrates_100g)
  const fat = parseOpenFoodFactsNumber(nutriments.fat_100g)
  const fiber = parseOpenFoodFactsNumber(nutriments.fiber_100g)
  const sugar = parseOpenFoodFactsNumber(nutriments.sugars_100g)
  const saturatedFat = parseOpenFoodFactsNumber(nutriments['saturated-fat_100g'])
  const sodiumG = parseOpenFoodFactsNumber(nutriments.sodium_100g)
  const saltG = parseOpenFoodFactsNumber(nutriments.salt_100g)
  const sodiumMg = sodiumG !== null
    ? sodiumG * 1000
    : (saltG !== null ? saltG * 0.393 * 1000 : null)

  const hasAny = [calories, protein, carbs, fat, fiber, sugar, saturatedFat, sodiumMg].some((v) => v !== null)
  if (!hasAny) return null

  return {
    calories: calories || 0,
    protein: protein || 0,
    carbs: carbs || 0,
    fat: fat || 0,
    fiber: fiber || 0,
    sugar: sugar || 0,
    sodium: sodiumMg || 0,
    saturatedFat: saturatedFat || 0,
  }
}

async function findOpenFoodFactsFallback(ingredientName) {
  const key = simplifyIngredientName(ingredientName)
  if (!key) return null
  if (openFoodFactsCache.has(key)) return openFoodFactsCache.get(key)

  const url = new URL(OPEN_FOOD_FACTS_SEARCH_URL)
  url.searchParams.set('search_terms', key)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '12')
  url.searchParams.set('fields', 'product_name,categories_tags,nutriments')

  try {
    const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) })
    if (!response.ok) {
      openFoodFactsCache.set(key, null)
      return null
    }

    const data = await response.json()
    const products = Array.isArray(data?.products) ? data.products : []
    const tokens = key.split(' ').filter((token) => token.length >= 2)

    let best = null
    let bestScore = -Infinity
    for (const product of products) {
      const score = scoreOpenFoodFactsProduct(product, key, tokens)
      if (score <= bestScore) continue
      const nutrition = parseOpenFoodFactsNutrition(product?.nutriments)
      if (!nutrition) continue
      best = {
        name: normalizeSpace(product?.product_name || 'Produit Open Food Facts'),
        nutrition,
      }
      bestScore = score
    }

    const result = bestScore >= 7 ? best : null
    openFoodFactsCache.set(key, result)
    return result
  } catch (_e) {
    openFoodFactsCache.set(key, null)
    return null
  }
}

function roundNutrition(value, digits = 1) {
  return Number((value || 0).toFixed(digits))
}

function formatNutritionField(value, unit) {
  return value > 0 ? `${roundNutrition(value)} ${unit}` : undefined
}

function normalizeSearchText(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function expandTermVariants(term) {
  const t = normalizeSearchText(term)
  const variants = new Set([t])
  if (t.endsWith('es') && t.length > 4) variants.add(t.slice(0, -2))
  if (t.endsWith('s') && t.length > 3) variants.add(t.slice(0, -1))
  if (t.endsWith('x') && t.length > 3) variants.add(t.slice(0, -1))
  return [...variants].filter(Boolean)
}

function tokenizeQuery(q) {
  return normalizeSearchText(q)
    .split(' ')
    .map(t => t.trim())
    .filter(t => t.length >= 2)
}

function termMatches(haystack, termVariants) {
  return termVariants.some(v => haystack.includes(v))
}

function scoreRecipeByTerms(item, details, queryTerms) {
  const title = normalizeSearchText(item.name)
  const ingredients = normalizeSearchText((details?.ingredients ?? []).join(' '))
  const tags = normalizeSearchText((details?.tags ?? []).join(' '))

  let score = 0
  let matched = 0
  for (const term of queryTerms) {
    const variants = expandTermVariants(term)
    if (termMatches(title, variants)) {
      score += 6
      matched += 1
      continue
    }
    if (termMatches(ingredients, variants)) {
      score += 3
      matched += 1
      continue
    }
    if (termMatches(tags, variants)) {
      score += 2
      matched += 1
    }
  }

  // Favor concise and explicit recipe names when scores are tied.
  score += Math.max(0, 0.3 - (title.length / 300))
  return { score, matched }
}

function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function stripTags(html) {
  return normalizeSpace(
    String(html ?? '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;|&apos;/gi, "'")
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{2,}/g, '\n')
  )
}

// Dedicated parser for gustave.com recipe pages.
function extractRecipeGustave(html, pageUrl) {
  if (!/gustave\.com/i.test(pageUrl)) return null

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ''
  const name = stripTags(h1)

  const imageRaw =
    html.match(/<img[^>]*class=["'][^"']*imgphotorec[^"']*["'][^>]*src=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    ''
  const imageUrl = toAbsoluteUrl(imageRaw, pageUrl)

  const prepTime = stripTags(html.match(/Pr[eé]paration\s*:\s*<\/b>\s*([^<\n]+)/i)?.[1] || '')
  const cookTime = stripTags(html.match(/Cuisson\s*:\s*<\/b>\s*([^<\n]+)/i)?.[1] || '')

  const ingredients = [...html.matchAll(/<div[^>]*class=["'][^"']*divingredient[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
    .map(m => stripTags(m[1]).replace(/^•\s*/u, ''))
    .filter(Boolean)

  const prepHtml =
    html.match(/<td[^>]*class=["'][^"']*txtmonobloc[^"']*["'][^>]*>([\s\S]*?)<\/td>/i)?.[1] ||
    html.match(/<div[^>]*id=["']preparation["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
    ''
  const prepText = stripTags(prepHtml)
  const steps = prepText
    .split(/\.(?=\s+[A-ZÉÈÀÂÎÏÔÙÛ])/)
    .map(s => normalizeSpace(s))
    .filter(s => s.length >= 20)

  if (!name || ingredients.length < 2 || steps.length < 1) return null

  return {
    name,
    ingredients,
    steps,
    tags: [],
    imageUrl,
    prepTime,
    cookTime,
    totalTime: '',
    marmitonUrl: pageUrl,
  }
}

// Dedicated parser for marieclaire.fr recipe pages.
function extractRecipeMarieClaire(html, pageUrl) {
  if (!/marieclaire\.fr/i.test(pageUrl)) return null

  const name = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
  const imageUrl = toAbsoluteUrl(
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<img[^>]+class=["'][^"']*Article-image[^"']*["'][^>]+src=["']([^"']+)["']/i)?.[1] ||
      '',
    pageUrl,
  )

  // Target the exact section title provided by the user, then read the next UL list.
  const ingSection = html.match(/Les\s+ingr[eé]dients\s+de\s+la\s+recette[\s\S]{0,5000}?<ul[^>]*>([\s\S]*?)<\/ul>/i)?.[1] || ''
  const ingredients = [...ingSection.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(m[1]))
    .map((s) => s.replace(/^[-•\s]+/u, '').trim())
    .filter(Boolean)

  // Try to capture steps section if available; not mandatory for import.
  const stepSection =
    html.match(/Les\s+[eé]tapes\s+de\s+la\s+recette[\s\S]{0,9000}?(?:<ol[^>]*>([\s\S]*?)<\/ol>|<ul[^>]*>([\s\S]*?)<\/ul>)/i) ||
    html.match(/Article-recipeText[\s\S]{0,9000}?<ol[^>]*>([\s\S]*?)<\/ol>/i)
  const stepHtml = stepSection?.[1] || stepSection?.[2] || ''
  const steps = [...stepHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(m[1]))
    .map((s) => normalizeSpace(s))
    .filter((s) => s.length >= 8)

  if (!name || ingredients.length < 2) return null

  return {
    name,
    ingredients,
    steps,
    tags: [],
    imageUrl,
    prepTime: '',
    cookTime: '',
    totalTime: '',
    marmitonUrl: pageUrl,
  }
}

// Dedicated parser for madame.lefigaro.fr recipe pages.
function extractRecipeLeFigaro(html, pageUrl) {
  if (!/lefigaro\.fr/i.test(pageUrl)) return null

  const name = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
  const imageUrl = toAbsoluteUrl(
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '',
    pageUrl,
  )

  const prepTime =
    stripTags(html.match(/(?:Temps\s+de\s+pr[eé]paration|Pr[eé]paration)\s*:?\s*<\/span>\s*<span[^>]*>([^<]+)/i)?.[1] || '') ||
    stripTags(html.match(/Temps\s+de\s+pr[eé]paration\s*:\s*([^<\n]+)/i)?.[1] || '')

  const cookTime =
    stripTags(html.match(/(?:Temps\s+de\s+cuisson|Cuisson)\s*:?\s*<\/span>\s*<span[^>]*>([^<]+)/i)?.[1] || '') ||
    stripTags(html.match(/Temps\s+de\s+cuisson\s*:\s*([^<\n]+)/i)?.[1] || '')

  const ingredients = [...html.matchAll(/<li[^>]*class=["'][^"']*fig-recipe-ingredients__item[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(m[1]))
    .map((s) => s.replace(/^[-•\s]+/u, '').trim())
    .filter(Boolean)

  const steps = [...html.matchAll(/<li[^>]*class=["'][^"']*fig-recipe-steps__element[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => {
      const block = m[1]
      const title = stripTags(
        block.match(/<span[^>]*class=["'][^"']*fig-recipe-steps__step-title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ||
        block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ||
        '',
      )
      const text = stripTags(
        block.match(/<div[^>]*class=["'][^"']*fig-recipe-steps__text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
        block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ||
        '',
      )
      return normalizeSpace([title, text].filter(Boolean).join(' - '))
    })
    .filter((s) => s.length >= 15)

  const tags =
    html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?.split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10) || []

  if (!name || ingredients.length < 2) return null

  return {
    name,
    ingredients,
    steps,
    tags,
    imageUrl,
    prepTime,
    cookTime,
    totalTime: '',
    marmitonUrl: pageUrl,
  }
}

// Dedicated parser for femina.fr recipe articles.
function extractRecipeFemina(html, pageUrl) {
  if (!/femina\.fr/i.test(pageUrl)) return null

  const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
  const h2Intro = stripTags(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || '')
  const nameFromH2 = h2Intro
    .replace(/^Voici\s+la\s+recette\s+de\s*/i, '')
    .replace(/\s*:\s*$/i, '')
    .trim()
  const name = h1 || nameFromH2

  const imageUrl = toAbsoluteUrl(
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] ||
      '',
    pageUrl,
  )

  const prepTime = stripTags(html.match(/Temps\s+de\s+pr[eé]paration\s*:\s*([^<\n]+)/i)?.[1] || '')
  const cookTime = stripTags(html.match(/Temps\s+de\s+cuisson\s*:\s*([^<\n]+)/i)?.[1] || '')

  const ingSection = html.match(/Ingr[eé]dients?\s+pour[\s\S]{0,8000}?<ul[^>]*>([\s\S]*?)<\/ul>/i)?.[1] || ''
  const ingredients = [...ingSection.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(m[1]))
    .map((s) => s.replace(/^[-•\s]+/u, '').trim())
    .filter(Boolean)

  // Capture narrative instructions after the ingredients list.
  const afterIngredients = html.match(/Ingr[eé]dients?\s+pour[\s\S]{0,8000}?<\/ul>([\s\S]{0,20000})/i)?.[1] || ''
  const steps = [...afterIngredients.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]))
    .map((s) => normalizeSpace(s))
    .filter((s) => s.length >= 20)
    .filter((s) => !/^temps\s+de\s+(pr[eé]paration|cuisson)\s*:/i.test(s))
    .filter((s) => !/^>\s*a\s+d[ée]couvrir/i.test(s))
    .filter((s) => !/^Ingr[eé]dients?\s+pour/i.test(s))
    .slice(0, 20)

  if (!name || ingredients.length < 2) return null

  return {
    name,
    ingredients,
    steps,
    tags: [],
    imageUrl,
    prepTime,
    cookTime,
    totalTime: '',
    marmitonUrl: pageUrl,
  }
}

// Heuristic extraction for pages without JSON-LD (legacy recipe websites like gustave.com)
function extractRecipeHeuristic(html, pageUrl) {
  const text = htmlToText(html)

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const name = normalizeSpace(titleMatch?.[1]?.replace(/<[^>]+>/g, '')) ||
    normalizeSpace(text.split('\n').find(l => l.length > 5 && l.length < 120) || '')

  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1] || ''

  const prepRaw = text.match(/Pr[eé]paration\s*:\s*([^\-\n]{1,30})/i)?.[1] || ''
  const cookRaw = text.match(/Cuisson\s*:\s*([^\-\n]{1,30})/i)?.[1] || ''

  // Ingredients block: usually introduced by "Ingrédients pour ... :"
  const ingredientsBlockMatch = text.match(/Ingr[eé]dients?\s+pour[^:]{0,80}:([\s\S]{0,2200})/i)
  let ingredients = []
  if (ingredientsBlockMatch) {
    const block = ingredientsBlockMatch[1]
      .split(/(?:Passez|Epluchez|Épluchez|Versez|Faites|Pr[eé]paration|Suggestions)\b/i)[0]
    ingredients = block
      .split(/[•\n\-]+/)
      .map(normalizeSpace)
      .filter(x => x.length >= 3 && x.length <= 180)
      .filter(x => !/^Ingr[eé]dients?/i.test(x))
      .slice(0, 40)
  }

  // Preparation block until suggestions/comments/footer
  let steps = []
  const prepBlockMatch = text.match(/(Passez|Epluchez|Épluchez|Versez|Pr[eé]chauffez|Faites|M[eé]langez)([\s\S]{80,3500})/i)
  if (prepBlockMatch) {
    const block = `${prepBlockMatch[1]}${prepBlockMatch[2]}`
      .split(/(?:Suggestions|Commentaires?|Courrier des lecteurs|Partagez votre avis|publicit[eé])\b/i)[0]
    steps = block
      .split(/\.(?=\s+[A-ZÉÈÀÂÎÏÔÙÛ])/)
      .map(s => normalizeSpace(s.replace(/^[-\s]+/, '')))
      .filter(s => s.length >= 20)
      .slice(0, 20)
  }

  if (!name || ingredients.length < 2 || steps.length < 1) {
    return null
  }

  return {
    name,
    ingredients,
    steps,
    tags: [],
    imageUrl: ogImage,
    prepTime: normalizeSpace(prepRaw),
    cookTime: normalizeSpace(cookRaw),
    totalTime: '',
    marmitonUrl: pageUrl,
  }
}

// Fetch and parse a single recipe page → {ingredients, steps, tags, prepTime, cookTime, totalTime}
async function fetchRecipeDetails(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const html = await res.text()
    const schemas = parseJsonLd(html)
    const recipe = schemas.find(s => {
      const t = s['@type']
      return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))
    })
    if (!recipe) return null

    const prepMin = parseISO8601(recipe.prepTime)
    const totalMin = parseISO8601(recipe.totalTime)
    const cookMin = Math.max(0, totalMin - prepMin)

    const keywords = typeof recipe.keywords === 'string'
      ? recipe.keywords.split(/,\s*/).filter(Boolean)
      : []

    return {
      ingredients: Array.isArray(recipe.recipeIngredient)
        ? recipe.recipeIngredient
        : typeof recipe.recipeIngredient === 'string'
          ? recipe.recipeIngredient.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
          : [],
      steps: Array.isArray(recipe.recipeInstructions)
        ? recipe.recipeInstructions.map(s => (typeof s === 'string' ? s : s.text ?? '')).filter(Boolean)
        : [],
      tags: keywords,
      prepTime: formatMinutes(prepMin),
      cookTime: formatMinutes(cookMin),
      totalTime: formatMinutes(totalMin),
    }
  } catch (_) {
    return null
  }
}

// Fetch one search page → array of {name, imageUrl, marmitonUrl}
async function fetchSearchPage(q, page) {
  const url = `${SEARCH_URL}?aqt=${encodeURIComponent(q)}&page=${page}`
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) })
  if (!res.ok) return []
  const html = await res.text()

  const schemas = parseJsonLd(html)
  const list = schemas.find(s => {
    const t = s['@type']
    return t === 'ItemList' || (Array.isArray(t) && t.includes('ItemList'))
  })
  if (!list || !list.itemListElement?.length) return []

  return list.itemListElement.map(item => ({
    name: item.name ?? '',
    imageUrl: extractImageUrl(item.image, BASE_URL),
    marmitonUrl: toAbsoluteUrl(item.url ?? '', BASE_URL),
  }))
}

// Fetch multiple pages until we have enough results
async function fetchSearchList(q, needed) {
  const PER_PAGE = 10
  const pagesNeeded = Math.ceil(needed / PER_PAGE)
  // Marmiton pagination starts at page=2 (page=1 returns same as no param)
  const pageNums = Array.from({ length: pagesNeeded }, (_, i) => i + 2)
  const pages = await Promise.all(pageNums.map(p => fetchSearchPage(q, p)))
  // Deduplicate by URL
  const seen = new Set()
  const all = []
  for (const items of pages) {
    for (const item of items) {
      if (!seen.has(item.marmitonUrl)) {
        seen.add(item.marmitonUrl)
        all.push(item)
      }
    }
  }
  return all
}

// Fallback for multi-term queries when Marmiton returns no result for the full phrase.
// Example: "blinis facile" can return empty while "blinis" has results.
async function fetchSearchFallbackList(queryTerms, needed) {
  const terms = [...new Set(queryTerms)]
    .filter(t => t.length >= 3)
    .slice(0, 4)

  if (!terms.length) return []

  const perTermNeeded = Math.min(Math.max(Math.ceil(needed / terms.length), 16), 50)
  const lists = await Promise.all(terms.map(t => fetchSearchList(t, perTermNeeded)))

  const seen = new Set()
  const merged = []
  for (const items of lists) {
    for (const item of items) {
      if (!seen.has(item.marmitonUrl)) {
        seen.add(item.marmitonUrl)
        merged.push(item)
      }
    }
  }
  return merged
}

// Limit concurrent fetches
async function limitedParallel(tasks, concurrency) {
  const results = []
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = await Promise.all(tasks.slice(i, i + concurrency).map(fn => fn()))
    results.push(...batch)
  }
  return results
}

// GET /search?q=<query>&limit=<n>&page=<n>
app.get('/search', async (req, res) => {
  try {
    const q = (req.query.q ?? '').trim()
    if (!q) return res.status(400).json({ error: 'Paramètre q manquant' })
    const terms = tokenizeQuery(q)
    const isMultiTerm = terms.length >= 2

    const limit = Math.min(parseInt(req.query.limit ?? '12', 10) || 12, 24)
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1)
    const offset = (page - 1) * limit

    // For multi-term search, fetch a larger candidate pool then rerank locally.
    const baseNeeded = offset + limit + 1
    const needed = isMultiTerm
      ? Math.min(Math.max(baseNeeded * 4, 40), 140)
      : baseNeeded
    let listItems = await fetchSearchList(q, needed)

    // Marmiton can return no results for a multi-term phrase even when each term has matches.
    if (isMultiTerm && listItems.length === 0) {
      listItems = await fetchSearchFallbackList(terms, needed)
    }

    if (!listItems.length) {
      return res.json({ results: [], hasMore: false, page })
    }

    // First-pass ranking by title only, to limit expensive detail fetches.
    const preRanked = isMultiTerm
      ? [...listItems]
          .map(item => {
            const title = normalizeSearchText(item.name)
            let matched = 0
            let titleScore = 0
            for (const term of terms) {
              const variants = expandTermVariants(term)
              if (termMatches(title, variants)) {
                matched += 1
                titleScore += 6
              }
            }
            return { item, matched, titleScore }
          })
          .sort((a, b) => {
            if (b.matched !== a.matched) return b.matched - a.matched
            return b.titleScore - a.titleScore
          })
          .map(x => x.item)
      : listItems

    const toHydrateCount = isMultiTerm
      ? Math.min(preRanked.length, Math.max(offset + limit + 24, 48))
      : Math.min(preRanked.length, offset + limit)
    const hydratedItems = preRanked.slice(0, toHydrateCount)

    // Fetch details for selected candidates in parallel (max 4 at a time)
    const detailsList = await limitedParallel(
      hydratedItems.map(item => () => fetchRecipeDetails(item.marmitonUrl)),
      4
    )

    let merged = hydratedItems.map((item, i) => {
      const details = detailsList[i]
      return {
        name: item.name,
        imageUrl: item.imageUrl,
        marmitonUrl: item.marmitonUrl,
        ingredients: details?.ingredients ?? [],
        steps: details?.steps ?? [],
        tags: details?.tags ?? [],
        prepTime: details?.prepTime ?? '',
        cookTime: details?.cookTime ?? '',
        totalTime: details?.totalTime ?? '',
      }
    })

    if (isMultiTerm) {
      merged = merged
        .map(r => {
          const details = {
            ingredients: r.ingredients,
            tags: r.tags,
          }
          const { score, matched } = scoreRecipeByTerms(r, details, terms)
          return { ...r, _score: score, _matched: matched }
        })
        .filter(r => r._matched >= Math.max(1, terms.length - 1))
        .sort((a, b) => {
          if (b._matched !== a._matched) return b._matched - a._matched
          return b._score - a._score
        })
    }

    const hasMore = merged.length > offset + limit
    const results = merged
      .slice(offset, offset + limit)
      .map(({ _score, _matched, ...r }) => r)

    res.json({ results, hasMore, page })
  } catch (e) {
    console.error('[Marmiton] Search error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.get('/health', (_req, res) => res.json({
  ok: true,
  ollamaConfigured: !!(OLLAMA_URL && OLLAMA_MODEL),
}))

app.get('/ciqual/search', async (req, res) => {
  try {
    const q = normalizeSpace(req.query.q || '')
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10) || 20, 50)
    if (!q) return res.json({ items: [] })

    const db = await loadCiqualDatabase()
    const items = searchCiqualFoods(q, db, limit)
    return res.json({ items })
  } catch (e) {
    console.error('[CIQUAL] Search error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

app.post('/nutrition-estimate', async (req, res) => {
  try {
    const ingredients = Array.isArray(req.body?.ingredients) ? req.body.ingredients : []
    const rawMatchHints = (req.body?.matchHints && typeof req.body.matchHints === 'object') ? req.body.matchHints : {}
    const matchHints = Object.fromEntries(
      Object.entries(rawMatchHints)
        .map(([k, v]) => [normalizeSpace(k), normalizeSpace(v)])
        .filter(([k, v]) => !!k && !!v),
    )
    if (!ingredients.length) {
      return res.status(400).json({ error: 'Liste d\'ingrédients manquante' })
    }

    const db = await loadCiqualDatabase()
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      saturatedFat: 0,
    }
    const matches = []
    const unmatched = []

    for (const ingredient of ingredients) {
      const label = normalizeSpace(ingredient.food || ingredient.note || '')
      if (!label) continue
      const hinted = matchHints[label] || ''
      const searchLabel = hinted || label

      const match = findBestCiqualFood(searchLabel, db)
      const ciqualName = match?.name || label
      const grams = gramsFromIngredient(ingredient, ciqualName)
      if (grams === null || grams <= 0) {
        unmatched.push({ ingredient: label, matchedFood: ciqualName, reason: 'Quantité ou unité non exploitable' })
        continue
      }

      let nutrients = null
      let matchedFoodName = ''
      let dataSource = 'ciqual'

      if (match) {
        nutrients = db.nutrientsByFood.get(match.code) || null
        matchedFoodName = match.name
      }

      if (!nutrients) {
        const offFallback = await findOpenFoodFactsFallback(searchLabel)
        if (offFallback) {
          nutrients = offFallback.nutrition
          matchedFoodName = `[OFF] ${offFallback.name}`
          dataSource = 'off'
        }
      }

      if (!nutrients) {
        const suggestions = findTopCiqualFoods(searchLabel, db, 6)
        unmatched.push({
          ingredient: label,
          reason: 'Aucun aliment proche trouvé (CIQUAL/OFF)',
          suggestions,
        })
        continue
      }

      const factor = grams / 100
      totals.calories += (nutrients.calories || 0) * factor
      totals.protein += (nutrients.protein || 0) * factor
      totals.carbs += (nutrients.carbs || 0) * factor
      totals.fat += (nutrients.fat || 0) * factor
      totals.fiber += (nutrients.fiber || 0) * factor
      totals.sugar += (nutrients.sugar || 0) * factor
      totals.sodium += (nutrients.sodium || 0) * factor
      totals.saturatedFat += (nutrients.saturatedFat || 0) * factor

      matches.push({
        ingredient: label,
        ciqualFood: matchedFoodName,
        amountGrams: roundNutrition(grams),
        source: dataSource,
        viaHint: !!hinted,
      })
    }

    // Build ciqualMappings object for storing in recipe extras
    const ciqualMappings = Object.fromEntries(
      matches.map((m) => [m.ingredient, m.ciqualFood])
    )

    return res.json({
      source: 'ANSES CIQUAL 2020 (+ fallback Open Food Facts)',
      matchedCount: matches.length,
      unmatchedCount: unmatched.length,
      matches,
      unmatched,
      ciqualMappings,
      nutrition: {
        calories: formatNutritionField(totals.calories, 'kcal'),
        proteinContent: formatNutritionField(totals.protein, 'g'),
        carbohydrateContent: formatNutritionField(totals.carbs, 'g'),
        fatContent: formatNutritionField(totals.fat, 'g'),
        fiberContent: formatNutritionField(totals.fiber, 'g'),
        sugarContent: formatNutritionField(totals.sugar, 'g'),
        sodiumContent: formatNutritionField(totals.sodium, 'mg'),
        saturatedFatContent: formatNutritionField(totals.saturatedFat, 'g'),
      },
    })
  } catch (e) {
    console.error('[Nutrition] Estimate error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Call Ollama server-side to extract a recipe from text
// Returns { data, error } to provide explicit diagnostics back to the UI.
async function callOllamaServerSide(ollamaUrl, ollamaModel, text) {
  if (!ollamaUrl || !ollamaModel) {
    return { data: null, error: 'Configuration Ollama manquante (URL ou modèle)' }
  }
  if (ollamaUrl.startsWith('/')) {
    return {
      data: null,
      error: 'URL Ollama relative non supportée côté proxy (ex: /api/ollama). Configurez une URL absolue dans les options addon (ex: http://homeassistant.local:11434).',
    }
  }
  const system = `Tu es un assistant culinaire. Extrais les informations de cette page web de recette.
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown ni explication) de cette forme exacte:
{"name":"Nom de la recette","ingredients":["ingrédient 1","ingrédient 2"],"steps":["Etape 1...","Etape 2..."],"tags":["tag1"],"imageUrl":"","prepTime":"","cookTime":"","totalTime":""}
Les durées au format "X min" ou "Xh" ou "XhXX". Si absent, laisse vide ou tableau vide.`
  try {
    const r = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
      }),
      // Keep this lower than nginx /api/marmiton proxy_read_timeout to avoid gateway 504.
      signal: AbortSignal.timeout(45000),
    })
    if (!r.ok) {
      const errText = await r.text().catch(() => '')
      const compact = errText.replace(/\s+/g, ' ').trim().slice(0, 220)
      return { data: null, error: `Ollama HTTP ${r.status}${compact ? `: ${compact}` : ''}` }
    }
    const data = await r.json()
    const content = data.message?.content ?? ''
    if (!content.trim()) {
      return { data: null, error: 'Réponse Ollama vide' }
    }
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) {
      return { data: null, error: 'Réponse Ollama sans JSON exploitable' }
    }
    return { data: JSON.parse(match[0]), error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[Marmiton] Ollama server-side error:', msg)
    return { data: null, error: msg || 'Erreur inconnue lors de l\'appel Ollama' }
  }
}

// GET /fetch-recipe?url=<encoded_url>[&ollamaUrl=<encoded_url>&ollamaModel=<model>]
// 1. Fetches the page, tries JSON-LD Recipe extraction (fast, no LLM needed)
// 2. If no schema found, calls Ollama server-side (env vars or query params fallback)
// 3. Returns { schema, text, ollamaError? }
app.get('/fetch-recipe', async (req, res) => {
  const rawUrl = (req.query.url ?? '').trim()
  if (!rawUrl) return res.status(400).json({ error: 'Paramètre url manquant' })

  // Effective Ollama config: env vars take priority, then query params (in-app settings)
  const effectiveOllamaUrl = (OLLAMA_URL || (req.query.ollamaUrl ?? '').trim()).replace(/\/+$/, '')
  const effectiveOllamaModel = OLLAMA_MODEL || (req.query.ollamaModel ?? '').trim()

  // Basic security: only http/https, block private IPs
  let parsed
  try { parsed = new URL(rawUrl) } catch { return res.status(400).json({ error: 'URL invalide' }) }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Protocole non supporté' })
  }
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(parsed.hostname)) {
    return res.status(400).json({ error: 'URL non autorisée' })
  }

  try {
    const r = await fetch(rawUrl, { headers: HEADERS, signal: AbortSignal.timeout(12000) })
    if (!r.ok) return res.status(400).json({ error: `Erreur HTTP ${r.status}` })
    const html = await r.text()

    // ⓪ Dedicated extraction for lefigaro.fr (prefer HTML blocks over truncated JSON-LD)
    if (/lefigaro\.fr/i.test(rawUrl)) {
      const figaro = extractRecipeLeFigaro(html, rawUrl)
      if (figaro) {
        return res.json({ schema: figaro, text: '', ollamaError: null })
      }
    }

    // ① Try JSON-LD Recipe extraction
    const schemas = parseJsonLd(html)
    const recipeSchema = schemas.find(s => {
      const t = s['@type']
      return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))
    })

    let schema = null
    if (recipeSchema) {
      const prepMin = parseISO8601(recipeSchema.prepTime)
      const totalMin = parseISO8601(recipeSchema.totalTime)
      const cookMin = recipeSchema.cookTime
        ? parseISO8601(recipeSchema.cookTime)
        : Math.max(0, totalMin - prepMin)

      const ingredients = Array.isArray(recipeSchema.recipeIngredient)
        ? recipeSchema.recipeIngredient
        : typeof recipeSchema.recipeIngredient === 'string'
          ? recipeSchema.recipeIngredient.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
          : []

      let steps = []
      if (Array.isArray(recipeSchema.recipeInstructions)) {
        steps = recipeSchema.recipeInstructions.map(s =>
          typeof s === 'string' ? s : (s.text ?? '')
        ).filter(Boolean)
      } else if (typeof recipeSchema.recipeInstructions === 'string') {
        steps = [recipeSchema.recipeInstructions]
      }

      const imageUrl = extractImageUrl(recipeSchema.image, rawUrl)

      const keywords = typeof recipeSchema.keywords === 'string'
        ? recipeSchema.keywords.split(',').map(k => k.trim()).filter(Boolean)
        : (Array.isArray(recipeSchema.keywords) ? recipeSchema.keywords : [])

      schema = {
        name: recipeSchema.name ?? '',
        ingredients,
        steps,
        tags: keywords.slice(0, 8),
        imageUrl,
        prepTime: formatMinutes(prepMin),
        cookTime: formatMinutes(cookMin),
        totalTime: formatMinutes(totalMin),
      }
    }

    // ② Dedicated extraction for marieclaire.fr (fast, no LLM)
    if (!schema) {
      const marieClaire = extractRecipeMarieClaire(html, rawUrl)
      if (marieClaire) {
        return res.json({ schema: marieClaire, text: '', ollamaError: null })
      }
    }

    // ③ Dedicated extraction for femina.fr (fast, no LLM)
    if (!schema) {
      const femina = extractRecipeFemina(html, rawUrl)
      if (femina) {
        return res.json({ schema: femina, text: '', ollamaError: null })
      }
    }

    // ④ Dedicated extraction for gustave.com (fast, no LLM)
    if (!schema) {
      const gustave = extractRecipeGustave(html, rawUrl)
      if (gustave) {
        return res.json({ schema: gustave, text: '', ollamaError: null })
      }
    }

    // ⑤ Heuristic extraction for legacy pages without schema (fast, no LLM)
    if (!schema) {
      const heur = extractRecipeHeuristic(html, rawUrl)
      if (heur) {
        return res.json({ schema: heur, text: '', ollamaError: null })
      }
    }

    // ⑥ If still no schema, build focused text for LLM (browser-side or server-side Ollama)
    const fullText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    const keywordRe = /ingr[eé]dient|pr[eé]paration|[eé]tape|recette|portions?|personnes?/i
    const matchIdx = fullText.search(keywordRe)
    const start = Math.max(0, matchIdx > 200 ? matchIdx - 200 : 0)
    const text = fullText.slice(start, start + 2500)

    // ⑦ If no schema and Ollama is configured, call it server-side (avoids nginx timeout)
    if (!schema && effectiveOllamaUrl && effectiveOllamaModel) {
      console.log(`[Marmiton] No JSON-LD found, calling Ollama server-side (${effectiveOllamaUrl}, ${effectiveOllamaModel})...`)
      const ollamaResult = await callOllamaServerSide(effectiveOllamaUrl, effectiveOllamaModel, text)
      const llmResult = ollamaResult.data
      const ollamaError = ollamaResult.error
      if (llmResult && llmResult.name) {
          schema = {
            name: llmResult.name ?? '',
            ingredients: llmResult.ingredients ?? [],
            steps: llmResult.steps ?? [],
            tags: llmResult.tags ?? [],
            imageUrl: llmResult.imageUrl ?? '',
            prepTime: llmResult.prepTime ?? '',
            cookTime: llmResult.cookTime ?? '',
            totalTime: llmResult.totalTime ?? '',
          }
      }
      return res.json({ schema, text, ollamaError })
    }

    // text is still returned for browser-side LLM fallback (e.g. Anthropic, OpenAI)
    res.json({ schema, text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /image?url=<encoded_url> — proxy pour télécharger l'image sans CORS
app.get('/image', async (req, res) => {
  const url = (req.query.url ?? '').trim()
  let parsedImg
  try { parsedImg = new URL(url) } catch { return res.status(400).json({ error: 'URL invalide' }) }
  if (!['http:', 'https:'].includes(parsedImg.protocol)) {
    return res.status(400).json({ error: 'URL invalide' })
  }
  try {
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) })
    if (!r.ok) return res.status(r.status).end()
    const buf = await r.arrayBuffer()
    res.set('Content-Type', r.headers.get('content-type') ?? 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(Buffer.from(buf))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Marmiton] Proxy en écoute sur le port ${PORT}`)
})
