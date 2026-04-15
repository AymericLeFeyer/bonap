import type { MealieMealPlan, MealieRecipe } from "../types/mealie.ts"
import { getCaloriesFromTags } from "./calorie.ts"
import { parseServings } from "./servings.ts"

export interface AutoPlanSlot {
  date: string
  entryType: "lunch" | "dinner"
}

export interface AutoPlannedMeal {
  slot: AutoPlanSlot
  recipe: MealieRecipe
  score: number
}

interface NutritionProfile {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  sugar: number | null
  sodium: number | null
  saturatedFat: number | null
}

interface MealTarget {
  calories: { min: number; max: number; ideal: number; weight: number }
  protein: { min: number; max: number; ideal: number; weight: number }
  carbs: { min: number; max: number; ideal: number; weight: number }
  fat: { min: number; max: number; ideal: number; weight: number }
  fiber: { min: number; max: number; ideal: number; weight: number }
  sugarMax: number
  sodiumMax: number
  saturatedFatMax: number
}

const MEAL_TARGETS: Record<AutoPlanSlot["entryType"], MealTarget> = {
  lunch: {
    calories: { min: 500, max: 900, ideal: 680, weight: 14 },
    protein: { min: 20, max: 45, ideal: 30, weight: 10 },
    carbs: { min: 40, max: 90, ideal: 65, weight: 7 },
    fat: { min: 12, max: 35, ideal: 22, weight: 6 },
    fiber: { min: 5, max: 16, ideal: 8, weight: 5 },
    sugarMax: 20,
    sodiumMax: 1200,
    saturatedFatMax: 12,
  },
  dinner: {
    calories: { min: 400, max: 800, ideal: 580, weight: 14 },
    protein: { min: 20, max: 40, ideal: 28, weight: 10 },
    carbs: { min: 30, max: 80, ideal: 50, weight: 7 },
    fat: { min: 10, max: 30, ideal: 18, weight: 6 },
    fiber: { min: 5, max: 16, ideal: 8, weight: 5 },
    sugarMax: 18,
    sodiumMax: 1100,
    saturatedFatMax: 10,
  },
}

