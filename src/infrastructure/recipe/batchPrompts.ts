import type { BatchAdvice, BatchCandidate } from "../../domain/recipe/services/IBatchAdvisor.ts"

export const BATCH_SYSTEM_PROMPT =
  "Tu es un cuisinier expert du batch cooking et de la sécurité alimentaire à la maison."

export function buildBatchPrompt(candidates: BatchCandidate[]): string {
  const lines = candidates.map((c) => {
    const labels = c.labels.length > 0 ? ` (${c.labels.join(", ")})` : ""
    return `- ${c.slug} : ${c.name}${labels}`
  })
  return `Voici des recettes, une par ligne au format « identifiant : nom (catégories) ».

${lines.join("\n")}

Sélectionne UNIQUEMENT celles qui se prêtent bien au batch cooking : un plat qu'on
cuisine en grande quantité à l'avance, qu'on garde au frigo et/ou au congélateur, et
qu'on réchauffe sans perte notable (lasagnes, tartiflette, currys, soupes, gratins,
plats mijotés, sauces…). Exclus les salades, crudités, grillades minute, fritures,
desserts fragiles et tout ce qui se dégrade au réchauffage.

Pour chaque recette retenue, estime des durées de conservation prudentes une fois
cuisinée : jours au frigo (typiquement 2 à 4) et jours au congélateur (typiquement
30 à 90). Omets "freezerDays" si le plat se congèle mal.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour :
[{"slug": "identifiant", "fridgeDays": 3, "freezerDays": 90, "reason": "courte justification"}]
Réponds [] si aucune recette ne convient.`
}

function extractJsonArray(raw: string): unknown {
  const start = raw.indexOf("[")
  const end = raw.lastIndexOf("]")
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

function boundedDays(value: unknown, max: number): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.min(Math.round(n), max)
}

/** Ne garde que les recettes demandées, une seule fois chacune, avec des durées plausibles. */
export function parseBatchResponse(raw: string, candidates: BatchCandidate[]): BatchAdvice[] {
  const parsed = extractJsonArray(raw)
  if (!Array.isArray(parsed)) return []
  const known = new Set(candidates.map((c) => c.slug))
  const seen = new Set<string>()
  const advice: BatchAdvice[] = []
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue
    const record = item as Record<string, unknown>
    const slug = typeof record.slug === "string" ? record.slug.trim() : ""
    if (!known.has(slug) || seen.has(slug)) continue
    seen.add(slug)
    const entry: BatchAdvice = { slug }
    const fridgeDays = boundedDays(record.fridgeDays, 7)
    const freezerDays = boundedDays(record.freezerDays, 365)
    if (fridgeDays) entry.fridgeDays = fridgeDays
    if (freezerDays) entry.freezerDays = freezerDays
    if (typeof record.reason === "string" && record.reason.trim()) entry.reason = record.reason.trim().slice(0, 200)
    advice.push(entry)
  }
  return advice
}
