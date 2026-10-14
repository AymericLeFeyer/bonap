'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { normalizeFoodKey, detectPrecisions } = require('./bff-nutrition-text.cjs')
const { classifyUnit, readIngredient, quantityKind, gramsFor } = require('./bff-nutrition-quantity.cjs')
const { createFoodStore, mergeFoodEntry, validateFoodPatch, MAX_ENTRIES } = require('./bff-nutrition-foods.cjs')
const {
  buildCiqualIndex,
  classifyIngredients,
  computeCoverage,
  estimateRecipe,
  findExactRawMatch,
  refreshItems,
  withEnergy,
} = require('./bff-nutrition-classify.cjs')

const CIQUAL_FOODS = [
  { code: '20016', name: 'Chou-fleur, cru' },
  { code: '20017', name: 'Chou-fleur, cuit' },
  { code: '20082', name: 'Chou-fleur, surgelé, cru' },
  { code: '25001', name: 'Gratin de chou-fleur, préemballé' },
  { code: '20504', name: 'Lentille, sèche' },
  { code: '20505', name: "Lentille, bouillie/cuite à l'eau" },
  { code: '22000', name: 'Oeuf, cru' },
  { code: '17270', name: "Huile d'olive vierge extra" },
  { code: '20034', name: 'Oignon, cru' },
  { code: '20160', name: 'Navet, pelé, cru' },
  { code: '16400', name: 'Beurre à 82% MG, doux' },
  { code: '20200', name: 'Haricot beurre, cru' },
  { code: '20061', name: 'Haricot vert, cru' },
  { code: '13111', name: 'Pomme, sèche' },
  { code: '13050', name: 'Pomme, pulpe, crue' },
]

const NUTRIENTS = {
  20016: { calories: 25, protein: 2 },
  20504: { calories: 330, protein: 25 },
  22000: { calories: 140, protein: 12.5 },
  17270: { calories: 900, fat: 100 },
  20034: { calories: 40, protein: 1 },
  20160: { calories: 20 },
  13050: { protein: 0.25, carbs: 10.7, fat: 0.25, fiber: 1.4 },
}

const index = buildCiqualIndex(CIQUAL_FOODS)

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bonap-foods-')), 'foods.json')
}

function newStore() {
  return createFoodStore({ filePath: tempFile() })
}

function classify(store, ingredients, options = {}) {
  const { items, patches } = classifyIngredients(ingredients, { store, index, aiEnabled: false, ...options })
  if (patches.length > 0) store.upsert(patches, index)
  return refreshItems(items, store, index)
}

function estimate(store, ingredients, servings = 1, fallbackNutrients = async () => null) {
  return estimateRecipe(ingredients, servings, {
    store,
    index,
    nutrientsOf: (code) => NUTRIENTS[code] ?? null,
    fallbackNutrients,
  })
}

test('normalizeFoodKey : même clé pour les variantes d\'écriture', () => {
  assert.equal(normalizeFoodKey('Chou-fleur'), 'chou fleur')
  assert.equal(normalizeFoodKey('choux-fleurs'), 'chou fleur')
  assert.equal(normalizeFoodKey('Chou-fleur, cru'), 'chou fleur')
  assert.equal(normalizeFoodKey('oignons émincés'), 'oignon')
  assert.equal(normalizeFoodKey('Gros sel'), 'sel')
  assert.equal(normalizeFoodKey('fraises'), 'fraise')
  assert.equal(normalizeFoodKey('Beurre doux'), 'beurre doux')
  assert.equal(normalizeFoodKey("Huile d'olive vierge extra"), 'huile olive')
})

test('detectPrecisions : précisions explicites conservées', () => {
  assert.deepEqual(detectPrecisions('tomates en boîte'), ['conserve'])
  assert.deepEqual(detectPrecisions('Chou-fleur, surgelé, cru'), ['surgele'])
  assert.deepEqual(detectPrecisions('Lentille, sèche'), ['seche'])
})

test('readIngredient : quantité et unité lues dans la note libre', () => {
  assert.deepEqual(readIngredient({ note: '200 g de farine' }), { quantity: 200, unit: 'g', unitAbbreviation: '', label: 'farine' })
  assert.deepEqual(readIngredient({ note: '1 chou-fleur' }), { quantity: 1, unit: '', unitAbbreviation: '', label: 'chou-fleur' })
  assert.deepEqual(readIngredient({ note: '1/2 citron' }), { quantity: 0.5, unit: '', unitAbbreviation: '', label: 'citron' })
  assert.deepEqual(readIngredient({ food: 'Beurre', quantity: '30', unit: 'g' }), { quantity: 30, unit: 'g', unitAbbreviation: '', label: 'Beurre' })
})

