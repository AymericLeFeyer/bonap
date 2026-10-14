'use strict'

const express = require('express')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { safeRequest, assertUrlAllowed, BlockedAddressError } = require('./bff-net-guard.cjs')
const { sanitizeSettings, validateSettingsPatch } = require('./bff-settings.cjs')
const { normalizeFoodKey } = require('./bff-nutrition-text.cjs')
const { MAX_PATCHES_PER_REQUEST, createFoodStore, validateFoodPatch } = require('./bff-nutrition-foods.cjs')
const {
  buildCiqualIndex,
  classifyIngredients,
  estimateRecipe,
  findCandidates,
  refreshItems,
} = require('./bff-nutrition-classify.cjs')
const app = express()
const PORT = Number(process.env.BONAP_BFF_PORT) || 3001
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
// Cible Ollama choisie par le navigateur (Settings) : active par défaut pour
// ne pas casser les installations existantes, désactivable côté serveur.
// Ignorée dès qu'OLLAMA_URL est défini (la cible serveur fait foi).
const DYNAMIC_OLLAMA_ENABLED = !/^(0|false|no|off)$/i.test(process.env.BONAP_DYNAMIC_OLLAMA_PROXY || '')

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

function parseNutritionNumber(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const normalized = raw.replace(',', '.')
  const num = Number.parseFloat(normalized)
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

function parseCiqualFoods(xml) {
  const foods = []
  for (const [, block] of xml.matchAll(/<ALIM>([\s\S]*?)<\/ALIM>/gi)) {
    const code = extractXmlValue(block, 'alim_code')
    const name = extractXmlValue(block, 'alim_nom_fr')
    if (!code || !name) continue
    foods.push({ code, name })
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
      index: buildCiqualIndex(foodsWithNutrition),
      nutrientsByFood,
    }
  })().catch((err) => {
    ciqualCachePromise = null
    throw err
  })
  return ciqualCachePromise
}

function scoreOpenFoodFactsProduct(product, ingredientText, ingredientTokens) {
  const name = normalizeFoodKey(product?.product_name || '')
  if (!name) return -Infinity
  const category = normalizeFoodKey(Array.isArray(product?.categories_tags) ? product.categories_tags.join(' ') : '')
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
  const key = normalizeFoodKey(ingredientName)
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

  const yieldMatch = html.match(/(?:pour|recette?\s+pour)\s+\d+\s*(?:personnes?|parts?|portions?)/i)
  const recipeYield = yieldMatch ? normalizeSpace(yieldMatch[0]) : undefined

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
    recipeYield,
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

  const yieldMatch = html.match(/(?:pour|recette?\s+pour)\s+\d+\s*(?:personnes?|parts?|portions?)/i)
  const recipeYield = yieldMatch ? normalizeSpace(yieldMatch[0]) : undefined

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
    recipeYield,
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

  const yieldMatch = html.match(/(?:pour|recette?\s+pour)\s+\d+\s*(?:personnes?|parts?|portions?)/i)
  const recipeYield = yieldMatch ? normalizeSpace(yieldMatch[0]) : undefined

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
    recipeYield,
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

  const yieldMatchFemina = html.match(/Ingr[eé]dients?\s+(pour\s+\d+\s*(?:personnes?|parts?|portions?))/i)
    || html.match(/(?:pour|recette?\s+pour)\s+\d+\s*(?:personnes?|parts?|portions?)/i)
  const recipeYield = yieldMatchFemina ? normalizeSpace(yieldMatchFemina[1] ?? yieldMatchFemina[0]) : undefined

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
    recipeYield,
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

  const yieldMatchHeuristic = text.match(/(?:pour|recette?\s+pour)\s+\d+\s*(?:personnes?|parts?|portions?)/i)
  const recipeYield = yieldMatchHeuristic ? normalizeSpace(yieldMatchHeuristic[0]) : undefined

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
    recipeYield,
    marmitonUrl: pageUrl,
  }
}

// Fetch and parse a single recipe page → {ingredients, steps, tags, prepTime, cookTime, totalTime}
async function fetchRecipeDetails(url) {
  try {
    // L'URL vient du JSON-LD renvoyé par Marmiton : on ne lui fait pas confiance.
    const res = await safeRequest(url, { headers: HEADERS, timeoutMs: 8000 })
    if (res.status < 200 || res.status >= 300) return null
    const html = res.body.toString('utf8')
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
      recipeYield: recipe.recipeYield ?? undefined,
    }
  } catch (_) {
    return null
  }
}

