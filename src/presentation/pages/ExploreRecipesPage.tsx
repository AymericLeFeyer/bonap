import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, Loader2, ExternalLink, ChefHat, Clock, CheckCircle2, AlertCircle, Plus, ChevronLeft, ChevronRight, Link2 } from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { Badge } from "../components/ui/badge.tsx"
import { cn } from "../../lib/utils.ts"
import { getIngressBasename } from "../../shared/utils/env.ts"
import { createRecipeUseCase } from "../../infrastructure/container.ts"
import { mealieApiClient } from "../../infrastructure/mealie/api/index.ts"
import { llmChat } from "../../infrastructure/llm/LLMService.ts"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"
import type { RecipeFormIngredient, MealieRecipe } from "../../shared/types/mealie.ts"

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

type ImportStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ok'; slug: string }
  | { state: 'error'; message: string }

function resolveRecipeImageUrl(imageUrl: string, pageUrl?: string): string {
  const src = (imageUrl ?? '').trim()
  if (!src) return ''
  if (/^https?:\/\//i.test(src)) {
    return normalizeMarmitonImageUrl(src)
  }
  if (src.startsWith('//')) return `https:${src}`
  if (!pageUrl) return src
  try {
    return normalizeMarmitonImageUrl(new URL(src, pageUrl).toString())
  } catch {
    return src
  }
}

function normalizeMarmitonImageUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (!/assets\.afcdn\.com$/i.test(parsed.hostname)) return url

    // Old Marmiton/AFCDN variants like "_origincxt...jpg" are often dead.
    // Rewriting to the stable "_origin.jpg" fixes most 404s.
    parsed.pathname = parsed.pathname.replace(
      /(\/\d+)_originc[^/.]*(\.(?:jpe?g|png|webp))?$/i,
      (_m, id, ext) => `${id}_origin${ext || '.jpg'}`,
    )
    return parsed.toString()
  } catch {
    return url
  }
}

function buildMarmitonProxyImageUrl(imageUrl: string, pageUrl?: string): string {
  const normalized = resolveRecipeImageUrl(imageUrl, pageUrl)
  if (!normalized) return ''
  const base = `${getIngressBasename()}/api/marmiton`
  return `${base}/image?url=${encodeURIComponent(normalized)}`
}

function inferImageExtension(contentType: string): string {
  const type = contentType.split(';')[0].trim().toLowerCase()
  switch (type) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/avif':
      return 'avif'
    case 'image/gif':
      return 'gif'
    default:
      return 'jpg'
  }
}

function normalizeRecipeName(name: string): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function buildMarmitonImageCandidates(imageUrl: string, pageUrl?: string): string[] {
  const first = resolveRecipeImageUrl(imageUrl, pageUrl)
  if (!first) return []

  const candidates = [first]
  // Some AFCDN variants are flaky; keep an explicit origin fallback.
  const originFallback = first.replace(
    /(\/\d+)_w\d+h\d+c[^/.]*(\.(?:jpe?g|png|webp))$/i,
    (_m, id, ext) => `${id}_origin${ext || '.jpg'}`,
  )
  if (originFallback !== first) candidates.push(originFallback)

  return Array.from(new Set(candidates))
}

async function fetchMarmitonImageBlob(imageUrl: string, pageUrl?: string): Promise<Blob> {
  const candidates = buildMarmitonImageCandidates(imageUrl, pageUrl)
  if (!candidates.length) throw new Error('Aucune URL d\'image')

  let lastError: Error | null = null
  for (const candidate of candidates) {
    const proxyImageUrl = buildMarmitonProxyImageUrl(candidate)
    if (!proxyImageUrl) continue
    try {
      const imgRes = await fetch(proxyImageUrl)
      if (!imgRes.ok) {
        lastError = new Error(`Téléchargement image impossible (${imgRes.status})`)
        continue
      }
      const blob = await imgRes.blob()
      if (!blob.size) {
        lastError = new Error('Image vide')
        continue
      }
      return blob
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Erreur image')
    }
  }

  throw lastError ?? new Error('Impossible de télécharger l\'image')
}

