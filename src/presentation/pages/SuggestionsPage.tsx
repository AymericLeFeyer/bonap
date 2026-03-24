import { useState } from "react"
import { Sparkles, Loader2, AlertCircle, CalendarPlus, Settings, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/button.tsx"
import { Badge } from "../components/ui/badge.tsx"
import { llmChat } from "../../infrastructure/llm/LLMService.ts"
import { llmConfigService } from "../../infrastructure/llm/LLMConfigService.ts"
import {
  getRecipesUseCase,
  getPlanningRangeUseCase,
  addMealUseCase,
} from "../../infrastructure/container.ts"
import type { MealieRecipe, MealieMealPlan } from "../../shared/types/mealie.ts"
import { isSeasonTag } from "../../shared/utils/season.ts"
import { cn } from "../../lib/utils.ts"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Suggestion {
  slug: string
  name: string
  reason: string
}

// ─── Criteria chips ───────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchAllRecipes(): Promise<MealieRecipe[]> {
  const first = await getRecipesUseCase.execute(1, 100)
  const all = [...first.items]
  for (let p = 2; p <= first.totalPages; p++) {
    const page = await getRecipesUseCase.execute(p, 100)
    all.push(...page.items)
  }
  return all
}

async function fetchRecentPlanning(): Promise<MealieMealPlan[]> {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 14)
  return getPlanningRangeUseCase.execute(toDateStr(start), toDateStr(today))
}

async function fetchNextFreePlanning(): Promise<{ date: string; entryType: string } | null> {
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 14)
  const meals = await getPlanningRangeUseCase.execute(toDateStr(today), toDateStr(end))
  const occupied = new Set(meals.map((m) => `${m.date}-${m.entryType}`))
  for (let i = 0; i <= 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = toDateStr(d)
    for (const slot of ["lunch", "dinner"]) {
      if (!occupied.has(`${dateStr}-${slot}`)) return { date: dateStr, entryType: slot }
    }
  }
  return null
}

function buildPrompt(recipes: MealieRecipe[], planning: MealieMealPlan[], criteria: string[], freeText: string) {
  const recipesContext = recipes
    .map((r) => {
      const cats = (r.recipeCategory ?? []).map((c) => c.name).join(", ")
      const tags = (r.tags ?? []).filter((t) => !isSeasonTag(t)).map((t) => t.name).join(", ")
      const prep = r.prepTime ? ` (${r.prepTime})` : ""
      return `- ${r.name} [${r.slug}]${prep}${cats ? ` | catégories: ${cats}` : ""}${tags ? ` | tags: ${tags}` : ""}`
    })
    .join("\n")

  const planningContext = planning.length > 0
    ? planning
        .map((m) => `- ${m.date} ${m.entryType}: ${m.recipe?.name ?? m.title ?? "?"}`)
        .join("\n")
    : "Aucun repas récent."

  const criteriaText = [
    ...criteria,
    ...(freeText.trim() ? [freeText.trim()] : []),
  ].join(", ")

  const system = `Tu es un assistant culinaire qui propose des repas parmi les recettes d'un utilisateur.
Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans explication, sans texte avant ou après.
Format exact : [{"slug":"...","name":"...","reason":"..."}]
- 5 éléments exactement
- Uniquement des recettes qui existent dans la liste fournie (utilise le slug exact)
- "reason" : une phrase courte en français expliquant pourquoi cette recette correspond aux critères`

  const user = `Recettes disponibles :
${recipesContext}

Planning des 14 derniers jours :
${planningContext}

Critères de sélection : ${criteriaText || "Aucun critère particulier, surprise-moi"}

Suggère 5 recettes.`

  return { system, user }
}