// Fetch one search page → array of {name, imageUrl, marmitonUrl}
async function fetchSearchPage(q, page) {
  const url = page <= 1
    ? `${SEARCH_URL}?aqt=${encodeURIComponent(q)}`
    : `${SEARCH_URL}?aqt=${encodeURIComponent(q)}&page=${page}`
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
  const PER_PAGE = 12
  const maxPages = Math.max(1, Math.ceil(needed / PER_PAGE) + 1)

  // Deduplicate by URL while progressively fetching pages.
  const seen = new Set()
  const all = []

  for (let page = 1; page <= maxPages; page += 1) {
    const items = await fetchSearchPage(q, page)
    if (!items.length) break

    let addedThisPage = 0
    for (const item of items) {
      if (!seen.has(item.marmitonUrl)) {
        seen.add(item.marmitonUrl)
        all.push(item)
        addedThisPage += 1
      }
    }

    if (all.length >= needed) break
    // Stop early when page yields only duplicates; next pages are usually exhausted.
    if (addedThisPage === 0) break
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
app.get('/marmiton/search', async (req, res) => {
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
      : Math.min(preRanked.length, offset + limit + 1)
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
        imageUrl: details?.imageUrl || item.imageUrl,
        marmitonUrl: item.marmitonUrl,
        ingredients: details?.ingredients ?? [],
        steps: details?.steps ?? [],
        tags: details?.tags ?? [],
        prepTime: details?.prepTime ?? '',
        cookTime: details?.cookTime ?? '',
        totalTime: details?.totalTime ?? '',
        recipeYield: details?.recipeYield ?? undefined,
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
    console.error('[Bonap BFF] Search error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.get('/health', (_req, res) => res.json({
  ok: true,
  ollamaConfigured: !!(OLLAMA_URL && OLLAMA_MODEL),
}))

// ─── Shared settings (cross-origin persistent storage) ────────────────────────
// Stored in /data/bonap-settings.json so they survive container restarts and
// are shared between http://ip:8123 and https://domain access.
const SETTINGS_FILE = '/data/bonap-settings.json'

// Toujours filtré (voir bff-settings.cjs) : un fichier écrit par une version
// antérieure peut contenir des clés inconnues ou une clé API.
function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return sanitizeSettings(JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')))
    }
  } catch { /* ignore */ }
  return {}
}