test('readIngredient : quantité Mealie reprise quand la note n\'en contient pas', () => {
  assert.deepEqual(readIngredient({ quantity: '4', unit: '', note: 'Saucisse diot' }), { quantity: 4, unit: '', unitAbbreviation: '', label: 'Saucisse diot' })
  assert.deepEqual(readIngredient({ quantity: '', unit: '', note: 'sel' }), { quantity: null, unit: '', unitAbbreviation: '', label: 'sel' })
  assert.deepEqual(readIngredient({ quantity: '1', unit: 'kg', note: '200 g de farine' }), { quantity: 200, unit: 'g', unitAbbreviation: '', label: 'farine' })
})

test('quantityKind : masse, volume, pièce, vague', () => {
  const kindOf = (note) => quantityKind(readIngredient({ note }))
  assert.equal(kindOf('1,5 kg de pommes de terre'), 'mass')
  assert.equal(kindOf('2 c. à soupe d’huile'), 'volume')
  assert.equal(kindOf('3 oeufs'), 'piece')
  assert.equal(kindOf('1 pincée de sel'), 'vague')
  assert.equal(kindOf('1 filet d\'huile'), 'vague')
  assert.equal(kindOf('sel'), 'vague')
})

test('classifyUnit : unités Mealie anglo-saxonnes et once liquide', () => {
  assert.deepEqual(classifyUnit('mililitre'), { kind: 'volume', factor: 1 })
  assert.deepEqual(classifyUnit('once'), { kind: 'mass', factor: 28.3495 })
  assert.deepEqual(classifyUnit('livre'), { kind: 'mass', factor: 453.592 })
  assert.deepEqual(classifyUnit('once liquide'), { kind: 'volume', factor: 29.5735 })
  assert.deepEqual(classifyUnit('pinte'), { kind: 'volume', factor: 473.176 })
  assert.deepEqual(classifyUnit('quart'), { kind: 'volume', factor: 946.353 })
  assert.deepEqual(classifyUnit('gallon'), { kind: 'volume', factor: 3785.41 })
  assert.equal(classifyUnit('tête').kind, 'piece')
  assert.equal(classifyUnit('paquet').kind, 'unknown')
})

test('classifyUnit : abréviation Mealie en secours d\'un nom inconnu', () => {
  assert.deepEqual(classifyUnit('Fluid Ounce US', 'fl oz'), { kind: 'volume', factor: 29.5735 })
  assert.deepEqual(classifyUnit('gramme', 'kg'), { kind: 'mass', factor: 1 })
})

test('gramsFor : once liquide convertie en millilitres puis en grammes', () => {
  assert.deepEqual(gramsFor({ quantity: 8, unit: 'fl oz' }, 'lait', { density: 1 }), { grams: 8 * 29.5735 })
  assert.deepEqual(readIngredient({ note: '8 fl oz de lait' }).unit, 'fl oz')
})

test('gramsFor : volume × densité et pièce × poids de la fiche', () => {
  assert.deepEqual(gramsFor({ quantity: 10, unit: 'cl' }, 'huile', { density: 0.92 }), { grams: 92 })
  assert.deepEqual(gramsFor({ quantity: 2, unit: '' }, 'oeuf', { pieceWeight: 60 }), { grams: 120 })
  assert.deepEqual(gramsFor({ quantity: 2, unit: '' }, 'navet', {}), { reason: 'piece-weight-missing' })
  assert.deepEqual(gramsFor({ quantity: 2, unit: 'sachet' }, 'levure', {}), { reason: 'unit-unknown' })
})

test('validateFoodPatch : code CIQUAL inexistant refusé', () => {
  const result = validateFoodPatch({ key: 'chou fleur', ciqualCode: '99999', origin: 'user' }, index)
  assert.equal(result.ok, false)
})

test('validateFoodPatch : le nom CIQUAL vient de la table, pas du client', () => {
  const result = validateFoodPatch({ key: 'chou fleur', ciqualCode: '20016', ciqualName: '<script>', origin: 'user' }, index)
  assert.equal(result.ok, true)
  assert.equal(result.patch.ciqualName, 'Chou-fleur, cru')
})

test('validateFoodPatch : bornes du poids d\'une pièce et de la densité', () => {
  assert.equal(validateFoodPatch({ key: 'navet', pieceWeight: 0.5, origin: 'ai' }, index).ok, false)
  assert.equal(validateFoodPatch({ key: 'navet', pieceWeight: 6000, origin: 'ai' }, index).ok, false)
  assert.equal(validateFoodPatch({ key: 'navet', pieceWeight: 150, origin: 'ai' }, index).ok, true)
  assert.equal(validateFoodPatch({ key: 'huile', density: 12, origin: 'user' }, index).ok, false)
})