async function uploadImageWithRetry(slug: string, file: File): Promise<void> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await mealieApiClient.uploadImage(slug, file)
      // Ensure image is actually attached before considering success.
      const refreshed = await mealieApiClient.get<MealieRecipe>(`/api/recipes/${slug}`)
      if (refreshed.image) return
      throw new Error('Image non attachée après upload')
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Erreur upload image')
      if (attempt < 3) {
        await sleep(300 * attempt)
      }
    }
  }
  throw lastError ?? new Error('Upload image impossible')
}

async function uploadRecipeImageFromMarmiton(slug: string, imageUrl: string, pageUrl?: string): Promise<void> {
  const blob = await fetchMarmitonImageBlob(imageUrl, pageUrl)

  const ext = inferImageExtension(blob.type || 'image/jpeg')
  const mime = blob.type?.startsWith('image/') ? blob.type : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`)
  const file = new File([blob], `recipe.${ext}`, { type: mime })
  await uploadImageWithRetry(slug, file)
}

async function uploadRecipeImageWithFallback(slug: string, recipe: ExternalRecipe): Promise<void> {
  const firstImage = (recipe.imageUrl ?? '').trim()
  if (firstImage) {
    try {
      await uploadRecipeImageFromMarmiton(slug, firstImage, recipe.marmitonUrl)
      return
    } catch {
      // Fallback below: refresh from recipe page data.
    }
  }

  if (!recipe.marmitonUrl) {
    throw new Error('Aucune URL Marmiton disponible pour récupérer l\'image')
  }

  const refreshed = await fetchAndParseRecipeUrl(recipe.marmitonUrl)
  if (!refreshed.imageUrl) {
    throw new Error('Image introuvable depuis la page recette')
  }

  await uploadRecipeImageFromMarmiton(slug, refreshed.imageUrl, recipe.marmitonUrl)
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#149;|&bull;/gi, '•')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&agrave;/gi, 'à')
    .replace(/&acirc;/gi, 'â')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&eacute;/gi, 'é')
    .replace(/&egrave;/gi, 'è')
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&euml;/gi, 'ë')
    .replace(/&icirc;/gi, 'î')
    .replace(/&iuml;/gi, 'ï')
    .replace(/&ocirc;/gi, 'ô')
    .replace(/&ugrave;/gi, 'ù')
    .replace(/&ucirc;/gi, 'û')
}

// ─── Ingredient parser ────────────────────────────────────────────────────────

// Fallback regex: "4 cuisses de poulet" → { quantity: "4", unit: "", food: "cuisses de poulet" }
function parseIngredientRegex(raw: string): RecipeFormIngredient {
  const cleaned = decodeHtmlEntities(raw)
    .replace(/^\s*(?:•|&#149;|&bull;)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  const normalizedFractions = cleaned
    .replace(/\u00BC/g, '1/4')
    .replace(/\u00BD/g, '1/2')
    .replace(/\u00BE/g, '3/4')

  // Extract numeric quantity at the beginning: 600, 1/2, 1,5, 1.5
  const qtyMatch = normalizedFractions.match(/^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(.*)$/)
  if (!qtyMatch) {
    return { quantity: '', unit: '', food: cleaned, note: '' }
  }

  const quantity = qtyMatch[1].replace(',', '.')
  let rest = (qtyMatch[2] ?? '').trim()

  // Common in French recipes: "1/2 de cuillerée à café ..."
  // Remove the linker before unit detection.
  rest = rest.replace(/^(?:de\s+|d['’]\s*)/i, '')

  // Common French cooking units (with plural variants)
  const unitRegexes: Array<{ re: RegExp; unit: string }> = [
    { re: /^cuill(?:e|é|è)r(?:e|é|è)e?s?\s+(?:a|à)\s+soupes?(?=$|\s|[),;:.])/i, unit: 'cuillère à soupe' },
    { re: /^cuill(?:e|é|è)r(?:e|é|è)e?s?\s+(?:a|à)\s+caf(?:e|é)s?(?=$|\s|[),;:.])/i, unit: 'cuillère à café' },
    { re: /^c\.?(?:\s*)(?:a|à)\.?(?:\s*)s(?:oupe)?\.?(?=$|\s|[),;:.])/i, unit: 'cuillère à soupe' },
    { re: /^c\.?(?:\s*)(?:a|à)\.?(?:\s*)c(?:af(?:e|é))?\.?(?=$|\s|[),;:.])/i, unit: 'cuillère à café' },
    { re: /^c\.?(?:\s*)a\.?(?:\s*)s\.?(?=$|\s|[),;:.])/i, unit: 'cuillère à soupe' },
    { re: /^c\.?(?:\s*)a\.?(?:\s*)c\.?(?=$|\s|[),;:.])/i, unit: 'cuillère à café' },
    { re: /^cs\b/i, unit: 'cuillère à soupe' },
    { re: /^cc\b/i, unit: 'cuillère à café' },
    { re: /^gousses?\b/i, unit: 'gousse' },
    { re: /^pinc(?:e|é)es?(?=$|\s|[),;:.])/i, unit: 'pincée' },
    { re: /^(kg|g|mg|l|cl|ml)\b/i, unit: '' },
  ]

  let unit = ''
  for (const { re, unit: normalized } of unitRegexes) {
    const m = rest.match(re)
    if (!m) continue
    unit = normalized || m[1].toLowerCase()
    rest = rest.slice(m[0].length).trim()
    break
  }

  // Remove French connectors before ingredient name: de, d', du, des, la, le, l'
  rest = rest
    .replace(/^(?:de|du|des|la|le)\s+/i, '')
    .replace(/^d['’]\s*/i, '')
    .replace(/^l['’]\s*/i, '')
    .trim()

  return {
    quantity,
    unit,
    food: rest || cleaned,
    note: '',
  }
}

function shouldRefineWithLLM(raw: string, parsed: RecipeFormIngredient): boolean {
  const cleaned = raw
    .replace(/^\s*(?:•|&#149;|&bull;)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Starts with a written number that regex parser does not normalize well.
  if (/^(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|demi|quart)\b/i.test(cleaned)) {
    return true
  }

  // Quantity detected but unit likely missing while unit-like keywords are present.
  if (parsed.quantity && !parsed.unit && /\b(cuiller|c\.?\s*a\.?\s*[sc]|gousse|pinc[eé]e|kg|g|mg|ml|cl|l)\b/i.test(cleaned)) {
    return true
  }

  // Still starts with a digit but parser did not extract a valid ingredient name.
  if (/^\d/.test(cleaned) && !parsed.food) {
    return true
  }

  return false
}

// Parse all ingredients in one LLM call. Falls back to regex if LLM is unavailable or fails.
async function parseIngredientsWithAI(ingredients: string[]): Promise<RecipeFormIngredient[]> {
  const localParsed = ingredients.map(parseIngredientRegex)
  if (!llmConfigService.isConfigured()) return localParsed

  // Hybrid mode: only ambiguous lines are sent to the LLM.
  const toRefine: Array<{ index: number; raw: string }> = ingredients
    .map((raw, index) => ({ raw, index }))
    .filter(({ raw, index }) => shouldRefineWithLLM(raw, localParsed[index]))

  if (toRefine.length === 0) return localParsed

  try {
    const system = `Tu es un assistant culinaire. Pour chaque ingrédient reçu, extrais:
- quantity: le nombre qui représente une quantité réelle (ex: "4", "200", "0.5", "1/2"), ou "" si absent
- unit: l'unité de mesure (ex: "g", "ml", "cuillère à soupe", "gousse", "pincée"), ou "" si absente
- food: le nom complet de l'ingrédient sans quantité ni unité

RÈGLE CRITIQUE: un nombre peut faire partie du nom de l'ingrédient et ne doit PAS être mis dans quantity.
C'est le cas quand le nombre qualifie le produit lui-même (variété, mélange, marque).
Exemples corrects:
- "poivre 5 baies"       → {"quantity":"","unit":"","food":"poivre 5 baies"}
- "mélange 4 épices"     → {"quantity":"","unit":"","food":"mélange 4 épices"}
- "herbes de Provence"   → {"quantity":"","unit":"","food":"herbes de Provence"}
- "200g de farine"       → {"quantity":"200","unit":"g","food":"farine"}
- "4 cuisses de poulet"  → {"quantity":"4","unit":"","food":"cuisses de poulet"}
- "1 cuillère à soupe d'huile d'olive" → {"quantity":"1","unit":"cuillère à soupe","food":"huile d'olive"}
- "2 gousses d'ail"      → {"quantity":"2","unit":"gousse","food":"ail"}

Pour distinguer: si supprimer le nombre rend l'ingrédient incompréhensible ("5 baies" seul ne désigne rien), c'est qu'il fait partie du nom.

Réponds UNIQUEMENT avec un tableau JSON valide de cette forme exacte, sans markdown ni explication:
[{"quantity":"...","unit":"...","food":"..."}]`
    const raw = await llmChat(system, JSON.stringify(toRefine.map(x => x.raw)))
    // Extract JSON array even if the model adds extra text
    const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/)
    if (!match) throw new Error('No JSON array in response')
    const parsed = JSON.parse(match[0]) as Array<{ quantity?: string; unit?: string; food?: string }>
    if (!Array.isArray(parsed) || parsed.length !== toRefine.length) {
      throw new Error('Unexpected response length')
    }
    const merged = [...localParsed]
    parsed.forEach((p, i) => {
      const targetIndex = toRefine[i].index
      const food = String(p.food ?? '').trim()
      if (!food) return
      merged[targetIndex] = {
        quantity: String(p.quantity ?? '').trim(),
        unit: String(p.unit ?? '').trim(),
        food,
        note: '',
      }
    })
    return merged
  } catch {
    // Graceful fallback to deterministic parser
    return localParsed
  }
}
// ─── URL import (étape 1 : récupération + extraction JSON-LD ou LLM) ─────────────────────

async function fetchAndParseRecipeUrl(url: string): Promise<ExternalRecipe> {
  const base = `${getIngressBasename()}/api/marmiton`

  // Pass Ollama config so proxy can call it server-side even if not set in addon options
  const llmConfig = llmConfigService.load()
  const params = new URLSearchParams({ url })
  if (llmConfig.provider === 'ollama' && llmConfig.ollamaBaseUrl) {
    params.set('ollamaUrl', llmConfig.ollamaBaseUrl)
    if (llmConfig.model) params.set('ollamaModel', llmConfig.model)
  }

  let res: Response
  try {
    res = await fetch(`${base}/fetch-recipe?${params.toString()}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur réseau inconnue'
    throw new Error(`Impossible de joindre le proxy d'import (${msg}). Vérifiez que l'addon est démarré.`)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new Error((err.error && err.error.trim()) || `Erreur ${res.status}`)
  }
  const data = await res.json() as { schema: (ExternalRecipe & { marmitonUrl?: string }) | null; text: string; ollamaError?: string }

  // ① Schema trouvé (JSON-LD direct ou Ollama serveur-side via le proxy)
  if (data.schema && data.schema.name) return { ...data.schema, marmitonUrl: url }

  // ② Fallback : LLM côté navigateur (Anthropic, OpenAI, etc.)
  //    Pour Ollama : le proxy l'a déjà essayé server-side — si échec, on ne peut pas retry navigateur (timeout nginx)
  if (!llmConfigService.isConfigured()) {
    throw new Error('Aucune donnée structurée trouvée sur cette page. Configurez une IA dans les Paramètres pour parser les recettes sans schema.')
  }
  const config = llmConfigService.load()
  if (config.provider === 'ollama') {
    const detail = (data.ollamaError && data.ollamaError.trim())
      ? data.ollamaError
      : 'réponse vide'
    throw new Error(`Aucune donnée structurée trouvée et le parsing Ollama a échoué (${detail}). Vérifiez l'URL Ollama absolue et le modèle.`)
  }

  const system = `Tu es un assistant culinaire. Extrais les informations de cette page web de recette.
Réponds UNIQUEMENT avec un objet JSON valide (sans markdown ni explication) de cette forme exacte:
{"name":"Nom de la recette","ingredients":["ingrédient 1","ingrédient 2"],"steps":["Etape 1...","Etape 2..."],"tags":["tag1"],"imageUrl":"","prepTime":"","cookTime":"","totalTime":"","recipeYield":""}
Les durées au format "X min" ou "Xh" ou "XhXX". Si absent, laisse vide ou tableau vide.`

  const raw = await llmChat(system, data.text)
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Impossible d\'extraire la recette depuis la page.')
  const parsed = JSON.parse(match[0]) as Partial<ExternalRecipe>
  return {
    name: parsed.name ?? '',
    ingredients: parsed.ingredients ?? [],
    steps: parsed.steps ?? [],
    tags: parsed.tags ?? [],
    imageUrl: parsed.imageUrl ?? '',
    marmitonUrl: url,
    prepTime: parsed.prepTime ?? '',
    cookTime: parsed.cookTime ?? '',
    totalTime: parsed.totalTime ?? '',
    recipeYield: parsed.recipeYield ?? '',
  }
}

