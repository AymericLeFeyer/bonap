import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Sparkles, Loader2, AlertCircle, CheckCircle2, XCircle,
  ChevronRight, ChevronLeft, Settings, Plus, Minus,
  ChefHat, CalendarDays, ExternalLink,
} from "lucide-react"
import { Button } from "./ui/button.tsx"
import { Badge } from "./ui/badge.tsx"
import { cn } from "../../lib/utils.ts"
import { llmChat } from "../../infrastructure/llm/LLMService.ts"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"
import { toDateStr, formatDayFr } from "../../shared/utils/date.ts"
import {
  getPlanningRangeUseCase,
  addMealUseCase,
  createRecipeUseCase,
  getRecipesUseCase,
} from "../../infrastructure/container.ts"
import { mealieApiClient } from "../../infrastructure/mealie/api/index.ts"
import { getIngressBasename } from "../../shared/utils/env.ts"
import { getCurrentSeason } from "../../shared/utils/season.ts"
import type { MealieRecipe, RecipeFormIngredient } from "../../shared/types/mealie.ts"

// ─── Constants ────────────────────────────────────────────────────────────────

const CRITERIA_CHIPS = [
  "Pas mangé depuis longtemps",
  "Facile à faire en restes",
  "Rapide (≤ 30 min)",
  "Léger",
  "Plat de saison",
  "Réconfortant",
  "Végétarien",
  "Nouveau dans la liste",
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExternalRecipe {
  name: string
  ingredients: string[]
  steps: string[]
  tags: string[]
  imageUrl: string
  marmitonUrl: string
  prepTime: string
  cookTime: string
  totalTime: string
  recipeYield?: string
}

interface MealIdea {
  id: number
  name: string
  reason: string
  accepted: boolean
  status: "pending" | "searching" | "importing" | "ok" | "not_found"
  slug?: string
  recipeId?: string
  slotLabel?: string
}

type PageStep = "form" | "generated" | "importing" | "done"

// ─── Marmiton helpers (inlined from ExploreRecipesPage) ───────────────────────

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#149;|&bull;/gi, "•")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&agrave;/gi, "à")
    .replace(/&acirc;/gi, "â")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&euml;/gi, "ë")
    .replace(/&icirc;/gi, "î")
    .replace(/&iuml;/gi, "ï")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&ugrave;/gi, "ù")
    .replace(/&ucirc;/gi, "û")
}

function normalizeRecipeName(name: string): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

async function findExistingRecipeByName(name: string): Promise<MealieRecipe | null> {
  const query = name.trim()
  if (!query) return null
  const normalizedTarget = normalizeRecipeName(query)
  const data = await mealieApiClient.get<{ items: MealieRecipe[] }>(
    `/api/recipes?search=${encodeURIComponent(query)}&page=1&perPage=24`,
  )
  const exact = (data.items ?? []).find((item) => normalizeRecipeName(item.name) === normalizedTarget)
  return exact ?? null
}

