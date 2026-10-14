'use strict'

const { toPlainText } = require('./bff-nutrition-text.cjs')

const OUNCE_GRAMS = 28.3495
const POUND_GRAMS = 453.592
const FLUID_OUNCE_ML = 29.5735
const US_PINT_ML = 473.176
const US_QUART_ML = 946.353
const US_GALLON_ML = 3785.41

const MASS_FACTORS = {
  g: 1, gr: 1, gramme: 1, kg: 1000, kilo: 1000, kilogramme: 1000, mg: 0.001, milligramme: 0.001,
  once: OUNCE_GRAMS, ounce: OUNCE_GRAMS, oz: OUNCE_GRAMS, livre: POUND_GRAMS, pound: POUND_GRAMS, lb: POUND_GRAMS,
}

const VOLUME_FACTORS = {
  ml: 1, millilitre: 1, mililitre: 1, cl: 10, centilitre: 10, dl: 100, decilitre: 100, l: 1000, litre: 1000,
  'once liquide': FLUID_OUNCE_ML, 'fluid ounce': FLUID_OUNCE_ML, 'fl oz': FLUID_OUNCE_ML, floz: FLUID_OUNCE_ML,
  pinte: US_PINT_ML, pint: US_PINT_ML, pt: US_PINT_ML,
  quart: US_QUART_ML, qt: US_QUART_ML, gallon: US_GALLON_ML, gal: US_GALLON_ML,
  'c a c': 5, 'c a cafe': 5, 'c cafe': 5, cc: 5, cac: 5, 'cuillere a cafe': 5, 'cuilleree a cafe': 5,
  'c a s': 15, 'c a soupe': 15, 'c soupe': 15, cs: 15, cas: 15, 'cuillere a soupe': 15, 'cuilleree a soupe': 15,
  verre: 200, tasse: 250, bol: 350,
}

const PIECE_UNITS = new Set(['', 'piece', 'unite', 'u', 'tranche', 'botte', 'pave', 'filet de poisson', 'tete', 'part'])
const VAGUE_UNITS = new Set([
  'pincee', 'filet', 'trait', 'qs', 'q s', 'noisette', 'brin', 'feuille', 'branche', 'zeste',
  'poignee', 'quelques', 'au gout', 'soupcon', 'touche',
])
const CLOVE_UNITS = new Set(['gousse'])
const CAN_UNITS = new Set(['boite', 'conserve', 'can', 'bocal'])

const CLOVE_WEIGHT_GRAMS = 6
const CAN_WEIGHTS = [
  { pattern: /tomate/, grams: 400 },
  { pattern: /mais/, grams: 285 },
  { pattern: /thon/, grams: 140 },
  { pattern: /pois chiche|haricot|lentille/, grams: 250 },
]
const DEFAULT_CAN_WEIGHT_GRAMS = 300

const UNIT_PATTERN = [
  'cuill[eè]re?s?\\s+[àa]\\s+(?:soupe|caf[ée])', 'cuiller[ée]es?\\s+[àa]\\s+(?:soupe|caf[ée])',
  'c\\.?\\s*[àa]\\.?\\s*(?:s|c|soupe|caf[ée])\\.?', 'c\\.?\\s*(?:soupe|caf[ée])',
  'kg', 'mg', 'gr?', 'grammes?', 'ml', 'cl', 'dl', 'l', 'litres?', 'fl\\.?\\s*oz', 'oz', 'lbs?',
  'cs', 'cc', 'cas', 'cac', 'pinc[ée]es?', 'gousses?', 'bo[iî]tes?', 'verres?', 'tasses?', 'bols?',
  'filets?', 'brins?', 'feuilles?', 'branches?', 'tranches?', 'bottes?', 'zestes?', 'poign[ée]es?',
].join('|')

const NOTE_QUANTITY_REGEX = new RegExp(
  `^\\s*(\\d+(?:[.,]\\d+)?(?:\\s*\\/\\s*\\d+)?|[¼½¾])\\s*(?:(${UNIT_PATTERN})(?=\\s|$|\\.))?\\s*(?:de\\s+|d['’]\\s*)?(.*)$`,
  'i',
)