// ─── UrlImportCard ────────────────────────────────────────────────────

function UrlImportCard() {
  const [urlInput, setUrlInput] = useState('')
  const [status, setStatus] = useState<ImportStatus>({ state: 'idle' })
  const [imageWarning, setImageWarning] = useState<string | null>(null)

  const handleImportUrl = async () => {
    const url = urlInput.trim()
    if (!url) return
    setStatus({ state: 'loading' })
    setImageWarning(null)
    try {
      const recipe = await fetchAndParseRecipeUrl(url)
      if (!recipe.name) throw new Error('Impossible de détecter le nom de la recette.')

      const existing = await findExistingRecipeByName(recipe.name)
      if (existing) {
        if (recipe.imageUrl) {
          try {
            await uploadRecipeImageWithFallback(existing.slug, recipe)
            setImageWarning('Recette déjà présente: image mise à jour sur la recette existante.')
          } catch {
            setImageWarning('Recette déjà présente. Impossible de mettre à jour son image automatiquement.')
          }
        } else {
          setImageWarning('Recette déjà présente dans Mealie.')
        }
        setStatus({ state: 'ok', slug: existing.slug })
        return
      }

      const created = await createRecipeUseCase.execute({
        name: recipe.name,
        description: recipe.tags.join(', '),
        prepTime: recipe.prepTime,
        performTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        recipeYield: recipe.recipeYield,
        recipeIngredient: await parseIngredientsWithAI(recipe.ingredients),
        recipeInstructions: recipe.steps.map((text) => ({ text })),
        seasons: [],
        categories: [],
        tags: [],
      })

      if (recipe.imageUrl) {
        try {
          await uploadRecipeImageWithFallback(created.slug, recipe)
        } catch {
          setImageWarning('Recette importée, mais image non ajoutée automatiquement.')
        }
      }

      setStatus({ state: 'ok', slug: created.slug })
    } catch (e) {
      const message = e instanceof Error ? (e.message || 'Erreur inconnue lors de l\'import URL') : 'Erreur inconnue lors de l\'import URL'
      setStatus({ state: 'error', message })
    }
  }

  return (
    <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Link2 className="h-4 w-4 text-primary" />
        Importer depuis une URL
      </div>
      <p className="text-xs text-muted-foreground">
        Collez le lien d’une recette (Marmiton, 750g, CuisineAZ, AllRecipes…) pour l’importer automatiquement.
        {llmConfigService.isConfigured() && <span className="text-primary"> L’IA prendra le relais si la page n’a pas de données structurées.</span>}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            placeholder="https://www.exemple.com/recette..."
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setStatus({ state: 'idle' }) }}
            className="pl-9"
            disabled={status.state === 'loading'}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleImportUrl() }}
          />
        </div>
        <Button
          type="button"
          disabled={!urlInput.trim() || status.state === 'loading'}
          onClick={() => void handleImportUrl()}
          className="gap-1.5 shrink-0"
        >
          {status.state === 'loading' ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Import…</>
          ) : (
            <><Plus className="h-4 w-4" />Importer</>
          )}
        </Button>
      </div>

      {status.state === 'ok' && (
        <Link
          to={`/recipes/${status.slug}`}
          className={cn(
            'flex items-center gap-1.5 rounded-[var(--radius-lg)]',
            'bg-[oklch(0.93_0.06_145)] text-[oklch(0.38_0.14_145)]',
            'dark:bg-[oklch(0.22_0.06_145)] dark:text-[oklch(0.72_0.14_145)]',
            'px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-80',
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Recette importée — Voir la recette
        </Link>
      )}
      {status.state === 'error' && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {status.message}
        </p>
      )}
      {imageWarning && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {imageWarning}
        </p>
      )}
    </div>
  )
}
// ─── API call ─────────────────────────────────────────────────────────────────