async function searchMarmiton(query: string, page: number): Promise<{ results: ExternalRecipe[]; hasMore: boolean }> {
  const base = `${getIngressBasename()}/api/bonap/marmiton`
  const res = await fetch(`${base}/search?q=${encodeURIComponent(query)}&limit=12&page=${page}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error ?? `Erreur ${res.status}`)
  }
  const data = await res.json() as { results: ExternalRecipe[]; hasMore: boolean }
  return data
}

async function fetchAndParseRecipeUrl(url: string): Promise<ExternalRecipe> {
  const base = `${getIngressBasename()}/api/bonap/marmiton`
  const llmConfig = llmConfigService.load()
  const params = new URLSearchParams({ url })
  if (llmConfig.provider === "ollama" && llmConfig.ollamaBaseUrl) {
    params.set("ollamaUrl", llmConfig.ollamaBaseUrl)
    if (llmConfig.model) params.set("ollamaModel", llmConfig.model)
  }
  const res = await fetch(`${base}/fetch-recipe?${params.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error((err.error && err.error.trim()) || `Erreur ${res.status}`)
  }
  const data = await res.json() as { schema: (ExternalRecipe & { marmitonUrl?: string }) | null; text: string }
  if (data.schema && data.schema.name) return { ...data.schema, marmitonUrl: url }
  if (!llmConfigService.isConfigured()) {
    throw new Error("Aucune donnée structurée trouvée sur cette page. Configurez une IA dans les Paramètres.")
  }
  const system = `Tu es un assistant culinaire. Extrais les informations de cette page web de recette.
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown ni explication) de cette forme exacte:
{"name":"Nom de la recette","ingredients":["ingrédient 1","ingrédient 2"],"steps":["Etape 1...","Etape 2..."],"tags":["tag1"],"imageUrl":"","prepTime":"","cookTime":"","totalTime":"","recipeYield":""}
Les durées au format "X min" ou "Xh" ou "XhXX". Si absent, laisse vide ou tableau vide.`
  const raw = await llmChat(system, data.text)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("Impossible d'extraire la recette depuis la page.")
  const parsed = JSON.parse(match[0]) as Partial<ExternalRecipe>
  return {
    name: parsed.name ?? "",
    ingredients: parsed.ingredients ?? [],
    steps: parsed.steps ?? [],
    tags: parsed.tags ?? [],
    imageUrl: parsed.imageUrl ?? "",
    marmitonUrl: url,
    prepTime: parsed.prepTime ?? "",
    cookTime: parsed.cookTime ?? "",
    totalTime: parsed.totalTime ?? "",
    recipeYield: parsed.recipeYield ?? "",
  }
}

function parseIngredientRegex(raw: string): RecipeFormIngredient {
  const cleaned = decodeHtmlEntities(raw)
    .replace(/^\s*(?:•|&#149;|&bull;)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
  const normalizedFractions = cleaned
    .replace(/\u00BC/g, "1/4")
    .replace(/\u00BD/g, "1/2")
    .replace(/\u00BE/g, "3/4")
  const qtyMatch = normalizedFractions.match(/^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(.*)$/)
  if (!qtyMatch) return { quantity: "", unit: "", food: cleaned, note: "" }
  const quantity = qtyMatch[1].replace(",", ".")
  let rest = (qtyMatch[2] ?? "").trim()
  rest = rest.replace(/^(?:de\s+|d['’]\s*)/i, "")
  const unitRegexes: Array<{ re: RegExp; unit: string }> = [
    { re: /^cuill(?:e|é|è)r(?:e|é|è)e?s?\s+(?:a|à)\s+soupes?(?=$|\s|[),;:.])/i, unit: "cuillère à soupe" },
    { re: /^cuill(?:e|é|è)r(?:e|é|è)e?s?\s+(?:a|à)\s+caf(?:e|é)s?(?=$|\s|[),;:.])/i, unit: "cuillère à café" },
    { re: /^c\.?(?:\s*)(?:a|à)\.?(?:\s*)s(?:oupe)?\.?(?=$|\s|[),;:.])/i, unit: "cuillère à soupe" },
    { re: /^c\.?(?:\s*)(?:a|à)\.?(?:\s*)c(?:af(?:e|é))?\.?(?=$|\s|[),;:.])/i, unit: "cuillère à café" },
    { re: /^c\.?(?:\s*)a\.?(?:\s*)s\.?(?=$|\s|[),;:.])/i, unit: "cuillère à soupe" },
    { re: /^c\.?(?:\s*)a\.?(?:\s*)c\.?(?=$|\s|[),;:.])/i, unit: "cuillère à café" },
    { re: /^cs\b/i, unit: "cuillère à soupe" },
    { re: /^cc\b/i, unit: "cuillère à café" },
    { re: /^gousses?\b/i, unit: "gousse" },
    { re: /^pinc(?:e|é)es?(?=$|\s|[),;:.])/i, unit: "pincée" },
    { re: /^(kg|g|mg|l|cl|ml)\b/i, unit: "" },
  ]
  let unit = ""
  for (const { re, unit: normalized } of unitRegexes) {
    const m = rest.match(re)
    if (!m) continue
    unit = normalized || m[1].toLowerCase()
    rest = rest.slice(m[0].length).trim()
    break
  }
  rest = rest
    .replace(/^(?:de|du|des|la|le)\s+/i, "")
    .replace(/^d['’]\s*/i, "")
    .replace(/^l['’]\s*/i, "")
    .trim()
  return { quantity, unit, food: rest || cleaned, note: "" }
}

function shouldRefineWithLLM(raw: string, parsed: RecipeFormIngredient): boolean {
  const cleaned = raw
    .replace(/^\s*(?:•|&#149;|&bull;)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
  if (/^(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|demi|quart)\b/i.test(cleaned)) return true
  if (parsed.quantity && !parsed.unit && /\b(cuiller|c\.?\s*a\.?\s*[sc]|gousse|pinc[eé]e|kg|g|mg|ml|cl|l)\b/i.test(cleaned)) return true
  if (/^\d/.test(cleaned) && !parsed.food) return true
  return false
}

async function parseIngredientsWithAI(ingredients: string[]): Promise<RecipeFormIngredient[]> {
  const localParsed = ingredients.map(parseIngredientRegex)
  if (!llmConfigService.isConfigured()) return localParsed
  const toRefine: Array<{ index: number; raw: string }> = ingredients
    .map((raw, index) => ({ raw, index }))
    .filter(({ raw, index }) => shouldRefineWithLLM(raw, localParsed[index]))
  if (toRefine.length === 0) return localParsed
  try {
    const system = `Tu es un assistant culinaire. Pour chaque ingrédient reçu, extrais:
- quantity: le nombre qui représente une quantité réelle, ou "" si absent
- unit: l'unité de mesure, ou "" si absente
- food: le nom complet de l'ingrédient sans quantité ni unité
RÈGLE CRITIQUE: un nombre peut faire partie du nom de l'ingrédient et ne doit PAS être mis dans quantity.
Exemples: "poivre 5 baies" → {"quantity":"","unit":"","food":"poivre 5 baies"}
"200g de farine" → {"quantity":"200","unit":"g","food":"farine"}
"4 cuisses de poulet" → {"quantity":"4","unit":"","food":"cuisses de poulet"}
Réponds UNIQUEMENT avec un tableau JSON valide: [{"quantity":"...","unit":"...","food":"..."}]`
    const raw = await llmChat(system, JSON.stringify(toRefine.map((x) => x.raw)))
    const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/)
    if (!match) throw new Error("No JSON array in response")
    const parsed = JSON.parse(match[0]) as Array<{ quantity?: string; unit?: string; food?: string }>
    if (!Array.isArray(parsed) || parsed.length !== toRefine.length) throw new Error("Unexpected response length")
    const merged = [...localParsed]
    parsed.forEach((p, i) => {
      const targetIndex = toRefine[i].index
      const food = String(p.food ?? "").trim()
      if (!food) return
      merged[targetIndex] = { quantity: String(p.quantity ?? "").trim(), unit: String(p.unit ?? "").trim(), food, note: "" }
    })
    return merged
  } catch {
    return localParsed
  }
}

function normalizeMarmitonImageUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!/assets\.afcdn\.com$/i.test(parsed.hostname)) return url
    parsed.pathname = parsed.pathname.replace(
      /(\/\d+)_originc[^/.]*(\.(?:jpe?g|png|webp))?$/i,
      (_m, id, ext) => `${id}_origin${ext || ".jpg"}`,
    )
    return parsed.toString()
  } catch {
    return url
  }
}

function resolveRecipeImageUrl(imageUrl: string, pageUrl?: string): string {
  const src = (imageUrl ?? "").trim()
  if (!src) return ""
  if (/^https?:\/\//i.test(src)) return normalizeMarmitonImageUrl(src)
  if (src.startsWith("//")) return `https:${src}`
  if (!pageUrl) return src
  try {
    return normalizeMarmitonImageUrl(new URL(src, pageUrl).toString())
  } catch {
    return src
  }
}

function buildMarmitonProxyImageUrl(imageUrl: string, pageUrl?: string): string {
  const normalized = resolveRecipeImageUrl(imageUrl, pageUrl)
  if (!normalized) return ""
  return `${getIngressBasename()}/api/bonap/marmiton/image?url=${encodeURIComponent(normalized)}`
}

function buildMarmitonImageCandidates(imageUrl: string, pageUrl?: string): string[] {
  const first = resolveRecipeImageUrl(imageUrl, pageUrl)
  if (!first) return []
  const candidates = [first]
  const originFallback = first.replace(
    /(\/\d+)_w\d+h\d+c[^/.]*(\.(?:jpe?g|png|webp))$/i,
    (_m, id, ext) => `${id}_origin${ext || ".jpg"}`,
  )
  if (originFallback !== first) candidates.push(originFallback)
  return Array.from(new Set(candidates))
}

function inferImageExtension(contentType: string): string {
  const type = contentType.split(";")[0].trim().toLowerCase()
  switch (type) {
    case "image/jpeg": return "jpg"
    case "image/png": return "png"
    case "image/webp": return "webp"
    case "image/avif": return "avif"
    case "image/gif": return "gif"
    default: return "jpg"
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchMarmitonImageBlob(imageUrl: string, pageUrl?: string): Promise<Blob> {
  const candidates = buildMarmitonImageCandidates(imageUrl, pageUrl)
  if (!candidates.length) throw new Error("Aucune URL d'image")
  let lastError: Error | null = null
  for (const candidate of candidates) {
    const proxyImageUrl = buildMarmitonProxyImageUrl(candidate)
    if (!proxyImageUrl) continue
    try {
      const imgRes = await fetch(proxyImageUrl)
      if (!imgRes.ok) { lastError = new Error(`Téléchargement image impossible (${imgRes.status})`); continue }
      const blob = await imgRes.blob()
      if (!blob.size) { lastError = new Error("Image vide"); continue }
      return blob
    } catch (e) { lastError = e instanceof Error ? e : new Error("Erreur image") }
  }
  throw lastError ?? new Error("Impossible de télécharger l'image")
}

async function uploadImageWithRetry(slug: string, file: File): Promise<void> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await mealieApiClient.uploadImage(slug, file)
      const refreshed = await mealieApiClient.get<MealieRecipe>(`/api/recipes/${slug}`)
      if (refreshed.image) return
      throw new Error("Image non attachée après upload")
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Erreur upload image")
      if (attempt < 3) await sleep(300 * attempt)
    }
  }
  throw lastError ?? new Error("Upload image impossible")
}

async function uploadRecipeImageFromMarmiton(slug: string, imageUrl: string, pageUrl?: string): Promise<void> {
  const blob = await fetchMarmitonImageBlob(imageUrl, pageUrl)
  const ext = inferImageExtension(blob.type || "image/jpeg")
  const mime = blob.type?.startsWith("image/") ? blob.type : (ext === "jpg" ? "image/jpeg" : `image/${ext}`)
  const file = new File([blob], `recipe.${ext}`, { type: mime })
  await uploadImageWithRetry(slug, file)
}

async function uploadRecipeImageWithFallback(slug: string, recipe: ExternalRecipe): Promise<void> {
  const firstImage = (recipe.imageUrl ?? "").trim()
  if (firstImage) {
    try { await uploadRecipeImageFromMarmiton(slug, firstImage, recipe.marmitonUrl); return } catch { /* fallback to refresh below */ }
  }
  if (!recipe.marmitonUrl) throw new Error("Aucune URL Marmiton disponible pour récupérer l'image")
  const refreshed = await fetchAndParseRecipeUrl(recipe.marmitonUrl)
  if (!refreshed.imageUrl) throw new Error("Image introuvable depuis la page recette")
  await uploadRecipeImageFromMarmiton(slug, refreshed.imageUrl, recipe.marmitonUrl)
}

// ─── Parse LLM response ───────────────────────────────────────────────────────

function parseResponse(text: string): Array<{ name: string; reason: string }> {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim()
  const start = cleaned.indexOf("[")
  const end = cleaned.lastIndexOf("]")
  if (start === -1 || end === -1) throw new Error("Réponse JSON introuvable")
  return JSON.parse(cleaned.slice(start, end + 1))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeeklyMealGenerator() {
  const [step, setStep] = useState<PageStep>("form")
  const [nbMeals, setNbMeals] = useState(7)
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([])
  const [freeText, setFreeText] = useState("")
  const [meals, setMeals] = useState<MealIdea[]>([])
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isConfigured = llmConfigService.isConfigured()

  const toggleCriteria = (c: string) => {
    setSelectedCriteria((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  // ── Build prompt ──────────────────────────────────────────────────────────

  const buildPrompt = (blacklist: string[]) => {
    const criteriaText = [
      ...selectedCriteria,
      ...(freeText.trim() ? [freeText.trim()] : []),
    ].join(", ")
    const blacklistText = blacklist.length
      ? `\nNE propose AUCUN de ces plats déjà dans mon répertoire :\n${blacklist.map((n) => `  - ${n}`).join("\n")}`
      : ""
    const season = getCurrentSeason()
    const seasonLabels: Record<string, string> = { printemps: "printemps", ete: "été", automne: "automne", hiver: "hiver" }
    const system = `Tu es un chef cuisinier. Génère une liste de ${nbMeals} plats réels et variés
pour une semaine de repas. Évite les plats trop classiques et redondants.
Chaque plat doit pouvoir être trouvé sur un site de recettes comme Marmiton.
Tiens compte de la saison en cours : ${seasonLabels[season] ?? season}.${blacklistText}
Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans explication, sans texte avant ou après.
Format exact : [{"name":"Nom du plat","reason":"Pourquoi ce plat correspond aux critères"}]
- ${nbMeals} éléments exactement
- Uniquement des plats réels
- "reason" : une phrase courte en français expliquant pourquoi ce plat correspond aux critères`
    return { system, user: `Critères : ${criteriaText || "Aucun critère particulier, surprise-moi"}` }
  }

  // ── Step 1: Generate ──────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const existing = await getRecipesUseCase.execute(1, 200)
      const existingNames = (existing.items ?? []).map((r) => r.name).filter(Boolean)
      const { system, user } = buildPrompt(existingNames)
      const response = await llmChat(system, user)
      const parsed = parseResponse(response)
      const valid = parsed.filter((s) => s.name.trim()).slice(0, nbMeals)
      setMeals(valid.map((m, i) => ({ id: i, name: m.name, reason: m.reason, accepted: true, status: "pending" })))
      setStep("generated")
      if (valid.length === 0) setError("Aucun nom de plat valide reçu. Réessaie.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'appel IA")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Edit / validate ───────────────────────────────────────────────

  const updateMealName = (id: number, name: string) => {
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)))
  }

  const toggleAccepted = (id: number) => {
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, accepted: !m.accepted } : m)))
  }

  // ── Step 3: Import from Marmiton + auto-plan ──────────────────────────────

  const addDays = (date: Date, days: number): Date => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    result.setHours(0, 0, 0, 0)
    return result
  }

  const autoSlotPlanning = async (imported: MealIdea[]) => {
    const today = new Date()
    const start = toDateStr(today)
    const end = toDateStr(addDays(today, 13))
    const existingPlans = await getPlanningRangeUseCase.execute(start, end)

    const slots: Array<{ date: string; entryType: "lunch" | "dinner" }> = []
    for (let i = 0; i < 14; i++) {
      const d = toDateStr(addDays(today, i))
      if (!existingPlans.some((m) => m.date === d && m.entryType === "lunch")) {
        slots.push({ date: d, entryType: "lunch" })
      }
      if (!existingPlans.some((m) => m.date === d && m.entryType === "dinner")) {
        slots.push({ date: d, entryType: "dinner" })
      }
    }

    const slotUpdates: Array<{ id: number; label: string }> = []

    for (let i = 0; i < imported.length; i++) {
      const meal = imported[i]
      const slot = slots[i]
      if (!slot || !meal.recipeId) continue
      try {
        await addMealUseCase.execute(slot.date, slot.entryType, meal.recipeId)
        const dayLabel = formatDayFr(slot.date)
        const typeLabel = slot.entryType === "lunch" ? "déjeuner" : "dîner"
        slotUpdates.push({ id: meal.id, label: `${dayLabel} (${typeLabel})` })
      } catch {
        /* skip */
      }
    }

    if (slotUpdates.length > 0) {
      setMeals((prev) => prev.map((m) => {
        const update = slotUpdates.find((s) => s.id === m.id)
        return update ? { ...m, slotLabel: update.label } : m
      }))
    }
  }

  const handleImportAndPlan = async () => {
    const accepted = meals.filter((m) => m.accepted)
    if (accepted.length === 0) return

    setStep("importing")
    setError(null)
    setImportProgress({ current: 0, total: accepted.length })

    const imported: MealIdea[] = []

    for (const meal of accepted) {
      setMeals((prev) => prev.map((m) => (m.id === meal.id ? { ...m, status: "searching" } : m)))
      setImportProgress((prev) => ({ ...prev, current: prev.current + 1 }))

      try {
        const { results } = await searchMarmiton(meal.name, 1)
        if (results.length === 0) {
          setMeals((prev) => prev.map((m) => (m.id === meal.id ? { ...m, status: "not_found" } : m)))
          continue
        }

        const marmitonRecipe = results[0]
        const existing = await findExistingRecipeByName(marmitonRecipe.name)

        let slug: string
        let recipeId: string

        if (existing) {
          slug = existing.slug
          recipeId = existing.id
        } else {
          setMeals((prev) => prev.map((m) => (m.id === meal.id ? { ...m, status: "importing" } : m)))
          const fullRecipe = await fetchAndParseRecipeUrl(marmitonRecipe.marmitonUrl)

          const created = await createRecipeUseCase.execute({
            name: fullRecipe.name,
            description: fullRecipe.tags.join(", "),
            prepTime: fullRecipe.prepTime,
            performTime: fullRecipe.cookTime,
            totalTime: fullRecipe.totalTime,
            recipeYield: fullRecipe.recipeYield,
            recipeIngredient: await parseIngredientsWithAI(fullRecipe.ingredients),
            recipeInstructions: fullRecipe.steps.map((text) => ({ text })),
            seasons: [],
            categories: [],
            tags: [],
          })

          slug = created.slug
          recipeId = created.id

          if (fullRecipe.imageUrl) {
            try { await uploadRecipeImageWithFallback(slug, fullRecipe) } catch { /* optional */ }
          }
        }

        setMeals((prev) => prev.map((m) => (m.id === meal.id ? { ...m, status: "ok", slug, recipeId } : m)))
        imported.push({ ...meal, status: "ok", slug, recipeId })
      } catch {
        setMeals((prev) => prev.map((m) => (m.id === meal.id ? { ...m, status: "not_found" } : m)))
      }
    }

    await autoSlotPlanning(imported)
    setStep("done")
  }

  const acceptedCount = meals.filter((m) => m.accepted).length
  const okCount = meals.filter((m) => m.status === "ok").length

  return (
    <div className="space-y-4 rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" />
        Découvrir de nouvelles recettes
      </div>
      <p className="text-xs text-muted-foreground">
        L'IA trouve des plats que vous n'avez pas déjà, les importe depuis Marmiton et les ajoute au planning.
      </p>

      {/* ── Step: Form ── */}
      {step === "form" && (
        <div className="space-y-4">
          {!isConfigured && (
            <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[oklch(0.78_0.08_80)] bg-[oklch(0.97_0.04_80)] dark:border-[oklch(0.32_0.06_70)] dark:bg-[oklch(0.22_0.04_70)] p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.52_0.14_60)] dark:text-[oklch(0.72_0.14_72)]" />
              <div className="flex-1 text-sm text-[oklch(0.38_0.10_55)] dark:text-[oklch(0.80_0.08_72)]">
                <strong>Aucun fournisseur IA configuré.</strong> Configurez une clé API dans les Paramètres.
              </div>
              <Link
                to="/settings"
                className="flex items-center gap-1 text-sm font-semibold text-[oklch(0.42_0.12_55)] hover:text-[oklch(0.28_0.12_50)] dark:text-[oklch(0.72_0.12_72)] transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Paramètres
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold">Nombre de repas</label>
            <div className="flex items-center gap-2 mt-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8"
                onClick={() => setNbMeals((p) => Math.max(1, p - 1))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{nbMeals}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8"
                onClick={() => setNbMeals((p) => Math.min(14, p + 1))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Critères</p>
            <div className="flex flex-wrap gap-2">
              {CRITERIA_CHIPS.map((c) => (
                <Badge
                  key={c}
                  variant={selectedCriteria.includes(c) ? "default" : "outline"}
                  className="cursor-pointer select-none transition-colors"
                  onClick={() => toggleCriteria(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Ou décrivez vos envies</label>
            <textarea
              placeholder="Ex : des plats rapides, peu d'ingrédients, cuisine du monde…"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={2}
              className={cn(
                "flex w-full rounded-[var(--radius-lg)] border border-input bg-card",
                "px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60",
                "shadow-[inset_0_1px_2px_oklch(0_0_0/0.04)]",
                "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/30",
                "resize-none transition-[border-color,box-shadow] duration-150",
              )}
            />
          </div>

          <Button onClick={handleGenerate} disabled={loading || !isConfigured} className="gap-2">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Recherche de nouvelles recettes…</>
            ) : (
              <><Sparkles className="h-4 w-4" />Trouver {nbMeals} nouvelles recettes</>
            )}
          </Button>
        </div>
      )}

      {/* ── Step: Generated (edit/validate) ── */}
      {step === "generated" && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground/50">
            {meals.length} nouvelle{meals.length > 1 ? "s" : ""} recette{meals.length > 1 ? "s" : ""} proposée{meals.length > 1 ? "s" : ""}
            {acceptedCount > 0 && ` — ${acceptedCount} à conserver`}
          </p>

          {meals.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-[var(--radius-xl)] border bg-card shadow-subtle p-3 transition-all duration-150",
                !m.accepted && "opacity-50",
                m.accepted && "border-primary/20",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleAccepted(m.id)}
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                    m.accepted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30",
                  )}
                >
                  {m.accepted && <CheckCircle2 className="h-3 w-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => updateMealName(m.id, e.target.value)}
                    className={cn(
                      "w-full bg-transparent text-sm font-semibold",
                      "border-b border-transparent hover:border-border focus:border-primary",
                      "outline-none transition-colors",
                    )}
                  />
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{m.reason}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setStep("form")} className="gap-1.5">
              <ChevronLeft className="h-3.5 w-3.5" />
              Modifier les critères
            </Button>
            <Button onClick={handleImportAndPlan} disabled={acceptedCount === 0} className="gap-1.5">
              <ChefHat className="h-4 w-4" />
              Importer et planifier {acceptedCount} nouvelle{acceptedCount > 1 ? "s" : ""} recette{acceptedCount > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Importing progress ── */}
      {step === "importing" && (
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="text-sm font-semibold">
              Import en cours ({importProgress.current}/{importProgress.total})
            </div>
          </div>

          <div className="space-y-2">
            {meals.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                {!m.accepted && (
                  <span className="text-muted-foreground/50 line-through">{m.name}</span>
                )}
                {m.accepted && m.status === "pending" && (
                  <><span className="text-muted-foreground/50">En attente…</span><span>{m.name}</span></>
                )}
                {(m.status === "searching" || m.status === "importing") && (
                  <><Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" /><span>{m.name}</span></>
                )}
                {m.status === "ok" && (
                  <><CheckCircle2 className="h-3.5 w-3.5 text-[oklch(0.45_0.16_145)] shrink-0" /><span className="text-[oklch(0.45_0.16_145)]">{m.name}</span></>
                )}
                {m.status === "not_found" && (
                  <><XCircle className="h-3.5 w-3.5 text-destructive shrink-0" /><span className="text-destructive">{m.name}</span></>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === "done" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[oklch(0.45_0.16_145)]">
            <CheckCircle2 className="h-5 w-5" />
            {okCount} nouvelle{okCount > 1 ? "s" : ""} recette{okCount > 1 ? "s" : ""} importée{okCount > 1 ? "s" : ""} et planifiée{okCount > 1 ? "s" : ""}
          </div>

          <div className="space-y-2">
            {meals.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border p-3",
                  m.status === "ok" ? "border-border/40 bg-muted/20" : "border-destructive/20 bg-destructive/5",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {m.status === "ok" && <CheckCircle2 className="h-4 w-4 shrink-0 text-[oklch(0.45_0.16_145)]" />}
                  {m.status === "not_found" && <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                  {!m.accepted && <span className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center"><XCircle className="h-3 w-3 text-muted-foreground/30" /></span>}
                  <div className="min-w-0">
                    <span className={cn(
                      "text-sm font-medium",
                      m.status === "not_found" && "text-destructive line-through",
                      !m.accepted && "text-muted-foreground/50 line-through",
                    )}>
                      {m.name}
                    </span>
                    {m.slotLabel && (
                      <p className="text-[11px] text-muted-foreground">{m.slotLabel}</p>
                    )}
                    {m.status === "not_found" && (
                      <p className="text-[11px] text-destructive">Non trouvé sur Marmiton</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.status === "ok" && m.slug && (
                    <Link to={`/recipes/${m.slug}`} className="text-xs text-primary hover:underline">
                      Voir
                    </Link>
                  )}
                  {m.status === "not_found" && (
                    <a
                      href={`https://www.marmiton.org/recherche?q=${encodeURIComponent(m.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      Chercher <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={() => { setStep("form"); setMeals([]); setError(null) }} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Nouvelles idées
            </Button>
            <Link to="/planning">
              <Button variant="outline" className="gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Voir le planning
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