test('validateFoodPatch : clé non normalisée, statut ou origine inconnus refusés', () => {
  assert.equal(validateFoodPatch({ key: 'Chou-Fleur', origin: 'user' }, index).ok, false)
  assert.equal(validateFoodPatch({ key: 'x'.repeat(81), origin: 'user' }, index).ok, false)
  assert.equal(validateFoodPatch({ key: 'navet', status: 'hacked', origin: 'user' }, index).ok, false)
  assert.equal(validateFoodPatch({ key: 'navet', origin: 'admin' }, index).ok, false)
})

test('mergeFoodEntry : une fiche validée n\'est jamais modifiée par l\'IA ou l\'automatique', () => {
  const validated = { status: 'validated', origin: 'user', ciqualCode: '20016' }
  assert.equal(mergeFoodEntry(validated, { key: 'chou fleur', ciqualCode: '20017', origin: 'ai' }), null)
  assert.equal(mergeFoodEntry(validated, { key: 'chou fleur', status: 'auto', origin: 'auto' }), null)
  const byUser = mergeFoodEntry(validated, { key: 'chou fleur', pieceWeight: 700, origin: 'user' })
  assert.equal(byUser.pieceWeight, 700)
  assert.equal(byUser.status, 'validated')
})

test('mergeFoodEntry : marquer négligeable change le statut, et inversement', () => {
  const negligible = mergeFoodEntry({ status: 'auto', ciqualCode: '20016' }, { key: 'k', negligible: true, origin: 'user' })
  assert.equal(negligible.status, 'negligible')
  const restored = mergeFoodEntry(negligible, { key: 'k', negligible: false, origin: 'user' })
  assert.equal(restored.status, 'proposed')
  assert.equal(restored.negligible, false)
})

test('createFoodStore : fiches persistées et relues depuis le fichier', () => {
  const filePath = tempFile()
  const store = createFoodStore({ filePath })
  store.upsert([{ key: 'navet', ciqualCode: '20160', ciqualName: 'Navet, pelé, cru', pieceWeight: 150, status: 'validated', origin: 'user' }], index)
  const reloaded = createFoodStore({ filePath })
  assert.equal(reloaded.get('navet', index).pieceWeight, 150)
  assert.equal(reloaded.get('navet', index).status, 'validated')
})

test('createFoodStore : les fiches initiales servent de valeurs par défaut', () => {
  const store = newStore()
  const egg = store.get('oeuf', index)
  assert.equal(egg.ciqualCode, '22000')
  assert.equal(egg.pieceWeight, 60)
  assert.equal(store.get('sel', index).status, 'negligible')
  assert.equal(store.all(index).oignon.pieceWeight, 110)
})

test('createFoodStore : nombre de fiches borné', () => {
  const store = newStore()
  const patches = Array.from({ length: MAX_ENTRIES + 1 }, (_, i) => ({ key: `aliment${i}`, status: 'to-review', origin: 'auto' }))
  const { skipped } = store.upsert(patches, index)
  assert.deepEqual(skipped, [`aliment${MAX_ENTRIES}`])
})

test('findExactRawMatch : forme crue retenue, jamais la forme cuite', () => {
  assert.equal(findExactRawMatch('chou fleur', index).code, '20016')
})

test('findExactRawMatch : précision explicite respectée', () => {
  assert.equal(findExactRawMatch('chou fleur surgele', index).code, '20082')
})

test('findExactRawMatch : à défaut de forme crue, la forme la plus brute', () => {
  assert.equal(findExactRawMatch('lentille', index).code, '20504')
})

test('classify : correspondance exacte enregistrée comme fiche automatique', () => {
  const store = newStore()
  const [item] = classify(store, [{ note: '1 chou-fleur' }])
  assert.equal(item.entry.status, 'auto')
  assert.equal(item.entry.ciqualCode, '20016')
  assert.equal(store.get('chou fleur', index).origin, 'auto')
})

test('classify : une fiche validée est reprise telle quelle', () => {
  const store = newStore()
  store.upsert([{ key: 'chou fleur', ciqualCode: '20017', ciqualName: 'Chou-fleur, cuit', status: 'validated', origin: 'user' }], index)
  const [item] = classify(store, [{ note: '1 chou-fleur' }], { aiEnabled: true })
  assert.equal(item.entry.ciqualCode, '20017')
  assert.equal(item.needsAi, false)
})

test('classify : sans IA, ingrédient ambigu « à vérifier » avec suggestions', () => {
  const store = newStore()
  const [item] = classify(store, [{ food: 'Haricot', quantity: '200', unit: 'g' }])
  assert.equal(item.entry.status, 'to-review')
  assert.ok(item.entry.suggestions.length > 0)
  assert.ok(item.entry.suggestions[0].name)
})