async function searchMarmiton(query: string, page: number): Promise<{ results: ExternalRecipe[]; hasMore: boolean }> {
  const base = `${getIngressBasename()}/api/marmiton`
  const res = await fetch(`${base}/search?q=${encodeURIComponent(query)}&limit=12&page=${page}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string }
    throw new Error(err.error ?? `Erreur ${res.status}`)
  }
  const data = await res.json() as { results: ExternalRecipe[]; hasMore: boolean }
  return data
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

function RecipeCard({ recipe }: { recipe: ExternalRecipe }) {
  const [status, setStatus] = useState<ImportStatus>({ state: 'idle' })
  const [imageWarning, setImageWarning] = useState<string | null>(null)
  const proxyImageUrl = buildMarmitonProxyImageUrl(recipe.imageUrl, recipe.marmitonUrl)

  const handleImport = async () => {
    setStatus({ state: 'loading' })
    setImageWarning(null)
    try {
      const existing = await findExistingRecipeByName(recipe.name)
      if (existing) {
        if (recipe.imageUrl) {
          try {
            await uploadRecipeImageWithFallback(existing.slug, recipe)
            setImageWarning('Recette déjà présente: image mise à jour sur la recette existante.')
          } catch {
            setImageWarning('Recette déjà présente. Impossible de mettre à jour son image automatiquement.')
          }
        } else {
          setImageWarning('Recette déjà présente dans Mealie.')
        }
        setStatus({ state: 'ok', slug: existing.slug })
        return
      }

      const created = await createRecipeUseCase.execute({
        name: recipe.name,
        description: recipe.tags.join(', '),
        prepTime: recipe.prepTime,
        performTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        recipeYield: recipe.recipeYield,
        recipeIngredient: await parseIngredientsWithAI(recipe.ingredients),
        recipeInstructions: recipe.steps.map((text) => ({ text })),
        seasons: [],
        categories: [],
        tags: [],
      })
      const slug = created.slug

      // Upload image via le proxy Marmiton (évite les restrictions CORS)
      if (recipe.imageUrl) {
        try {
          await uploadRecipeImageWithFallback(slug, recipe)
        } catch {
          setImageWarning('Recette ajoutée, mais image non importée.')
        }
      }

      setStatus({ state: 'ok', slug })
    } catch (e) {
      setStatus({ state: 'error', message: e instanceof Error ? e.message : 'Erreur inconnue' })
    }
  }

  return (
    <div className="flex flex-col rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle overflow-hidden">
      {/* Image */}
      {proxyImageUrl ? (
        <div className="relative h-44 shrink-0 bg-secondary">
          <img
            src={proxyImageUrl}
            alt={recipe.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      ) : (
        <div className="flex h-44 shrink-0 items-center justify-center bg-secondary">
          <ChefHat className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold leading-snug line-clamp-2">{recipe.name}</h3>
          {recipe.marmitonUrl && (
            <a
              href={recipe.marmitonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Voir sur Marmiton"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Meta */}
        {recipe.totalTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {recipe.totalTime}
          </div>
        )}

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Ingrédients */}
        {recipe.ingredients.length > 0 && (
          <div className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {recipe.ingredients.slice(0, 5).join(' · ')}
            {recipe.ingredients.length > 5 && ` · +${recipe.ingredients.length - 5}`}
          </div>
        )}

        {/* Import button */}
        <div className="mt-auto pt-2">
          {status.state === 'idle' && (
            <Button
              type="button"
              size="sm"
              className="w-full gap-1.5"
              onClick={handleImport}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter à Mealie
            </Button>
          )}
          {status.state === 'loading' && (
            <Button type="button" size="sm" className="w-full gap-1.5" disabled>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Import en cours…
            </Button>
          )}
          {status.state === 'ok' && (
            <Link
              to={`/recipes/${status.slug}`}
              className={cn(
                "flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-lg)]",
                "bg-[oklch(0.93_0.06_145)] text-[oklch(0.38_0.14_145)]",
                "dark:bg-[oklch(0.22_0.06_145)] dark:text-[oklch(0.72_0.14_145)]",
                "px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80",
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ajoutée — Voir la recette
            </Link>
          )}
          {status.state === 'error' && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {status.message}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setStatus({ state: 'idle' })}
              >
                Réessayer
              </Button>
            </div>
          )}
          {imageWarning && status.state !== 'error' && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {imageWarning}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const QUICK_SEARCHES = [
  'Poulet rôti', 'Pasta', 'Quiche', 'Soupe', 'Tarte', 'Risotto', 'Salade', 'Pizza',
]

export function ExploreRecipesPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExternalRecipe[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const doSearch = async (term: string, page: number) => {
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const { results: recipes, hasMore: more } = await searchMarmiton(term, page)
      setResults(recipes)
      setHasMore(more)
      if (recipes.length === 0) setError('Aucune recette trouvée pour cette recherche.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la recherche')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (q?: string) => {
    const term = (q ?? query).trim()
    if (!term) return
    setQuery(term)
    setSearched(true)
    setCurrentPage(1)
    doSearch(term, 1)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    doSearch(query, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2.5">
          <ChefHat className="h-6 w-6 text-primary" />
          Explorer des recettes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recherchez des recettes sur Marmiton et importez-les directement dans votre bibliothèque Mealie.
        </p>
      </div>

      {/* Import depuis URL */}
      <UrlImportCard />

      {/* Barre de recherche */}
      <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5 space-y-4">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch() }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher une recette…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()} className="gap-1.5 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Rechercher
          </Button>
        </form>

        {/* Recherches rapides */}
        <div className="flex flex-wrap gap-2">
          {QUICK_SEARCHES.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSearch(tag)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                'border-border bg-secondary text-muted-foreground',
                'hover:border-primary/40 hover:bg-primary/8 hover:text-primary',
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Recherche en cours sur Marmiton…</p>
        </div>
      )}

      {/* Résultats */}
      {!loading && results.length > 0 && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{currentPage}</span> — {results.length} recette{results.length !== 1 ? 's' : ''} pour{' '}
            <span className="font-semibold text-foreground">« {query} »</span>
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((recipe, i) => (
              <RecipeCard key={`${recipe.name}-${i}`} recipe={recipe} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédente
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={!hasMore}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Suivante
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* État initial */}
      {!loading && !searched && (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <ChefHat className="h-12 w-12 opacity-20" />
          <p className="text-sm">Lancez une recherche pour découvrir des recettes Marmiton.</p>
        </div>
      )}
    </div>
  )
}
