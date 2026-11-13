import type { MealieRecipe, MealieTag } from "../types/mealie.ts"
import { formatDate } from "./date.ts"

/**
 * Batch cooking. Mealie ne connaît pas la notion : comme les saisons, une
 * recette « batch » porte un tag, et ses réglages + son stock vivent dans les
 * extras de la recette (chaînes uniquement côté Mealie, le stock est en JSON).
 *
 * Le stock est donc partagé entre tous les appareils, sans stockage Bonap.
 * Une entrée de stock = des plats d'une même préparation (même date) rangés
 * au même endroit ; elle est identifiée par (location, preparedAt).
 */
export const BATCH_TAG = "batch"

export const BATCH_EXTRAS = {
  fridgeDays: "batchFridgeDays",
  freezerDays: "batchFreezerDays",
  stock: "batchStock",
} as const

export const BATCH_EXTRA_KEYS: string[] = Object.values(BATCH_EXTRAS)

export type BatchLocation = "fridge" | "freezer"

export const BATCH_LOCATIONS: BatchLocation[] = ["freezer", "fridge"]

export const BATCH_LOCATION_LABELS: Record<BatchLocation, string> = {
  fridge: "Frigo",
  freezer: "Congélateur",
}

export interface BatchStockEntry {
  location: BatchLocation
  /** Nombre de plats (barquettes, boîtes…). */
  count: number
  /** Date de préparation, YYYY-MM-DD. */
  preparedAt: string
}

export interface BatchInfo {
  enabled: boolean
  /** Jours de conservation au frigo ; absent = non renseigné. */
  fridgeDays?: number
  /** Jours de conservation au congélateur ; absent = non renseigné. */
  freezerDays?: number
  stock: BatchStockEntry[]
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isBatchTag(tag: Pick<MealieTag, "name" | "slug">): boolean {
  return tag.slug === BATCH_TAG || tag.name.toLowerCase() === BATCH_TAG
}

export function isBatchRecipe(recipe: Pick<MealieRecipe, "tags"> | null | undefined): boolean {
  return (recipe?.tags ?? []).some(isBatchTag)
}

function parseDays(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function isLocation(value: unknown): value is BatchLocation {
  return value === "fridge" || value === "freezer"
}

/** Lit le stock JSON des extras ; ignore toute entrée mal formée. */
export function parseBatchStock(raw: string | undefined): BatchStockEntry[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const entries: BatchStockEntry[] = []
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue
    const { location, count, preparedAt } = item as Record<string, unknown>
    if (!isLocation(location) || typeof preparedAt !== "string" || !DATE_RE.test(preparedAt)) continue
    const n = typeof count === "number" ? Math.floor(count) : Number.NaN
    if (!(n > 0)) continue
    entries.push({ location, count: n, preparedAt })
  }
  return normalizeStock(entries)
}

/** Fusionne les doublons (même endroit, même date), retire les vides, trie du plus ancien au plus récent. */
export function normalizeStock(stock: BatchStockEntry[]): BatchStockEntry[] {
  const merged = new Map<string, BatchStockEntry>()
  for (const entry of stock) {
    if (entry.count <= 0) continue
    const key = `${entry.location}:${entry.preparedAt}`
    const existing = merged.get(key)
    if (existing) existing.count += entry.count
    else merged.set(key, { ...entry })
  }
  return [...merged.values()].sort((a, b) =>
    a.preparedAt.localeCompare(b.preparedAt)
    || BATCH_LOCATIONS.indexOf(a.location) - BATCH_LOCATIONS.indexOf(b.location),
  )
}

export function getBatchInfo(recipe: Pick<MealieRecipe, "tags" | "extras"> | null | undefined): BatchInfo {
  const extras = recipe?.extras ?? {}
  const info: BatchInfo = {
    enabled: isBatchRecipe(recipe),
    stock: parseBatchStock(extras[BATCH_EXTRAS.stock]),
  }
  const fridgeDays = parseDays(extras[BATCH_EXTRAS.fridgeDays])
  const freezerDays = parseDays(extras[BATCH_EXTRAS.freezerDays])
  if (fridgeDays) info.fridgeDays = fridgeDays
  if (freezerDays) info.freezerDays = freezerDays
  return info
}

/**
 * Extras batch à écrire (clés non renseignées omises). Mealie remplace l'objet
 * extras en entier : l'appelant part des extras actuels privés de
 * BATCH_EXTRA_KEYS, puis ajoute ceux-ci — une clé absente est ainsi effacée.
 */
export function batchInfoToExtras(info: BatchInfo): Record<string, string> {
  const stock = normalizeStock(info.stock)
  const extras: Record<string, string> = {}
  if (info.fridgeDays && info.fridgeDays > 0) extras[BATCH_EXTRAS.fridgeDays] = String(Math.round(info.fridgeDays))
  if (info.freezerDays && info.freezerDays > 0) extras[BATCH_EXTRAS.freezerDays] = String(Math.round(info.freezerDays))
  if (stock.length > 0) extras[BATCH_EXTRAS.stock] = JSON.stringify(stock)
  return extras
}

/** Extras de la recette sans aucune clé batch. */
export function withoutBatchExtras(extras: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(extras ?? {})) {
    if (!BATCH_EXTRA_KEYS.includes(key)) out[key] = value
  }
  return out
}

