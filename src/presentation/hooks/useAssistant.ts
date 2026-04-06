import { useState, useCallback, useRef } from "react"
import { generateId } from "../../shared/utils/id.ts"
import { sendAssistantMessage } from "../../infrastructure/llm/AssistantService.ts"
import type { AnthropicMessage, AssistantTool } from "../../infrastructure/llm/AssistantService.ts"
import {
  getRecipesUseCase,
  addMealUseCase,
  createRecipeUseCase,
  getPlanningRangeUseCase,
  getCategoriesUseCase,
  getTagsUseCase,
} from "../../infrastructure/container.ts"
import type { MealieRecipe, MealieMealPlan } from "../../shared/types/mealie.ts"
import { isSeasonTag } from "../../shared/utils/season.ts"

// ─── Chat message type (UI) ───────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "tool"

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  isStreaming?: boolean
  toolName?: string
}

// ─── Context helpers ──────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

async function buildSystemContext(): Promise<string> {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const [recipesPage, planning, categories, tags] = await Promise.all([
    getRecipesUseCase.execute(1, 200),
    getPlanningRangeUseCase.execute(toDateStr(weekStart), toDateStr(weekEnd)).catch(() => [] as MealieMealPlan[]),
    getCategoriesUseCase.execute().catch(() => []),
    getTagsUseCase.execute().catch(() => []),
  ])

  const recipesSummary = recipesPage.items
    .map((r: MealieRecipe) => {
      const cats = (r.recipeCategory ?? []).map((c) => c.name).join(", ")
      const tags = (r.tags ?? []).filter((t) => !isSeasonTag(t)).map((t) => t.name).join(", ")
      return `- ${r.name} [id:${r.id}|slug:${r.slug}]${cats ? ` | ${cats}` : ""}${tags ? ` | ${tags}` : ""}`
    })
    .join("\n")

  const planningSummary = planning.length > 0
    ? planning.map((m: MealieMealPlan) => `- ${m.date} ${m.entryType === "lunch" ? "déj." : "dîner"}: ${m.recipe?.name ?? m.title ?? "?"}`).join("\n")
    : "Aucun repas planifié cette semaine."

  const categoriesList = categories.map((c) => c.name).join(", ")
  const tagsList = tags.map((t) => t.name).join(", ")

  return `Tu es Bonap, un assistant culinaire intelligent et sympathique.
Tu connais la bibliothèque de recettes de l'utilisateur et son planning de la semaine.
Tu peux suggérer des repas, ajouter des plats au planning, créer des recettes et répondre à toutes les questions culinaires.

Catégories disponibles dans la bibliothèque : ${categoriesList || "aucune"}
Tags disponibles dans la bibliothèque : ${tagsList || "aucun"}

Quand l'utilisateur décrit un type de plat avec ses propres mots (ex: "gamelle possible", "truc rapide", "plat de saison"), cherche d'abord si une catégorie ou un tag existant correspond sémantiquement, et filtre les recettes en conséquence. Par exemple "gamelle possible" peut correspondre au tag "Facile en restes", "truc rapide" peut correspondre à la catégorie "Rapide", etc. Adapte-toi au vocabulaire de l'utilisateur sans lui demander de préciser s'il existe une correspondance évidente.

Recettes disponibles :
${recipesSummary}

Planning de la semaine en cours :
${planningSummary}

Date du jour : ${toDateStr(today)}
Réponds toujours en français, de manière concise et amicale.`
}

// ─── Tool implementations ─────────────────────────────────────────────────────

async function findNextFreeSlot(): Promise<{ date: string; entryType: string } | null> {
  const today = new Date()
  const end = new Date(today)
  end.setDate(today.getDate() + 14)
  const meals = await getPlanningRangeUseCase.execute(toDateStr(today), toDateStr(end)).catch(() => [] as MealieMealPlan[])
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

function buildTools(): Record<string, AssistantTool> {
  return {
    search_recipe: {
      name: "search_recipe",
      execute: async (input) => {
        const query = (input.query as string) ?? ""
        const result = await getRecipesUseCase.execute(1, 5, { search: query })
        if (result.items.length === 0) return `Aucune recette trouvée pour "${query}".`
        return result.items.map((r: MealieRecipe) => `- ${r.name} (slug: ${r.slug}, id: ${r.id})`).join("\n")
      },
    },
    add_to_planning: {
      name: "add_to_planning",
      execute: async (input) => {
        const recipeId = input.recipe_id as string
        let date = input.date as string | undefined
        let entryType = (input.entry_type as string | undefined) ?? "dinner"
        if (!date) {
          const slot = await findNextFreeSlot()
          if (!slot) return "Aucun créneau libre trouvé dans les 14 prochains jours."
          date = slot.date
          entryType = slot.entryType
        }
        await addMealUseCase.execute(date, entryType, recipeId)
        const label = entryType === "lunch" ? "déjeuner" : "dîner"
        return `Recette ajoutée au planning le ${date} (${label}).`
      },
    },
    create_recipe: {
      name: "create_recipe",
      execute: async (input) => {
        const name = input.name as string
        const ingredients = (input.ingredients as string[] | undefined) ?? []
        const instructions = (input.instructions as string[] | undefined) ?? []
        const description = (input.description as string | undefined) ?? ""
        const recipe = await createRecipeUseCase.execute({
          name,
          description,
          prepTime: "",
          performTime: "",
          totalTime: "",
          recipeIngredient: ingredients.map((note) => ({ quantity: "", unit: "", food: "", note })),
          recipeInstructions: instructions.map((text) => ({ text })),
          seasons: [],
          categories: [],
          tags: [],
        })
        return `Recette "${recipe.name}" créée avec succès (slug: ${recipe.slug}).`
      },
    },
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [systemContext, setSystemContext] = useState<string | null>(null)
  const contextLoadedRef = useRef(false)

  const ensureContext = useCallback(async () => {
    if (contextLoadedRef.current) return
    contextLoadedRef.current = true
    const ctx = await buildSystemContext()
    setSystemContext(ctx)
    return ctx
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: generateId(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    const ctx = systemContext ?? await buildSystemContext()
    if (!systemContext) setSystemContext(ctx)

    // Build Anthropic-compatible history
    const history: AnthropicMessage[] = [
      { role: "user", content: ctx + "\n\n---\nPremière question de l'utilisateur :" },
      { role: "assistant", content: "Compris ! Je suis prêt à t'aider avec tes recettes et ton planning. Pose-moi ta question." },
      ...messages.map((m) => ({
        role: m.role === "user" ? "user" as const : "assistant" as const,
        content: m.content,
      })),
      { role: "user", content: text },
    ]

    // Create streaming assistant message
    const assistantId = generateId()
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", isStreaming: true }])

    const tools = buildTools()

    await sendAssistantMessage(history, tools, (event) => {
      if (event.type === "text") {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.text } : m),
        )
      } else if (event.type === "tool_start") {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "tool",
            content: toolLabel(event.name),
            toolName: event.name,
          },
        ])
      } else if (event.type === "done") {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m),
        )
        setLoading(false)
      } else if (event.type === "error") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `❌ ${event.message}`, isStreaming: false }
              : m,
          ),
        )
        setLoading(false)
      }
    })
  }, [messages, systemContext])

  const clearHistory = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, loading, sendMessage, clearHistory, ensureContext }
}

function toolLabel(name: string): string {
  switch (name) {
    case "search_recipe": return "🔍 Recherche de recettes…"
    case "add_to_planning": return "📅 Ajout au planning…"
    case "create_recipe": return "✍️ Création de recette…"
    default: return `⚙️ ${name}…`
  }
}