function parseQuantity(value) {
  const raw = String(value ?? '').trim()
    .replace(/¼/g, '1/4')
    .replace(/½/g, '1/2')
    .replace(/¾/g, '3/4')
  if (!raw) return null
  const fraction = raw.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (fraction) {
    const denominator = Number.parseFloat(fraction[2])
    return denominator > 0 ? Number.parseFloat(fraction[1]) / denominator : null
  }
  const number = Number.parseFloat(raw.replace(',', '.'))
  return Number.isFinite(number) && number > 0 ? number : null
}

function parseNoteLine(note) {
  const match = String(note ?? '').match(NOTE_QUANTITY_REGEX)
  if (!match || !match[3]?.trim()) return { quantity: null, unit: '', label: String(note ?? '').trim() }
  return { quantity: parseQuantity(match[1]), unit: match[2] || '', label: match[3].trim() }
}

/**
 * Quantité et unité d'un ingrédient. Sans aliment structuré, celles écrites en
 * tête de note (« 200 g de farine ») priment ; à défaut on reprend les champs
 * quantité et unité de Mealie (« 4 » + note « Saucisse diot »).
 * L'abréviation de l'unité Mealie sert de secours quand son nom est inconnu.
 */
function readIngredient(ingredient) {
  const quantity = parseQuantity(ingredient?.quantity)
  const unit = String(ingredient?.unit ?? '').trim()
  const unitAbbreviation = String(ingredient?.unitAbbreviation ?? '').trim()
  const food = String(ingredient?.food ?? '').trim()
  if (food) return { quantity, unit, unitAbbreviation, label: food }
  const parsed = parseNoteLine(ingredient?.note)
  return parsed.quantity !== null ? { ...parsed, unitAbbreviation: '' } : { ...parsed, quantity, unit, unitAbbreviation }
}

function canonicalUnit(unit) {
  return toPlainText(unit)
    .split(' ')
    .map((word) => (word.length > 2 && word.endsWith('s') ? word.slice(0, -1) : word))
    .join(' ')
}

function classifyUnitName(unit) {
  const key = canonicalUnit(unit)
  if (key in MASS_FACTORS) return { kind: 'mass', factor: MASS_FACTORS[key] }
  if (key in VOLUME_FACTORS) return { kind: 'volume', factor: VOLUME_FACTORS[key] }
  if (VAGUE_UNITS.has(key)) return { kind: 'vague', factor: 0 }
  if (CLOVE_UNITS.has(key)) return { kind: 'clove', factor: CLOVE_WEIGHT_GRAMS }
  if (CAN_UNITS.has(key)) return { kind: 'can', factor: 0 }
  if (PIECE_UNITS.has(key)) return { kind: 'piece', factor: 0 }
  return { kind: 'unknown', factor: 0 }
}

function classifyUnit(unit, abbreviation = '') {
  const byName = classifyUnitName(unit)
  if (byName.kind !== 'unknown' || !abbreviation) return byName
  return classifyUnitName(abbreviation)
}

function quantityKind(reading) {
  if (reading.quantity === null) return 'vague'
  return classifyUnit(reading.unit, reading.unitAbbreviation).kind
}

function canWeight(foodKey) {
  return CAN_WEIGHTS.find((entry) => entry.pattern.test(foodKey))?.grams ?? DEFAULT_CAN_WEIGHT_GRAMS
}

/**
 * Convertit une quantité lue en grammes à l'aide de la fiche de l'aliment.
 * @returns {{ grams: number } | { negligible: true } | { reason: 'piece-weight-missing' | 'unit-unknown' }}
 */
function gramsFor(reading, foodKey, entry) {
  if (reading.quantity === null) return { negligible: true }
  const { kind, factor } = classifyUnit(reading.unit, reading.unitAbbreviation)
  switch (kind) {
    case 'mass':
    case 'clove':
      return { grams: reading.quantity * factor }
    case 'volume':
      return { grams: reading.quantity * factor * (entry?.density ?? 1) }
    case 'can':
      return { grams: reading.quantity * canWeight(foodKey) }
    case 'piece':
      return entry?.pieceWeight
        ? { grams: reading.quantity * entry.pieceWeight }
        : { reason: 'piece-weight-missing' }
    case 'vague':
      return { negligible: true }
    default:
      return { reason: 'unit-unknown' }
  }
}

module.exports = {
  classifyUnit,
  gramsFor,
  parseNoteLine,
  parseQuantity,
  quantityKind,
  readIngredient,
}