function parseResponse(text: string): Suggestion[] {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim()
  const start = cleaned.indexOf("[")
  const end = cleaned.lastIndexOf("]")
  if (start === -1 || end === -1) throw new Error("Réponse JSON introuvable")
  return JSON.parse(cleaned.slice(start, end + 1)) as Suggestion[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SuggestionsPage() {
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([])
  const [freeText, setFreeText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [recipeMap, setRecipeMap] = useState<Map<string, MealieRecipe>>(new Map())
  const [addingSlug, setAddingSlug] = useState<string | null>(null)
  const [addedSlug, setAddedSlug] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  const isConfigured = llmConfigService.isConfigured()

  const toggleCriteria = (c: string) => {
    setSelectedCriteria((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  const handleSuggest = async () => {
    setLoading(true)
    setError(null)
    setSuggestions([])
    try {
      const [recipes, planning] = await Promise.all([fetchAllRecipes(), fetchRecentPlanning()])
      const map = new Map(recipes.map((r) => [r.slug, r]))
      setRecipeMap(map)
      const { system, user } = buildPrompt(recipes, planning, selectedCriteria, freeText)
      const response = await llmChat(system, user)
      const parsed = parseResponse(response)
      const valid = parsed.filter((s) => map.has(s.slug))
      setSuggestions(valid.slice(0, 5))
      if (valid.length === 0) setError("Aucune suggestion valide reçue. Réessaie.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'appel IA")
    } finally {
      setLoading(false)
    }
  }

  const handleAddToPlanning = async (suggestion: Suggestion, recipeId: string) => {
    setAddingSlug(suggestion.slug)
    setAddedSlug(null)
    setAddError(null)
    try {
      const slot = await fetchNextFreePlanning()
      if (!slot) {
        setAddError("Aucun créneau libre trouvé dans les 14 prochains jours.")
        return
      }
      await addMealUseCase.execute(slot.date, slot.entryType, recipeId)
      setAddedSlug(suggestion.slug)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Erreur lors de l'ajout au planning")
    } finally {
      setAddingSlug(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2.5">
          <Sparkles className="h-6 w-6 text-primary" />
          Suggestions de repas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          L'IA analyse vos recettes et votre planning pour vous proposer des idées adaptées.
        </p>
      </div>

      {/* No LLM configured warning */}
      {!isConfigured && (
        <div className={cn(
          "flex items-start gap-3 rounded-[var(--radius-xl)]",
          "border border-[oklch(0.78_0.08_80)] bg-[oklch(0.97_0.04_80)]",
          "dark:border-[oklch(0.32_0.06_70)] dark:bg-[oklch(0.22_0.04_70)]",
          "p-4",
        )}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.52_0.14_60)] dark:text-[oklch(0.72_0.14_72)]" />
          <div className="flex-1 text-sm text-[oklch(0.38_0.10_55)] dark:text-[oklch(0.80_0.08_72)]">
            <strong>Aucun fournisseur IA configuré.</strong> Configurez une clé API pour utiliser cette fonctionnalité.
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

      {/* Criteria */}
      <div className="space-y-4 rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle p-5">
        <div className="space-y-2.5">
          <p className="text-sm font-semibold">Critères prédéfinis</p>
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
          <label htmlFor="free-text" className="text-sm font-semibold">
            Ou décrivez vos envies
          </label>
          <textarea
            id="free-text"
            placeholder="Ex : quelque chose de chaud et réconfortant, pas trop long à faire…"
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

        <Button
          onClick={handleSuggest}
          disabled={loading || !isConfigured}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Analyse en cours…" : "Suggérer 5 repas"}
        </Button>
      </div>

      {/* Error */}
      {(error || addError) && (
        <div className="flex items-start gap-2 rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error ?? addError}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground/50">
            {suggestions.length} suggestion{suggestions.length > 1 ? "s" : ""}
          </p>
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.slug}
              suggestion={s}
              recipe={recipeMap.get(s.slug)}
              isAdding={addingSlug === s.slug}
              isAdded={addedSlug === s.slug}
              onAdd={handleAddToPlanning}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SuggestionCard ───────────────────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion: Suggestion
  recipe?: MealieRecipe
  isAdding: boolean
  isAdded: boolean
  onAdd: (suggestion: Suggestion, recipeId: string) => void
}

function SuggestionCard({ suggestion, recipe, isAdding, isAdded, onAdd }: SuggestionCardProps) {
  return (
    <div className={cn(
      "rounded-[var(--radius-xl)] border bg-card shadow-subtle",
      "p-4 transition-all duration-150",
      "hover:border-primary/20 hover:shadow-warm",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/recipes/${suggestion.slug}`}
            className="text-[13.5px] font-semibold hover:text-primary transition-colors"
          >
            {suggestion.name}
          </Link>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground leading-relaxed">{suggestion.reason}</p>
        </div>
        <Button
          size="sm"
          variant={isAdded ? "outline" : "default"}
          onClick={() => recipe && onAdd(suggestion, recipe.id)}
          disabled={isAdding || isAdded || !recipe}
          className="shrink-0 gap-1.5"
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CalendarPlus className="h-3.5 w-3.5" />
          )}
          {isAdded ? "Ajouté" : "Ajouter"}
        </Button>
      </div>
    </div>
  )
}