function parseNutritionValue(value?: string): number | null {
  const raw = String(value ?? "").trim().toLowerCase()
  if (!raw) return null
  const match = raw.match(/-?\d+(?:[.,]\d+)?/)
  if (!match) return null
  const parsed = Number.parseFloat(match[0].replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getNutritionProfile(recipe: MealieRecipe): NutritionProfile {
  const servings = parseServings(recipe.recipeYield)
  // Normalise par portion (valeurs par personne) pour comparer aux MEAL_TARGETS qui sont par personne.
  // On ignore familySize ici : on veut scorer la valeur nutritionnelle d'une portion adulte.
  const divisor = (servings && servings > 0) ? servings : 1

  const scale = (v: number | null) => v !== null ? Math.round(v / divisor * 10) / 10 : null

  const calories = parseNutritionValue(recipe.nutrition?.calories) ?? getCaloriesFromTags(recipe.tags)
  return {
    calories: scale(calories),
    protein: scale(parseNutritionValue(recipe.nutrition?.proteinContent)),
    carbs: scale(parseNutritionValue(recipe.nutrition?.carbohydrateContent)),
    fat: scale(parseNutritionValue(recipe.nutrition?.fatContent)),
    fiber: scale(parseNutritionValue(recipe.nutrition?.fiberContent)),
    sugar: scale(parseNutritionValue(recipe.nutrition?.sugarContent)),
    sodium: scale(parseNutritionValue(recipe.nutrition?.sodiumContent)),
    saturatedFat: scale(parseNutritionValue(recipe.nutrition?.saturatedFatContent)),
  }
}

function hasUsableNutrition(profile: NutritionProfile): boolean {
  const macroCount = [profile.protein, profile.carbs, profile.fat, profile.fiber].filter((x) => x !== null).length
  return profile.calories !== null || macroCount >= 2
}

function scoreRange(
  value: number | null,
  target: { min: number; max: number; ideal: number; weight: number },
): number {
  if (value === null) return 0
  const width = Math.max(target.max - target.min, 1)
  if (value >= target.min && value <= target.max) {
    const distance = Math.abs(value - target.ideal)
    const closeness = Math.max(0, 1 - distance / (width / 2 || 1))
    return target.weight * (0.4 + closeness * 0.6)
  }
  const overflow = value < target.min ? target.min - value : value - target.max
  return -Math.min(target.weight, (overflow / width) * target.weight * 1.8)
}

function getVarietyKey(recipe: MealieRecipe): string {
  const pool = [
    ...(recipe.recipeCategory ?? []).map((category) => category.name),
    ...(recipe.tags ?? []).map((tag) => tag.name),
    recipe.name,
  ]
  const normalized = normalizeKey(pool.join(" "))
  const variants = [
    ["pates", /pate|pasta|lasagne|spaghetti|ravioli/],
    ["riz", /riz|risotto/],
    ["legumineuses", /lentille|pois chiche|haricot|legumineuse/],
    ["poisson", /saumon|thon|cabillaud|poisson|truite|crevette/],
    ["volaille", /poulet|dinde|volaille/],
    ["viande", /boeuf|bœuf|veau|agneau|porc|canard|saucisse/],
    ["soupe", /soupe|veloute|bouillon/],
    ["salade", /salade|bowl/],
    ["gratin", /gratin|parmentier/],
  ] as const
  for (const [key, re] of variants) {
    if (re.test(normalized)) return key
  }
  return normalized.split(" ").slice(0, 3).join(" ")
}

function buildRecentCounts(mealPlans: MealieMealPlan[]): Map<string, number> {
  const counts = new Map<string, number>()
  const now = Date.now()
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  for (const meal of mealPlans) {
    if (!meal.recipe?.slug) continue
    // Pondération exponentielle : recette d'il y a 1 jour = poids 1.0, 7 jours = 0.5, 30 jours ≈ 0.1
    const mealDate = new Date(meal.date).getTime()
    const daysAgo = Math.max(0, (now - mealDate) / MS_PER_DAY)
    const weight = Math.exp(-daysAgo / 10)
    counts.set(meal.recipe.slug, (counts.get(meal.recipe.slug) ?? 0) + weight)
  }
  return counts
}

export function generateBalancedMealPlan(
  recipes: MealieRecipe[],
  existingMeals: MealieMealPlan[],
  slots: AutoPlanSlot[],
  _familySize = 1,
): AutoPlannedMeal[] {
  // Pool principal : recettes avec nutrition. Pool secondaire : toutes les recettes (variété seulement).
  const withNutrition = recipes
    .map((recipe) => ({ recipe, nutrition: getNutritionProfile(recipe) }))
    .filter(({ nutrition }) => hasUsableNutrition(nutrition))

  const allCandidates = recipes
    .map((recipe) => ({ recipe, nutrition: getNutritionProfile(recipe) }))

  // Si moins de candidats avec nutrition que de créneaux, on complète avec le pool complet.
  const candidates = withNutrition.length >= slots.length ? withNutrition : allCandidates

  if (candidates.length === 0 || slots.length === 0) return []

  const recentCounts = buildRecentCounts(existingMeals)
  const generatedBySlug = new Map<string, number>()
  const generatedByVariety = new Map<string, number>()
  const planned: AutoPlannedMeal[] = []

  for (const slot of slots) {
    const target = MEAL_TARGETS[slot.entryType]
    let best: AutoPlannedMeal | null = null

    // Passe 1 (stricte) : exclure recettes déjà planifiées dans cette session ET très récentes (< 5j)
    // Passe 2 (souple) : exclure uniquement celles déjà dans cette session
    // Passe 3 (fallback total) : aucune exclusion, score seul décide
    for (const pass of [1, 2, 3]) {
      if (best !== null) break
      for (const { recipe, nutrition } of candidates) {
        if (!recipe.slug) continue

        if (pass === 1 && generatedBySlug.has(recipe.slug)) continue
        if (pass === 1 && (recentCounts.get(recipe.slug) ?? 0) > 0.61) continue
        if (pass === 2 && generatedBySlug.has(recipe.slug)) continue

        const varietyKey = getVarietyKey(recipe)
        let score = 0
        score += scoreRange(nutrition.calories, target.calories)
        score += scoreRange(nutrition.protein, target.protein)
        score += scoreRange(nutrition.carbs, target.carbs)
        score += scoreRange(nutrition.fat, target.fat)
        score += scoreRange(nutrition.fiber, target.fiber)

        if (nutrition.sugar !== null && nutrition.sugar > target.sugarMax) {
          score -= Math.min(4, (nutrition.sugar - target.sugarMax) / 3)
        }
        if (nutrition.sodium !== null && nutrition.sodium > target.sodiumMax) {
          score -= Math.min(4, (nutrition.sodium - target.sodiumMax) / 250)
        }
        if (nutrition.saturatedFat !== null && nutrition.saturatedFat > target.saturatedFatMax) {
          score -= Math.min(5, nutrition.saturatedFat - target.saturatedFatMax)
        }

        const completeness = [nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.fat, nutrition.fiber]
          .filter((value) => value !== null)
          .length
        score += completeness

        score -= (recentCounts.get(recipe.slug) ?? 0) * 12
        score -= (generatedBySlug.get(recipe.slug) ?? 0) * 20
        score -= (generatedByVariety.get(varietyKey) ?? 0) * 8

        if (best === null || score > best.score) {
          best = { slot, recipe, score }
        }
      }
    }

    if (best) {
      planned.push(best)
      generatedBySlug.set(best.recipe.slug, (generatedBySlug.get(best.recipe.slug) ?? 0) + 1)
      const varietyKey = getVarietyKey(best.recipe)
      generatedByVariety.set(varietyKey, (generatedByVariety.get(varietyKey) ?? 0) + 1)
    }
  }

  return planned
}