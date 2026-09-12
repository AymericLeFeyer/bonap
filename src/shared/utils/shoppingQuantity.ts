/**
 * Structural shape of a unit of measure. Kept structural so this helper stays
 * free of any dependency on the shopping domain.
 */
interface QuantityUnit {
  name: string
  // L'API Mealie renvoie null (et non undefined) pour les champs non renseignés.
  pluralName?: string | null
  abbreviation?: string | null
  pluralAbbreviation?: string | null
  useAbbreviation?: boolean
}

/**
 * Un barreau d'une échelle métrique : ce que vaut une unité de ce barreau,
 * exprimé dans l'unité de base de l'échelle (le gramme, le millilitre).
 */
interface MetricRung {
  /** Orthographes Mealie possibles, en minuscules et sans accent. */
  aliases: readonly string[]
  factor: number
  /** Barreau utilisable à l'affichage. `mg`, `cl` et `dl` sont seulement reconnus en entrée. */
  display: boolean
  name: string
  pluralName: string
  abbreviation: string
}

const MASS_LADDER: readonly MetricRung[] = [
  { aliases: ["mg", "milligramme", "milligrammes"], factor: 0.001, display: false, name: "milligramme", pluralName: "milligrammes", abbreviation: "mg" },
  { aliases: ["g", "gr", "gramme", "grammes"], factor: 1, display: true, name: "gramme", pluralName: "grammes", abbreviation: "g" },
  { aliases: ["kg", "kilo", "kilos", "kilogramme", "kilogrammes"], factor: 1000, display: true, name: "kilogramme", pluralName: "kilogrammes", abbreviation: "kg" },
]

const VOLUME_LADDER: readonly MetricRung[] = [
  { aliases: ["ml", "millilitre", "millilitres"], factor: 1, display: true, name: "millilitre", pluralName: "millilitres", abbreviation: "ml" },
  { aliases: ["cl", "centilitre", "centilitres"], factor: 10, display: false, name: "centilitre", pluralName: "centilitres", abbreviation: "cl" },
  { aliases: ["dl", "decilitre", "decilitres"], factor: 100, display: false, name: "décilitre", pluralName: "décilitres", abbreviation: "dl" },
  { aliases: ["l", "litre", "litres"], factor: 1000, display: true, name: "litre", pluralName: "litres", abbreviation: "L" },
]

const LADDERS: readonly (readonly MetricRung[])[] = [MASS_LADDER, VOLUME_LADDER]

/** Minuscules, sans accent ni point final, pour comparer « c.à.s » et « Litres ». */
function normalizeLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.+$/, "")
}

/** Arrondit le bruit de virgule flottante introduit par les multiplications. */
function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals
  return Math.round(value * scale) / scale
}

/**
 * Nettoie une quantité obtenue par calcul (un pas de stepper, par exemple)
 * avant de l'envoyer à Mealie, pour éviter les 0.49900000000000005.
 */
export function roundQuantity(quantity: number): number {
  return roundTo(quantity, 6)
}

/** Retrouve l'échelle et le barreau correspondant à l'unité d'un article. */
function findRung(unit: QuantityUnit): { ladder: readonly MetricRung[]; rung: MetricRung } | undefined {
  const candidates = [unit.abbreviation, unit.name, unit.pluralAbbreviation, unit.pluralName]
    .filter((label): label is string => Boolean(label))
    .map(normalizeLabel)
  for (const ladder of LADDERS) {
    for (const rung of ladder) {
      if (candidates.some((candidate) => rung.aliases.includes(candidate))) return { ladder, rung }
    }
  }
  return undefined
}

function toQuantityUnit(rung: MetricRung): QuantityUnit {
  return {
    name: rung.name,
    pluralName: rung.pluralName,
    abbreviation: rung.abbreviation,
    pluralAbbreviation: rung.abbreviation,
    useAbbreviation: true,
  }
}

/**
 * Résultat d'une normalisation : la quantité et l'unité à afficher, plus le pas
 * d'incrément correspondant à « un » dans l'unité affichée, exprimé dans
 * l'unité stockée par Mealie.
 */
export interface NormalizedQuantity {
  quantity: number
  unit?: QuantityUnit
  /** 1000 pour un article stocké en grammes et affiché en kilogrammes. */
  step: number
}

/**
 * Choisit l'unité métrique la plus lisible pour une quantité : 1500 g devient
 * 1.5 kg, 0.5 L devient 500 ml.
 *
 * Deux garde-fous :
 * - les unités non métriques (gousse, c. à s., boîte) sont laissées telles quelles ;
 * - on ne monte d'un barreau que si la quantité affichée y reste ≥ 1.
 *
 * L'affichage arrondit à deux décimales, donc 1234 g devient « 1.23 kg » : une
 * unité cohérente d'une ligne à l'autre prime sur le gramme près.
 */
export function normalizeQuantity(quantity: number, unit?: QuantityUnit): NormalizedQuantity {
  if (!unit || !Number.isFinite(quantity) || quantity <= 0) return { quantity, unit, step: 1 }

  const found = findRung(unit)
  if (!found) return { quantity, unit, step: 1 }

  const base = roundTo(quantity * found.rung.factor, 6)
  const reachable = found.ladder.filter((rung) => rung.display && rung.factor <= base)
  const target = reachable[reachable.length - 1]
  if (!target || target === found.rung) return { quantity, unit, step: 1 }

  const converted = roundTo(base / target.factor, 6)
  return { quantity: converted, unit: toQuantityUnit(target), step: target.factor / found.rung.factor }
}

/** Formats a number the way Mealie does: no trailing zeros on whole values. */
export function formatAmount(quantity: number): string {
  const rounded = Math.round(quantity * 100) / 100
  return rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded)
}

/**
 * Renders the unit label for a given quantity, following Mealie's own rules:
 * the abbreviation wins when the unit is flagged `useAbbreviation`, and the
 * plural form is used beyond one.
 */
export function formatUnit(quantity: number, unit?: QuantityUnit): string {
  if (!unit) return ""
  const plural = quantity > 1
  if (unit.useAbbreviation && unit.abbreviation) {
    return (plural && unit.pluralAbbreviation) || unit.abbreviation
  }
  return (plural && unit.pluralName) || unit.name
}

/**
 * Formats a shopping item's quantity together with its unit — "700 g",
 * "1.5 kg", "3 c. à s.", or just "3" when the item carries no unit.
 * Returns an empty string when there is nothing meaningful to show.
 */
export function formatItemQuantity(quantity?: number, unit?: QuantityUnit): string {
  if (quantity === undefined || quantity <= 0) return ""
  const normalized = normalizeQuantity(quantity, unit)
  const amount = formatAmount(normalized.quantity)
  const label = formatUnit(normalized.quantity, normalized.unit)
  return label ? `${amount} ${label}` : amount
}