export function stockCount(stock: BatchStockEntry[], location?: BatchLocation): number {
  return stock
    .filter((e) => !location || e.location === location)
    .reduce((sum, e) => sum + e.count, 0)
}

/** Ajoute des plats au stock (fusionnés avec une entrée du même jour au même endroit). */
export function addToStock(stock: BatchStockEntry[], entry: BatchStockEntry): BatchStockEntry[] {
  return normalizeStock([...stock, entry])
}

/**
 * Retire un plat. Avec `preparedAt`, de cette préparation précise ; sinon la
 * plus ancienne à cet endroit. `taken` est null s'il n'y avait rien.
 */
export function takeFromStock(
  stock: BatchStockEntry[],
  location: BatchLocation,
  preparedAt?: string,
): { stock: BatchStockEntry[]; taken: BatchStockEntry | null } {
  const sorted = normalizeStock(stock)
  const target = sorted.find((e) => e.location === location && (!preparedAt || e.preparedAt === preparedAt))
  if (!target) return { stock: sorted, taken: null }
  const next = sorted.map((e) => (e === target ? { ...e, count: e.count - 1 } : e))
  return { stock: normalizeStock(next), taken: { ...target, count: 1 } }
}

/** Remet un plat en stock (repas déprogrammé). */
export function returnToStock(
  stock: BatchStockEntry[],
  location: BatchLocation,
  preparedAt: string,
): BatchStockEntry[] {
  return addToStock(stock, { location, preparedAt, count: 1 })
}

function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

export function addDaysToDate(date: string, days: number): string {
  const d = parseLocalDate(date)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

/** Nombre de jours (calendaires) de `from` à `to` ; négatif si `to` est passé. */
export function daysBetween(from: string, to: string): number {
  const ms = parseLocalDate(to).getTime() - parseLocalDate(from).getTime()
  return Math.round(ms / 86_400_000)
}

/** Date limite de consommation d'une entrée, ou null si la durée n'est pas renseignée. */
export function stockExpiry(entry: BatchStockEntry, info: Pick<BatchInfo, "fridgeDays" | "freezerDays">): string | null {
  const days = entry.location === "fridge" ? info.fridgeDays : info.freezerDays
  return days ? addDaysToDate(entry.preparedAt, days) : null
}

export type ExpiryStatus = "expired" | "soon" | "ok" | "unknown"

/** Frigo : alerte à 1 jour. Congélateur : alerte à 14 jours. */
export function expiryStatus(
  entry: BatchStockEntry,
  info: Pick<BatchInfo, "fridgeDays" | "freezerDays">,
  today: string,
): { status: ExpiryStatus; expiry: string | null; daysLeft: number | null } {
  const expiry = stockExpiry(entry, info)
  if (!expiry) return { status: "unknown", expiry: null, daysLeft: null }
  const daysLeft = daysBetween(today, expiry)
  const soonThreshold = entry.location === "fridge" ? 1 : 14
  const status: ExpiryStatus = daysLeft < 0 ? "expired" : daysLeft <= soonThreshold ? "soon" : "ok"
  return { status, expiry, daysLeft }
}

export function formatBatchDate(date: string): string {
  return parseLocalDate(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export function expiryLabel(daysLeft: number | null, expiry: string | null): string {
  if (daysLeft === null || !expiry) return "Durée de conservation non renseignée"
  if (daysLeft < 0) return `Périmé depuis le ${formatBatchDate(expiry)}`
  if (daysLeft === 0) return "À consommer aujourd'hui"
  if (daysLeft === 1) return "À consommer demain"
  return `À consommer avant le ${formatBatchDate(expiry)}`
}

/**
 * Rappel d'un repas planifié depuis le stock : un plat du congélateur doit être
 * sorti la veille. Null quand il n'y a rien à faire (frigo, repas passé ou lointain).
 */
export function thawReminder(location: BatchLocation, mealDate: string, today: string): string | null {
  if (location !== "freezer") return null
  const days = daysBetween(today, mealDate)
  if (days === 1) return "À sortir du congélateur aujourd'hui"
  if (days === 0) return "À décongeler — repas aujourd'hui"
  return null
}