test('classify : avec IA, les candidats sont renvoyés au navigateur', () => {
  const store = newStore()
  const [item] = classify(store, [{ food: 'Haricot', quantity: '200', unit: 'g' }], { aiEnabled: true })
  assert.equal(item.needsAi, true)
  assert.ok(item.candidates.some((candidate) => candidate.code === '20200'))
  assert.equal(store.get('haricot', index), null)
})

test('classify : un ingrédient n\'est classé qu\'une fois', () => {
  const store = newStore()
  const items = classify(store, [{ note: '1 chou-fleur' }, { note: '2 choux-fleurs' }, { food: 'Chou fleur', quantity: '500', unit: 'g' }])
  assert.equal(items.length, 1)
})

test('classify : ingrédient sans quantité ignoré (négligeable)', () => {
  const store = newStore()
  assert.equal(classify(store, [{ note: 'persil' }]).length, 0)
})

test('classify : correspondance héritée importée comme « proposée »', () => {
  const store = newStore()
  const [item] = classify(store, [{ food: 'Haricot', quantity: '200', unit: 'g' }], {
    legacyMappings: { Haricot: 'Haricot beurre, cru' },
  })
  assert.equal(item.entry.status, 'proposed')
  assert.equal(item.entry.origin, 'legacy')
  assert.equal(item.entry.ciqualCode, '20200')
})

test('classify : poids d\'une pièce manquant signalé', () => {
  const store = newStore()
  const [item] = classify(store, [{ note: '2 navets' }])
  assert.equal(item.entry.ciqualCode, '20160')
  assert.equal(item.needsPieceWeight, true)
})

test('estimateRecipe : nutrition ramenée à une portion', async () => {
  const store = newStore()
  classify(store, [{ note: '1 chou-fleur' }])
  const result = await estimate(store, [{ note: '1 chou-fleur' }], 4)
  assert.equal(result.servings, 4)
  assert.equal(result.nutrition.calories, '37.5 kcal')
  assert.equal(result.coverage, 1)
})

test('estimateRecipe : négligeables exclus sans pénalité', async () => {
  const store = newStore()
  classify(store, [{ note: '3 oeufs' }])
  const result = await estimate(store, [{ note: '3 oeufs' }, { note: 'sel' }, { note: '1 pincée de poivre' }])
  assert.equal(result.coverage, 1)
  assert.equal(result.lines.filter((line) => line.negligible).length, 2)
})

test('estimateRecipe : ingrédient non résolu fait baisser la couverture', async () => {
  const store = newStore()
  classify(store, [{ note: '3 oeufs' }])
  const result = await estimate(store, [{ note: '3 oeufs' }, { note: '180 g de quinoa' }])
  assert.equal(result.coverage, 0.5)
  assert.equal(result.lines[1].reason, 'no-match')
})

test('estimateRecipe : Open Food Facts en secours si CIQUAL n\'a pas de nutriments', async () => {
  const store = newStore()
  store.upsert([{ key: 'beurre doux', ciqualCode: '16400', ciqualName: 'Beurre à 82% MG, doux', status: 'validated', origin: 'user' }], index)
  const result = await estimate(store, [{ food: 'Beurre doux', quantity: '100', unit: 'g' }], 1, async () => ({ calories: 740 }))
  assert.equal(result.lines[0].source, 'off')
  assert.equal(result.nutrition.calories, '740 kcal')
})

test('computeCoverage : poids inconnu compté au poids moyen des ingrédients pesés', () => {
  const coverage = computeCoverage([
    { grams: 300, included: true, negligible: false },
    { grams: 100, included: true, negligible: false },
    { grams: null, included: false, negligible: false },
  ])
  assert.equal(coverage.totalGrams, 600)
  assert.equal(coverage.coverage, 0.667)
})

test('withEnergy : énergie recalculée depuis les macronutriments si CIQUAL ne la fournit pas', () => {
  assert.equal(withEnergy({ protein: 10, carbs: 20, fat: 5, fiber: 3 }).calories, 10 * 4 + 20 * 4 + 5 * 9 + 3 * 2)
  assert.equal(withEnergy({ calories: 52, carbs: 20 }).calories, 52)
  assert.equal(withEnergy({ calories: 0, carbs: 20 }).calories, 0)
})

test('estimateRecipe : une pomme sans énergie CIQUAL compte ses calories', async () => {
  const store = newStore()
  store.upsert([{ key: 'pomme', ciqualCode: '13050', ciqualName: 'Pomme, pulpe, crue', status: 'validated', origin: 'user' }], index)
  const result = await estimate(store, [{ food: 'Pomme', quantity: '100', unit: 'g' }])
  assert.equal(result.nutrition.calories, '48.8 kcal')
})