function writeSettings(data) {
  try {
    const tmp = `${SETTINGS_FILE}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tmp, SETTINGS_FILE)
  } catch (e) {
    console.error('[Bonap] Failed to write settings:', e.message)
  }
}

// Purge au démarrage les secrets / clés inconnues laissés par une version antérieure.
if (fs.existsSync(SETTINGS_FILE)) writeSettings(readSettings())

app.get('/settings', (_req, res) => {
  res.json(readSettings())
})

app.patch('/settings', (req, res) => {
  const result = validateSettingsPatch(req.body)
  if (!result.ok) return res.status(400).json({ error: result.error })
  const updated = { ...readSettings(), ...result.patch }
  writeSettings(updated)
  res.json(updated)
})

// ─── Dictionnaire d'aliments (docs/superpowers/specs/2026-10-05-calcul-nutrition-ciqual.md) ──────────────────────
// Fichier dédié : /settings est limité à 16 Ko par clé.
const NUTRITION_FOODS_FILE = process.env.BONAP_NUTRITION_FOODS_FILE
  || (fs.existsSync('/data') ? '/data/bonap-nutrition-foods.json' : path.join(os.tmpdir(), 'bonap-nutrition-foods.json'))
const foodStore = createFoodStore({ filePath: NUTRITION_FOODS_FILE })
const MAX_INGREDIENTS_PER_REQUEST = 2000
const MAX_INGREDIENT_TEXT_LENGTH = 300

function sanitizeIngredientText(value) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).slice(0, MAX_INGREDIENT_TEXT_LENGTH)
    : ''
}

function readIngredientsBody(body) {
  const raw = Array.isArray(body?.ingredients) ? body.ingredients : null
  if (!raw || raw.length > MAX_INGREDIENTS_PER_REQUEST) return null
  return raw
    .filter((ingredient) => ingredient && typeof ingredient === 'object')
    .map((ingredient) => ({
      quantity: sanitizeIngredientText(ingredient.quantity),
      unit: sanitizeIngredientText(ingredient.unit),
      unitAbbreviation: sanitizeIngredientText(ingredient.unitAbbreviation),
      food: sanitizeIngredientText(ingredient.food),
      note: sanitizeIngredientText(ingredient.note),
    }))
}

function readLegacyMappings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .slice(0, MAX_INGREDIENTS_PER_REQUEST)
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [normalizeSpace(key), value.slice(0, MAX_INGREDIENT_TEXT_LENGTH)]),
  )
}

app.get('/ciqual/search', async (req, res) => {
  try {
    const q = normalizeSpace(req.query.q || '').slice(0, MAX_INGREDIENT_TEXT_LENGTH)
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10) || 20, 50)
    if (!q) return res.json({ items: [] })

    const db = await loadCiqualDatabase()
    const items = findCandidates(q, db.index, limit).map(({ code, name }) => ({ code, name }))
    return res.json({ items })
  } catch (e) {
    console.error('[CIQUAL] Search error:', e.message)
    return res.status(500).json({ error: e.message })
  }
})

function sendNutritionError(res, scope, e) {
  console.error(`[Nutrition] ${scope} error:`, e.message)
  res.status(500).json({ error: e.message })
}

app.get('/nutrition/foods', async (_req, res) => {
  try {
    const db = await loadCiqualDatabase()
    res.json({ foods: foodStore.all(db.index) })
  } catch (e) {
    sendNutritionError(res, 'Foods', e)
  }
})

app.post('/nutrition/foods', async (req, res) => {
  try {
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : null
    if (!entries || entries.length > MAX_PATCHES_PER_REQUEST) {
      return res.status(400).json({ error: `Liste de fiches manquante ou trop longue (max ${MAX_PATCHES_PER_REQUEST})` })
    }
    const db = await loadCiqualDatabase()
    const patches = []
    for (const entry of entries) {
      const result = validateFoodPatch(entry, db.index)
      if (!result.ok) return res.status(400).json({ error: result.error })
      patches.push(result.patch)
    }
    res.json(foodStore.upsert(patches, db.index))
  } catch (e) {
    sendNutritionError(res, 'Foods update', e)
  }
})

app.post('/nutrition/classify', async (req, res) => {
  try {
    const ingredients = readIngredientsBody(req.body)
    if (!ingredients) return res.status(400).json({ error: 'Liste d\'ingrédients manquante ou trop longue' })
    const db = await loadCiqualDatabase()
    const { items, patches } = classifyIngredients(ingredients, {
      store: foodStore,
      index: db.index,
      aiEnabled: req.body?.aiEnabled === true,
      legacyMappings: readLegacyMappings(req.body?.legacyMappings),
    })
    if (patches.length > 0) foodStore.upsert(patches, db.index)
    res.json({ items: refreshItems(items, foodStore, db.index) })
  } catch (e) {
    sendNutritionError(res, 'Classify', e)
  }
})

async function handleNutritionEstimate(req, res) {
  try {
    const ingredients = readIngredientsBody(req.body)
    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ error: 'Liste d\'ingrédients manquante' })
    }
    const servings = Number(req.body?.servings)
    const db = await loadCiqualDatabase()
    const estimate = await estimateRecipe(ingredients, servings, {
      store: foodStore,
      index: db.index,
      nutrientsOf: (code) => db.nutrientsByFood.get(code) ?? null,
      fallbackNutrients: async (label) => (await findOpenFoodFactsFallback(label))?.nutrition ?? null,
    })
    res.json(estimate)
  } catch (e) {
    sendNutritionError(res, 'Estimate', e)
  }
}

app.post('/nutrition-estimate', handleNutritionEstimate)
// Alias historique : les anciens builds appelaient /marmiton/nutrition-estimate
app.post('/marmiton/nutrition-estimate', handleNutritionEstimate)

// Call Ollama server-side to extract a recipe from text
// Returns { data, error } to provide explicit diagnostics back to the UI.
async function callOllamaServerSide(ollamaUrl, ollamaModel, text, trusted) {
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
  const payload = JSON.stringify({
    model: ollamaModel,
    stream: false,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: text },
    ],
  })
  // Keep this lower than nginx /api/bonap proxy_read_timeout to avoid gateway 504.
  const timeoutMs = 45000
  try {
    let data
    if (trusted) {
      // URL fixée par l'administrateur (OLLAMA_URL) : aucune restriction.
      const r = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!r.ok) {
        const errText = await r.text().catch(() => '')
        const compact = errText.replace(/\s+/g, ' ').trim().slice(0, 220)
        return { data: null, error: `Ollama HTTP ${r.status}${compact ? `: ${compact}` : ''}` }
      }
      data = await r.json()
    } else {
      // URL venue du navigateur : réseau local uniquement, pas de redirection,
      // et pas de corps d'erreur relayé (évite d'en faire un oracle réseau).
      const r = await safeRequest(`${ollamaUrl}/api/chat`, {
        policy: 'local',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        timeoutMs,
        maxRedirects: 0,
      })
      if (r.status < 200 || r.status >= 300) return { data: null, error: `Ollama HTTP ${r.status}` }
      data = JSON.parse(r.body.toString('utf8'))
    }
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
    console.error('[Bonap BFF] Ollama server-side error:', msg)
    if (!trusted && !(e instanceof BlockedAddressError)) {
      return { data: null, error: 'Ollama injoignable' }
    }
    return { data: null, error: msg || 'Erreur inconnue lors de l\'appel Ollama' }
  }
}

// GET /fetch-recipe?url=<encoded_url>[&ollamaUrl=<encoded_url>&ollamaModel=<model>]
// 1. Fetches the page, tries JSON-LD Recipe extraction (fast, no LLM needed)
// 2. If no schema found, calls Ollama server-side (env vars or query params fallback)
// 3. Returns { schema, text, ollamaError? }
app.get('/marmiton/fetch-recipe', async (req, res) => {
  const rawUrl = (req.query.url ?? '').trim()
  if (!rawUrl) return res.status(400).json({ error: 'Paramètre url manquant' })

  // Effective Ollama config: env vars take priority, then query params (in-app settings)
  const ollamaFromEnv = !!OLLAMA_URL
  const queryOllamaUrl = DYNAMIC_OLLAMA_ENABLED ? String(req.query.ollamaUrl ?? '').trim() : ''
  const effectiveOllamaUrl = (OLLAMA_URL || queryOllamaUrl).replace(/\/+$/, '')
  const effectiveOllamaModel = OLLAMA_MODEL || String(req.query.ollamaModel ?? '').trim()

  // SSRF : seules les IP publiques sont joignables. La vérification porte sur
  // l'IP résolue au moment de la connexion (et à chaque redirection), pas sur
  // la chaîne du hostname — voir bff-net-guard.cjs.
  try {
    assertUrlAllowed(rawUrl, 'public')
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  try {
    const r = await safeRequest(rawUrl, { headers: HEADERS, timeoutMs: 12000 })
    if (r.status < 200 || r.status >= 300) return res.status(400).json({ error: `Erreur HTTP ${r.status}` })
    const html = r.body.toString('utf8')

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
        recipeYield: recipeSchema.recipeYield ?? undefined,
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
      console.log(`[Bonap BFF] No JSON-LD found, calling Ollama server-side (${effectiveOllamaUrl}, ${effectiveOllamaModel})...`)
      const ollamaResult = await callOllamaServerSide(effectiveOllamaUrl, effectiveOllamaModel, text, ollamaFromEnv)
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
    if (e instanceof BlockedAddressError) return res.status(400).json({ error: e.message })
    console.error('[Bonap BFF] fetch-recipe error:', e.message)
    res.status(502).json({ error: 'Impossible de récupérer la page' })
  }
})

// GET /image?url=<encoded_url> — proxy pour télécharger l'image sans CORS
// Seuls des formats raster sont relayés : servir du SVG ou du HTML distant
// depuis l'origine de Bonap permettrait d'y exécuter du script (XSS).
const PROXIED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const MAX_PROXIED_IMAGE_BYTES = 10 * 1024 * 1024

app.get('/marmiton/image', async (req, res) => {
  const url = String(req.query.url ?? '').trim()
  try {
    assertUrlAllowed(url, 'public')
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }
  try {
    const r = await safeRequest(url, { headers: HEADERS, timeoutMs: 10000, maxBytes: MAX_PROXIED_IMAGE_BYTES })
    if (r.status < 200 || r.status >= 300) return res.status(502).end()
    const contentType = String(r.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
    if (!PROXIED_IMAGE_TYPES.has(contentType)) {
      return res.status(415).json({ error: 'Le contenu distant n\'est pas une image' })
    }
    res.set('Content-Type', contentType)
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('Content-Security-Policy', "default-src 'none'; sandbox")
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(r.body)
  } catch (e) {
    if (e instanceof BlockedAddressError) return res.status(400).json({ error: e.message })
    console.error('[Bonap BFF] image proxy error:', e.message)
    res.status(502).json({ error: 'Impossible de récupérer l\'image' })
  }
})

// ─── Ollama proxy ─────────────────────────────────────────────────────────────
// Allows the browser to reach an Ollama instance via server-side forwarding,
// avoiding mixed-content errors (HTTPS page → HTTP Ollama) and Ollama's CORS.
//
// Ce n'est PAS un proxy générique :
//   - si OLLAMA_URL est défini, c'est la seule cible (l'en-tête est ignoré) ;
//   - sinon, la cible X-Ollama-Target (réglage Settings) doit résoudre vers le
//     réseau local (jamais link-local / métadonnées cloud), vérifié à la
//     connexion ; désactivable via BONAP_DYNAMIC_OLLAMA_PROXY=false ;
//   - seuls les endpoints Ollama utiles, en GET/POST JSON, sont relayés ;
//   - seules les réponses JSON sont renvoyées, les erreurs réseau sont génériques
//     (pas d'oracle de scan de ports).

const OLLAMA_ROUTES = {
  GET: new Set(['/api/tags', '/api/version', '/api/ps']),
  POST: new Set(['/api/chat', '/api/generate', '/api/show', '/api/embed', '/api/embeddings']),
}

// Mounted with app.use() rather than a wildcard path: `/ollama-proxy/*path` is
// Express 5 syntax, but this service ships with Express 4 (see bff-package.json),
// where `*` compiles to `(.*)` and `path` stays a literal — so the pattern only
// matched URLs ending in "path" and `/ollama-proxy/api/tags` fell through to a
// 404. A mount path behaves identically on both majors, and `req.url` then holds
// the remaining subpath, query string included.
app.use('/ollama-proxy', async (req, res) => {
  const subpath = new URL(req.url, 'http://localhost').pathname
  if (!OLLAMA_ROUTES[req.method]?.has(subpath)) {
    return res.status(404).json({ error: 'Endpoint Ollama non relayé' })
  }

  let target
  let policy
  if (OLLAMA_URL) {
    target = OLLAMA_URL
    policy = null
  } else {
    if (!DYNAMIC_OLLAMA_ENABLED) {
      return res.status(403).json({ error: 'Proxy Ollama dynamique désactivé : définissez LLM_OLLAMA_URL côté serveur' })
    }
    target = req.headers['x-ollama-target']
    policy = 'local'
    try {
      if (typeof target !== 'string') throw new BlockedAddressError('X-Ollama-Target manquant')
      assertUrlAllowed(target, policy)
    } catch (e) {
      return res.status(400).json({ error: e.message })
    }
  }

  const url = `${target.replace(/\/+$/, '')}${subpath}`
  const body = req.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined
  try {
    let status
    let contentType
    let payload
    if (policy === null) {
      // Cible fixée par l'administrateur : pas de filtrage d'IP.
      const upstream = await fetch(url, {
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(115000),
      })
      status = upstream.status
      contentType = upstream.headers.get('content-type') || ''
      payload = Buffer.from(await upstream.arrayBuffer())
    } else {
      const upstream = await safeRequest(url, {
        policy,
        method: req.method,
        headers: { 'content-type': 'application/json' },
        body,
        timeoutMs: 115000, // < proxy_read_timeout nginx (120s)
        maxBytes: 20 * 1024 * 1024,
        maxRedirects: 0,
      })
      status = upstream.status
      contentType = String(upstream.headers['content-type'] || '')
      payload = upstream.body
    }
    if (!/^application\/(x-)?(nd)?json\b/i.test(contentType)) {
      return res.status(502).json({ error: 'Réponse inattendue : la cible ne semble pas être Ollama' })
    }
    res.status(status)
    res.set('content-type', contentType)
    res.set('X-Content-Type-Options', 'nosniff')
    res.send(payload)
  } catch (e) {
    if (e instanceof BlockedAddressError) {
      return res.status(400).json({ error: e.message })
    }
    console.error('[Bonap BFF] Ollama proxy error:', e.message)
    res.status(502).json({ error: 'Ollama injoignable' })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Bonap BFF] En écoute sur le port ${PORT}`)
})