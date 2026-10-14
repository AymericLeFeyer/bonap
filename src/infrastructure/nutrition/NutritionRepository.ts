import type {
  ClassifyOptions,
  INutritionRepository,
} from "../../domain/nutrition/repositories/INutritionRepository.ts"
import type {
  CiqualFood,
  ClassifiedIngredient,
  NutritionEstimate,
  NutritionFoodPatch,
  NutritionFoods,
  NutritionIngredientInput,
} from "../../domain/nutrition/entities/NutritionFood.ts"
import { getIngressBasename } from "../../shared/utils/env.ts"

function extractServerError(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { error?: unknown }
    return typeof parsed.error === "string" ? parsed.error : null
  } catch {
    return null
  }
}

async function readError(response: Response, scope: string): Promise<Error> {
  const text = await response.text().catch(() => response.statusText)
  return new Error(`${scope} : ${extractServerError(text) ?? `${response.status} ${text}`}`)
}

export class NutritionRepository implements INutritionRepository {
  private url(path: string): string {
    return `${getIngressBasename()}/api/bonap${path}`
  }

  private async request<T>(path: string, scope: string, init?: RequestInit): Promise<T> {
    const response = await fetch(this.url(path), {
      ...init,
      headers: init?.body ? { "content-type": "application/json" } : undefined,
    })
    if (!response.ok) throw await readError(response, scope)
    return response.json() as Promise<T>
  }

  async getFoods(): Promise<NutritionFoods> {
    const data = await this.request<{ foods: NutritionFoods }>("/nutrition/foods", "Dictionnaire d'aliments")
    return data.foods
  }

  async saveFoods(patches: NutritionFoodPatch[]): Promise<NutritionFoods> {
    if (patches.length === 0) return {}
    const data = await this.request<{ updated: NutritionFoods }>("/nutrition/foods", "Enregistrement des fiches", {
      method: "POST",
      body: JSON.stringify({ entries: patches }),
    })
    return data.updated
  }

  async classify(ingredients: NutritionIngredientInput[], options: ClassifyOptions): Promise<ClassifiedIngredient[]> {
    const data = await this.request<{ items: ClassifiedIngredient[] }>("/nutrition/classify", "Classification CIQUAL", {
      method: "POST",
      body: JSON.stringify({ ingredients, ...options }),
    })
    return data.items
  }

  async estimate(ingredients: NutritionIngredientInput[], servings: number): Promise<NutritionEstimate> {
    return this.request<NutritionEstimate>("/nutrition-estimate", "Estimation nutrition", {
      method: "POST",
      body: JSON.stringify({ ingredients, servings }),
    })
  }

  async searchCiqual(query: string, limit = 20): Promise<CiqualFood[]> {
    const q = query.trim()
    if (!q) return []
    const params = new URLSearchParams({ q, limit: String(limit) })
    const data = await this.request<{ items?: CiqualFood[] }>(`/ciqual/search?${params}`, "Recherche CIQUAL")
    return Array.isArray(data.items) ? data.items : []
  }
}
