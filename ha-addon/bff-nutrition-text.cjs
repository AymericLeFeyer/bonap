'use strict'

// Normalisation du vocabulaire des recettes et de CIQUAL vers une même clé :
// « Chou-fleur », « chou fleur » et « choux-fleurs » donnent « chou fleur ».

const STOP_WORDS = new Set([
  'de', 'du', 'des', 'd', 'la', 'le', 'les', 'l', 'un', 'une',
  'au', 'aux', 'a', 'en', 'pour', 'avec', 'sans',
])

const PREPARATION_WORDS = new Set([
  'frais', 'fraiche', 'hache', 'hachee', 'emince', 'emincee', 'rape', 'rapee',
  'cuit', 'cuite', 'cru', 'crue', 'coupe', 'coupee', 'morceau', 'rondelle', 'lamelle',
  'cube', 'bio', 'maison', 'entier', 'entiere', 'concasse', 'concassee', 'moulu',
  'moulue', 'vierge', 'extra', 'egoutte', 'egouttee', 'epluche', 'epluchee', 'lave',
  'lavee', 'finement', 'grossierement', 'environ', 'gros', 'grosse', 'moyen',
  'moyenne', 'beau', 'belle',
])

const PRECISION_PATTERNS = {
  conserve: /\b(conserve|appertise|bocal|boite)\b/,
  surgele: /\bsurgele\b/,
  seche: /\b(seche|sec|deshydrate)\b/,
  fume: /\bfume\b/,
  allege: /\b(allege|light|reduite? en matiere grasse)\b/,
}

function stripAccents(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function toPlainText(value) {
  return stripAccents(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function singularize(word) {
  if (word.length <= 3) return word
  if (word.endsWith('eaux') || word === 'choux') return word.slice(0, -1)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

function canonicalWord(word) {
  const singular = singularize(word)
  if (singular === 'appertise' || singular === 'bocal' || singular === 'boite') return 'conserve'
  if (singular === 'sec' || singular === 'deshydrate') return 'seche'
  return singular
}

function normalizeFoodKey(value) {
  return toPlainText(value)
    .split(' ')
    .filter((word) => !PREPARATION_WORDS.has(word))
    .map(canonicalWord)
    .filter((word) => word && !STOP_WORDS.has(word) && !PREPARATION_WORDS.has(word))
    .join(' ')
}

function detectPrecisions(value) {
  const text = toPlainText(value).split(' ').map(canonicalWord).join(' ')
  return Object.keys(PRECISION_PATTERNS).filter((name) => PRECISION_PATTERNS[name].test(text))
}

function sameSet(left, right) {
  return left.length === right.length && left.every((item) => right.includes(item))
}

module.exports = {
  canonicalWord,
  detectPrecisions,
  normalizeFoodKey,
  sameSet,
  stripAccents,
  toPlainText,
}
