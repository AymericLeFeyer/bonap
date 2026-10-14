import type { NutritionEstimateLine, NutritionLineReason } from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { MealieRecipe } from "../../../shared/types/mealie.ts"
import type { GetAllRecipeDetailsUseCase } from "../../recipe/usecases/GetAllRecipeDetailsUseCase.ts"
import { readLegacyCiqualMappings, toNutritionIngredients } from "../recipeNutritionInput.ts"
import type { ClassifyIngredientsUseCase } from "./ClassifyIngredientsUseCase.ts"
import { NothingToEstimateError, type SaveRecipeNutritionUseCase } from "./SaveRecipeNutritionUseCase.ts"

const INGREDIENTS_PER_CLASSIFICATION = 400
const REVIEW_REASONS: NutritionLineReason[] = ["no-match", "piece-weight-missing", "unit-unknown", "no-nutrients"]

export type BulkPhase = "loading" | "classifying" | "saving"

export interface BulkProgress {
  phase: BulkPhase
  done: number
  total: number
}

export interface BulkRecipeResult {
  slug: string
  name: string
  coverage: number | null
  error?: string
}

export interface BulkIngredientToReview {
  key: string
  label: string
  reason: NutritionLineReason
  recipes: string[]
}

export interface BulkReport {
  recipes: BulkRecipeResult[]
  toReview: BulkIngredientToReview[]
  cancelled: boolean
}

export interface CompleteAllRecipesOptions {
  aiEnabled: boolean
  signal: AbortSignal
  onProgress: (progress: BulkProgress) => void
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue"
}

class ToReviewCollector {
  private readonly byKey = new Map<string, BulkIngredientToReview>()

  add(recipe: MealieRecipe, lines: NutritionEstimateLine[]): void {
    for (const line of lines) {
      if (!line.reason || !REVIEW_REASONS.includes(line.reason)) continue
      const current = this.byKey.get(line.key) ?? { key: line.key, label: line.ingredient, reason: line.reason, recipes: [] }
      if (!current.recipes.includes(recipe.name)) current.recipes.push(recipe.name)
      this.byKey.set(line.key, current)
    }
  }

  list(): BulkIngredientToReview[] {
    return [...this.byKey.values()].sort((left, right) => right.recipes.length - left.recipes.length)
  }
}

/**
 * Lancement global : charge toutes les recettes, classe une seule fois chaque
 * ingrédient distinct, puis calcule et enregistre la nutrition de chaque recette.
 * Une annulation conserve les recettes déjà enregistrées.
 */
export class CompleteAllRecipesNutritionUseCase {
  private readonly getAllRecipeDetails: GetAllRecipeDetailsUseCase
  private readonly classifyIngredients: ClassifyIngredientsUseCase
  private readonly saveRecipeNutrition: SaveRecipeNutritionUseCase

  constructor(
    getAllRecipeDetails: GetAllRecipeDetailsUseCase,
    classifyIngredients: ClassifyIngredientsUseCase,
    saveRecipeNutrition: SaveRecipeNutritionUseCase,
  ) {
    this.getAllRecipeDetails = getAllRecipeDetails
    this.classifyIngredients = classifyIngredients
    this.saveRecipeNutrition = saveRecipeNutrition
  }

  async execute(options: CompleteAllRecipesOptions): Promise<BulkReport> {
    const results: BulkRecipeResult[] = []
    const toReview = new ToReviewCollector()
    try {
      const recipes = await this.loadRecipes(options)
      await this.classifyDistinctIngredients(recipes, options)
      await this.saveAll(recipes, options, results, toReview)
      return { recipes: results, toReview: toReview.list(), cancelled: false }
    } catch (error) {
      if (!isAbort(error)) throw error
      return { recipes: results, toReview: toReview.list(), cancelled: true }
    }
  }

  private async loadRecipes({ signal, onProgress }: CompleteAllRecipesOptions): Promise<MealieRecipe[]> {
    const recipes = await this.getAllRecipeDetails.execute({
      signal,
      onProgress: (done, total) => onProgress({ phase: "loading", done, total }),
    })
    return recipes.filter((recipe) => toNutritionIngredients(recipe).length > 0)
  }

  private async classifyDistinctIngredients(recipes: MealieRecipe[], { aiEnabled, signal, onProgress }: CompleteAllRecipesOptions): Promise<void> {
    const ingredients = recipes.flatMap(toNutritionIngredients)
    const legacyMappings = Object.assign({}, ...recipes.map(readLegacyCiqualMappings)) as Record<string, string>
    const total = Math.ceil(ingredients.length / INGREDIENTS_PER_CLASSIFICATION)
    for (let done = 0; done < total; done += 1) {
      signal.throwIfAborted()
      onProgress({ phase: "classifying", done, total })
      const slice = ingredients.slice(done * INGREDIENTS_PER_CLASSIFICATION, (done + 1) * INGREDIENTS_PER_CLASSIFICATION)
      await this.classifyIngredients.execute(slice, { aiEnabled, legacyMappings, signal })
    }
    onProgress({ phase: "classifying", done: total, total })
  }

  private async saveAll(
    recipes: MealieRecipe[],
    { signal, onProgress }: CompleteAllRecipesOptions,
    results: BulkRecipeResult[],
    toReview: ToReviewCollector,
  ): Promise<void> {
    for (const recipe of recipes) {
      signal.throwIfAborted()
      onProgress({ phase: "saving", done: results.length, total: recipes.length })
      try {
        const { estimate } = await this.saveRecipeNutrition.execute(recipe)
        toReview.add(recipe, estimate.lines)
        results.push({ slug: recipe.slug, name: recipe.name, coverage: estimate.coverage })
      } catch (error) {
        if (error instanceof NothingToEstimateError) toReview.add(recipe, error.estimate.lines)
        results.push({ slug: recipe.slug, name: recipe.name, coverage: null, error: errorMessage(error) })
      }
    }
    onProgress({ phase: "saving", done: results.length, total: recipes.length })
  }
}
